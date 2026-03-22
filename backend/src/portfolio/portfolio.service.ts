import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { getErrorMessage, logError } from '../common/utils';
import { PortfolioSummaryDto } from './dto/portfolio-summary.dto';
import { PortfolioTransactionDto } from './dto/portfolio-transaction.dto';
import { SOLANA_CONFIG, getTokenMeta } from '../blockchain/solana-config';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Get pre-computed portfolio analytics from execution_events + risk scores.
   * Uses batch queries (no N+1) to build headline metrics, positions, and allocation.
   */
  async getSummary(walletAddress: string): Promise<PortfolioSummaryDto> {
    try {
      const client = this.supabase.getClient();

      // 1. Find correlation IDs where this investor requested a deposit
      const { data: investorRequests, error: reqError } = await client
        .from('execution_events')
        .select('correlation_id')
        .eq('actor_id', walletAddress)
        .eq('event_type', 'investment.requested');

      if (reqError) {
        logError(
          this.logger,
          'Failed to fetch investor request events',
          reqError,
          { walletAddress },
        );
        throw new InternalServerErrorException(
          'Failed to fetch investment data',
        );
      }

      // 2. Check which of these have been settled (approved on-chain)
      const corrIds = [
        ...new Set((investorRequests ?? []).map((e) => e.correlation_id)),
      ];

      if (corrIds.length === 0) {
        return {
          totalInvested: 0,
          currentValue: 0,
          unrealizedPnl: 0,
          weightedAvgReturn: 0,
          weightedCreditScore: null,
          positions: [],
          allocation: [],
        };
      }

      // Only count fully claimed deposits as positions
      // (settled = approved but PDA still open, claimed = PDA closed, shares received)
      const { data: claimedEvents } = await client
        .from('execution_events')
        .select('correlation_id')
        .in('correlation_id', corrIds)
        .eq('event_type', 'investment.claimed');

      const settledCorrIds = new Set(
        (claimedEvents ?? []).map((e) => e.correlation_id),
      );

      // 3. Get the .requested events for settled deposits (they carry amount + shares)
      const { data: investments, error: investError } = settledCorrIds.size
        ? await client
            .from('execution_events')
            .select('target_id, payload, correlation_id')
            .in('correlation_id', [...settledCorrIds])
            .eq('event_type', 'investment.requested')
        : { data: [], error: null };

      if (investError) {
        logError(
          this.logger,
          'Failed to fetch investment events',
          investError,
          { walletAddress },
        );
        throw new InternalServerErrorException(
          'Failed to fetch investment data',
        );
      }

      // Empty portfolio — return zeroed response
      if (!investments || investments.length === 0) {
        return {
          totalInvested: 0,
          currentValue: 0,
          unrealizedPnl: 0,
          weightedAvgReturn: 0,
          weightedCreditScore: null,
          positions: [],
          allocation: [],
        };
      }

      // Deduplicate by correlation_id (webhook retries may create duplicates)
      const seenCorrelations = new Set<string>();
      const uniqueInvestments = (investments ?? []).filter((inv) => {
        const cid = (inv as Record<string, unknown>).correlation_id as string;
        if (seenCorrelations.has(cid)) return false;
        seenCorrelations.add(cid);
        return true;
      });

      // Aggregate invested amounts per pool
      const poolInvestments = new Map<
        string,
        { invested: number; shares: number }
      >();
      for (const inv of uniqueInvestments) {
        const poolId = inv.target_id;
        const payload = inv.payload as Record<string, unknown>;
        const amount = Number(payload?.amount ?? 0);
        const shares = Number(payload?.shares ?? 0);
        const existing = poolInvestments.get(poolId) ?? {
          invested: 0,
          shares: 0,
        };
        existing.invested += amount;
        existing.shares += shares;
        poolInvestments.set(poolId, existing);
      }

      const poolIds = [...poolInvestments.keys()];

      // 2. Batch-fetch all pool details
      const { data: pools, error: poolError } = await client
        .from('pools')
        .select(
          'id, title, pipeline_key, pool_type, asset_class, price_per_share, logo_path, currency, asset_mint',
        )
        .in('id', poolIds);

      if (poolError) {
        logError(this.logger, 'Failed to fetch pools for summary', poolError, {
          walletAddress,
        });
        throw new InternalServerErrorException('Failed to fetch pool data');
      }

      const poolMap = new Map((pools ?? []).map((p) => [p.id, p]));

      // 3. Batch-fetch risk scores by pool_type
      const fidcKeys: string[] = [];
      const tidcKeys: string[] = [];
      for (const pool of pools ?? []) {
        if (!pool.pipeline_key) continue;
        if (pool.pool_type === 'fidc') fidcKeys.push(pool.pipeline_key);
        else if (pool.pool_type === 'tidc') tidcKeys.push(pool.pipeline_key);
      }

      const fidcScoreMap = new Map<
        string,
        {
          score_risco: number;
          confidence_tier: number;
          mean_rentab: number | null;
        }
      >();
      const tidcScoreMap = new Map<
        string,
        {
          score_risco: number;
          confidence_tier: number;
          effective_yield: number | null;
        }
      >();

      if (fidcKeys.length > 0) {
        const { data: fidcScores, error: fidcError } = await client
          .from('risk_fidc_scores')
          .select('pipeline_key, score_risco, confidence_tier, mean_rentab')
          .in('pipeline_key', fidcKeys);
        if (fidcError) {
          logError(
            this.logger,
            'Non-critical: failed to fetch FIDC risk scores',
            fidcError,
            { walletAddress },
          );
        }
        for (const s of fidcScores ?? []) {
          fidcScoreMap.set(s.pipeline_key, s);
        }
      }

      if (tidcKeys.length > 0) {
        const { data: tidcScores, error: tidcError } = await client
          .from('risk_tidc_scores')
          .select('pipeline_key, score_risco, confidence_tier, effective_yield')
          .in('pipeline_key', tidcKeys);
        if (tidcError) {
          logError(
            this.logger,
            'Non-critical: failed to fetch TIDC risk scores',
            tidcError,
            { walletAddress },
          );
        }
        for (const s of tidcScores ?? []) {
          tidcScoreMap.set(s.pipeline_key, s);
        }
      }

      // 4. Build positions and compute headline metrics
      let totalInvested = 0;
      let currentValue = 0;
      let weightedReturnSum = 0;
      let weightedScoreSum = 0;
      let weightedScoreDenom = 0;

      const allocationMap = new Map<string, { amount: number }>();

      const positions: PortfolioSummaryDto['positions'] = [];

      for (const [poolId, inv] of poolInvestments.entries()) {
        const pool = poolMap.get(poolId);
        if (!pool) continue;

        // Normalize raw on-chain amounts to human-readable using token decimals
        const token = getTokenMeta(pool.asset_mint ?? '');
        const invested = inv.invested / 10 ** token.decimals;
        const shares = inv.shares / 10 ** SOLANA_CONFIG.SHARE_DECIMALS;

        const pricePerShare = pool.price_per_share ?? null;
        const positionValue =
          shares > 0 && pricePerShare != null
            ? shares * pricePerShare
            : invested;

        totalInvested += invested;
        currentValue += positionValue;

        // Risk data
        let ltmReturn: number | null = null;
        let creditScore: number | null = null;
        let ratingTier: number | null = null;

        if (pool.pool_type === 'fidc' && pool.pipeline_key) {
          const risk = fidcScoreMap.get(pool.pipeline_key);
          if (risk) {
            ltmReturn = risk.mean_rentab != null ? risk.mean_rentab * 12 : null;
            creditScore = risk.score_risco * 100;
            ratingTier = risk.confidence_tier;
          }
        } else if (pool.pool_type === 'tidc' && pool.pipeline_key) {
          const risk = tidcScoreMap.get(pool.pipeline_key);
          if (risk) {
            ltmReturn = risk.effective_yield ?? null;
            creditScore = risk.score_risco * 100;
            ratingTier = risk.confidence_tier;
          }
        }

        if (ltmReturn != null && invested > 0) {
          weightedReturnSum += ltmReturn * invested;
        }

        if (creditScore != null && invested > 0) {
          weightedScoreSum += creditScore * invested;
          weightedScoreDenom += invested;
        }

        const assetClass = pool.asset_class ?? 'unknown';
        const existing = allocationMap.get(assetClass) ?? { amount: 0 };
        existing.amount += invested;
        allocationMap.set(assetClass, existing);

        positions.push({
          poolId,
          poolTitle: pool.title ?? '',
          logoPath: pool.logo_path ?? null,
          pipelineKey: pool.pipeline_key ?? '',
          assetClass,
          poolType: pool.pool_type ?? '',
          invested,
          pricePerShare,
          currentValue: positionValue,
          share: 0, // computed below
          ltmReturn,
          creditScore,
          ratingTier,
          depositCurrency: pool.currency ?? 'usdc',
        });
      }

      // Compute share percentages
      for (const pos of positions) {
        pos.share =
          totalInvested > 0 ? (pos.invested / totalInvested) * 100 : 0;
      }

      const weightedAvgReturn =
        totalInvested > 0 ? weightedReturnSum / totalInvested : 0;
      const weightedCreditScore =
        weightedScoreDenom > 0 ? weightedScoreSum / weightedScoreDenom : null;

      // Build allocation array
      const allocation = [...allocationMap.entries()].map(
        ([assetClass, { amount }]) => ({
          assetClass,
          percentage: totalInvested > 0 ? (amount / totalInvested) * 100 : 0,
          amount,
        }),
      );

      return {
        totalInvested,
        currentValue,
        unrealizedPnl: currentValue - totalInvested,
        weightedAvgReturn,
        weightedCreditScore,
        positions,
        allocation,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      logError(this.logger, 'Error computing portfolio summary', error, {
        walletAddress,
      });
      throw new InternalServerErrorException(
        `Failed to compute portfolio summary: ${getErrorMessage(error)}`,
      );
    }
  }

  async getTransactions(
    walletAddress: string,
    page: number,
    size: number,
  ): Promise<{ data: PortfolioTransactionDto[]; total: number }> {
    const client = this.supabase.getClient();
    const offset = (page - 1) * size;

    const ALL_LIFECYCLE_EVENTS = [
      'investment.requested',
      'investment.settled',
      'investment.claimed',
      'investment.rejected',
      'investment.cancelled',
      'withdrawal.requested',
      'withdrawal.settled',
      'withdrawal.claimed',
      'withdrawal.cancelled',
    ];

    // Find correlation IDs where this investor initiated requests
    const { data: investorReqs } = await client
      .from('execution_events')
      .select('correlation_id')
      .eq('actor_id', walletAddress)
      .in('event_type', ['investment.requested', 'withdrawal.requested']);

    const corrIds = [
      ...new Set((investorReqs ?? []).map((e) => e.correlation_id)),
    ];

    if (corrIds.length === 0) {
      return { data: [], total: 0 };
    }

    // Count all lifecycle events for pagination
    const { count, error: countError } = await client
      .from('execution_events')
      .select('id', { count: 'exact', head: true })
      .in('correlation_id', corrIds)
      .in('event_type', ALL_LIFECYCLE_EVENTS);

    if (countError) {
      logError(this.logger, 'Failed to count transactions', countError, {
        walletAddress,
      });
      throw new InternalServerErrorException('Failed to count transactions');
    }

    // Get page of lifecycle events
    const { data: events, error: eventsError } = await client
      .from('execution_events')
      .select(
        'id, event_type, target_id, payload, chain_tx_id, created_at, correlation_id',
      )
      .in('correlation_id', corrIds)
      .in('event_type', ALL_LIFECYCLE_EVENTS)
      .order('created_at', { ascending: false })
      .range(offset, offset + size - 1);

    if (eventsError) {
      logError(this.logger, 'Failed to fetch transactions', eventsError, {
        walletAddress,
      });
      throw new InternalServerErrorException('Failed to fetch transactions');
    }

    if (!events?.length) {
      return { data: [], total: count ?? 0 };
    }

    // Deduplicate by (correlation_id, event_type) pair
    const seen = new Set<string>();
    const deduped = events.filter((e) => {
      const key = `${e.correlation_id}:${e.event_type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Batch-fetch pool details including asset_mint for decimal division
    const poolIds = [...new Set(deduped.map((e) => e.target_id))];
    const { data: pools } = await client
      .from('pools')
      .select('id, title, asset_mint')
      .in('id', poolIds);
    const poolMap = new Map(
      (pools ?? []).map((p) => [
        p.id,
        { title: p.title, assetMint: p.asset_mint },
      ]),
    );

    // Build a map of correlation_id → amount/shares from .requested events
    // (settled/claimed events often don't carry amount in their payload)
    const requestAmounts = new Map<
      string,
      { amount: number | null; shares: number | null }
    >();
    for (const e of deduped) {
      if (
        e.event_type === 'investment.requested' ||
        e.event_type === 'withdrawal.requested'
      ) {
        const p = e.payload as Record<string, unknown> | null;
        const pool = poolMap.get(e.target_id);
        const token = getTokenMeta(pool?.assetMint ?? '');
        requestAmounts.set(e.correlation_id, {
          amount:
            p?.amount != null ? Number(p.amount) / 10 ** token.decimals : null,
          shares:
            p?.shares != null
              ? Number(p.shares) / 10 ** SOLANA_CONFIG.SHARE_DECIMALS
              : null,
        });
      }
    }

    // If .requested events weren't in this page, fetch them for backfill
    const missingCorrIds = [
      ...new Set(
        deduped
          .filter((e) => !requestAmounts.has(e.correlation_id))
          .map((e) => e.correlation_id),
      ),
    ];
    if (missingCorrIds.length > 0) {
      const { data: reqEvents } = await client
        .from('execution_events')
        .select('correlation_id, target_id, payload')
        .in('correlation_id', missingCorrIds)
        .in('event_type', ['investment.requested', 'withdrawal.requested']);
      for (const re of reqEvents ?? []) {
        const p = re.payload as Record<string, unknown> | null;
        const pool = poolMap.get(re.target_id);
        const token = getTokenMeta(pool?.assetMint ?? '');
        if (!requestAmounts.has(re.correlation_id)) {
          requestAmounts.set(re.correlation_id, {
            amount:
              p?.amount != null
                ? Number(p.amount) / 10 ** token.decimals
                : null,
            shares:
              p?.shares != null
                ? Number(p.shares) / 10 ** SOLANA_CONFIG.SHARE_DECIMALS
                : null,
          });
        }
      }
    }

    const data = deduped.map((e) => {
      const pool = poolMap.get(e.target_id);
      const token = getTokenMeta(pool?.assetMint ?? '');
      const payload = e.payload as Record<string, unknown> | null;
      const reqAmounts = requestAmounts.get(e.correlation_id);

      // Use this event's payload first, fall back to .requested event's amounts
      const amount =
        payload?.amount != null
          ? Number(payload.amount) / 10 ** token.decimals
          : (reqAmounts?.amount ?? null);
      const shares =
        payload?.shares != null
          ? Number(payload.shares) / 10 ** SOLANA_CONFIG.SHARE_DECIMALS
          : (reqAmounts?.shares ?? null);

      return {
        id: e.id,
        eventType: e.event_type,
        poolId: e.target_id,
        poolTitle: pool?.title ?? '',
        tokenSymbol: token.symbol,
        amount,
        shares,
        chainTxId: e.chain_tx_id,
        createdAt: e.created_at,
      };
    });

    return { data, total: count ?? 0 };
  }

  async getMyInvestmentRequests(walletAddress: string) {
    const client = this.supabase.getClient();
    // Step 1: Find correlation IDs where this investor initiated a request
    const { data: investorEvents, error: step1Error } = await client
      .from('execution_events')
      .select('correlation_id')
      .eq('actor_id', walletAddress)
      .eq('event_type', 'investment.requested');

    if (step1Error) {
      logError(this.logger, 'Failed to fetch investment requests', step1Error, {
        walletAddress,
      });
      throw new InternalServerErrorException(
        'Failed to fetch investment requests',
      );
    }

    if (!investorEvents?.length) return [];

    const correlationIds = [
      ...new Set(investorEvents.map((e) => e.correlation_id)),
    ];

    // Step 2: Get ALL events for those correlation IDs (includes manager actions)
    const { data: events, error } = await client
      .from('execution_events')
      .select('correlation_id, target_id, payload, created_at, event_type')
      .in('correlation_id', correlationIds)
      .in('event_type', [
        'investment.requested',
        'investment.settled',
        'investment.claimed',
        'investment.rejected',
        'investment.cancelled',
      ])
      .order('created_at', { ascending: false });

    if (error) {
      logError(this.logger, 'Failed to fetch investment events', error, {
        walletAddress,
      });
      throw new InternalServerErrorException(
        'Failed to fetch investment requests',
      );
    }

    if (!events?.length) return [];

    // Group by correlation_id — latest event determines status,
    // but amount comes from the .requested event (settled/approved events may not carry it)
    const requestMap = new Map<
      string,
      {
        correlationId: string;
        poolId: string;
        amount: number;
        latestEvent: string;
        createdAt: string;
      }
    >();
    for (const event of events) {
      const payload = event.payload as Record<string, unknown> | null;
      const amount = (payload?.amount as number) || 0;
      const existing = requestMap.get(event.correlation_id);
      if (!existing) {
        requestMap.set(event.correlation_id, {
          correlationId: event.correlation_id,
          poolId: event.target_id,
          amount,
          latestEvent: event.event_type,
          createdAt: event.created_at,
        });
      } else if (amount > 0 && existing.amount === 0) {
        // Backfill amount from an older event (e.g., .requested has amount but .settled doesn't)
        existing.amount = amount;
      }
    }

    // Filter to actionable: pending (awaiting manager) or settled (awaiting investor claim)
    const pending = Array.from(requestMap.values()).filter(
      (r) =>
        r.latestEvent === 'investment.requested' ||
        r.latestEvent === 'investment.settled',
    );

    // Batch-fetch pool titles and asset mints
    if (pending.length === 0) return [];
    const poolIds = [...new Set(pending.map((r) => r.poolId))];
    const { data: pools } = await client
      .from('pools')
      .select('id, title, asset_mint')
      .in('id', poolIds);
    const poolMap = new Map(
      (pools ?? []).map((p) => [
        p.id,
        { title: p.title, assetMint: p.asset_mint },
      ]),
    );

    return pending.map((r) => {
      const pool = poolMap.get(r.poolId);
      const token = getTokenMeta(pool?.assetMint ?? '');
      return {
        ...r,
        // Convert raw on-chain amount to human-readable using the pool's token decimals
        amount: r.amount / 10 ** token.decimals,
        poolTitle: pool?.title ?? '',
        tokenSymbol: token.symbol,
      };
    });
  }

  async getMyRedemptionRequests(walletAddress: string) {
    const client = this.supabase.getClient();

    // Step 1: Find correlation IDs where this investor initiated a redemption
    const { data: investorEvents, error: step1Error } = await client
      .from('execution_events')
      .select('correlation_id')
      .eq('actor_id', walletAddress)
      .eq('event_type', 'withdrawal.requested');

    if (step1Error) {
      logError(this.logger, 'Failed to fetch redemption requests', step1Error, {
        walletAddress,
      });
      throw new InternalServerErrorException(
        'Failed to fetch redemption requests',
      );
    }

    if (!investorEvents?.length) return [];

    const correlationIds = [
      ...new Set(investorEvents.map((e) => e.correlation_id)),
    ];

    // Step 2: Get ALL events for those correlation IDs (includes manager actions)
    const { data: events, error } = await client
      .from('execution_events')
      .select('correlation_id, target_id, payload, created_at, event_type')
      .in('correlation_id', correlationIds)
      .in('event_type', [
        'withdrawal.requested',
        'withdrawal.settled',
        'withdrawal.claimed',
        'withdrawal.cancelled',
      ])
      .order('created_at', { ascending: false });

    if (error) {
      logError(this.logger, 'Failed to fetch redemption requests', error, {
        walletAddress,
      });
      throw new InternalServerErrorException(
        'Failed to fetch redemption requests',
      );
    }

    if (!events?.length) return [];

    const requestMap = new Map<
      string,
      {
        correlationId: string;
        poolId: string;
        shares: number;
        latestEvent: string;
        createdAt: string;
      }
    >();
    for (const event of events) {
      const payload = event.payload as Record<string, unknown> | null;
      const shares = (payload?.shares as number) || 0;
      const existing = requestMap.get(event.correlation_id);
      if (!existing) {
        requestMap.set(event.correlation_id, {
          correlationId: event.correlation_id,
          poolId: event.target_id,
          shares,
          latestEvent: event.event_type,
          createdAt: event.created_at,
        });
      } else if (shares > 0 && existing.shares === 0) {
        existing.shares = shares;
      }
    }

    const actionable = Array.from(requestMap.values()).filter(
      (r) =>
        r.latestEvent === 'withdrawal.requested' ||
        r.latestEvent === 'withdrawal.settled',
    );

    if (actionable.length === 0) return [];
    const poolIds = [...new Set(actionable.map((r) => r.poolId))];
    const { data: pools } = await client
      .from('pools')
      .select('id, title, asset_mint')
      .in('id', poolIds);
    const poolMap = new Map(
      (pools ?? []).map((p) => [
        p.id,
        { title: p.title, assetMint: p.asset_mint },
      ]),
    );

    return actionable.map((r) => {
      const pool = poolMap.get(r.poolId);
      const token = getTokenMeta(pool?.assetMint ?? '');
      return {
        ...r,
        shares: r.shares / 10 ** SOLANA_CONFIG.SHARE_DECIMALS,
        poolTitle: pool?.title ?? '',
        tokenSymbol: token.symbol,
      };
    });
  }
}
