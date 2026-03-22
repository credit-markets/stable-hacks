import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { SOLANA_CONFIG } from '../blockchain/solana-config';
import { PaginatedResult } from '../common/dto/query-filter.dto';
import { OnChainPoolData } from './services/pool-onchain.service';
import {
  PoolCrudService,
  PoolWithResponsibilities,
} from './services/pool-crud.service';
import { PoolOnChainService } from './services/pool-onchain.service';
import { FilterDto } from '../common/dto/query-filter.dto';
import { QueryFilter } from '../common/types/query.types';
import { logError } from '../common/utils';
import { ExecutionEventService } from '../events/events.service';
import { RiskService } from '../risk/risk.service';
import { Database } from '../database/database.types';

type PoolRow = Database['public']['Tables']['pools']['Row'];

/** Pool row enhanced with on-chain data */
export type EnhancedPool = PoolRow & {
  onChainData?: OnChainPoolData;
};

@Injectable()
export class PoolsService implements OnModuleInit {
  private readonly logger = new Logger(PoolsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly poolCrudService: PoolCrudService,
    private readonly poolOnChainService: PoolOnChainService,
    private readonly events: ExecutionEventService,
    private readonly riskService: RiskService,
  ) {}

  async onModuleInit() {
    await this.verifyDatabaseConnection();
  }

  /**
   * Enhance a pool with on-chain data
   */
  private async enhancePoolWithData(
    pool: PoolRow | PoolWithResponsibilities,
    onChainData?: OnChainPoolData,
  ): Promise<EnhancedPool> {
    const enhancedPool: EnhancedPool = { ...pool };

    if (onChainData) {
      enhancedPool.onChainData = {
        ...onChainData,
        pricePerShare:
          pool.price_per_share != null
            ? Number(pool.price_per_share)
            : onChainData.pricePerShare,
      };
    }

    // Resolve manager display name from managers table (pool stores address only)
    if (pool.manager_address) {
      try {
        const client = this.supabase.getClient();
        const { data: manager } = await client
          .from('managers')
          .select('company_name')
          .eq('owner_address', pool.manager_address)
          .single();
        if (manager?.company_name) {
          (enhancedPool as Record<string, unknown>).manager_name =
            manager.company_name;
        }
      } catch {
        // Non-critical — keep existing manager_name
      }
    }

    // Compute cumulative borrowed and repaid from execution events
    try {
      const client = this.supabase.getClient();
      const { data: events } = await client
        .from('execution_events')
        .select('event_type, payload')
        .eq('target_id', pool.id)
        .in('event_type', ['pool.draw_down', 'pool.repayment']);

      let totalBorrowed = 0;
      let totalRepaid = 0;
      for (const e of events ?? []) {
        const amount = Number(
          (e.payload as Record<string, unknown>)?.amount ?? 0,
        );
        if (e.event_type === 'pool.draw_down') totalBorrowed += amount;
        else if (e.event_type === 'pool.repayment') totalRepaid += amount;
      }
      const extra = enhancedPool as Record<string, unknown>;
      extra.totalBorrowed = totalBorrowed.toString();
      extra.totalRepaid = totalRepaid.toString();
    } catch {
      // Non-critical — leave undefined
    }

    return enhancedPool;
  }

  /**
   * Enhance multiple pools with data in bulk (avoids N+1 queries).
   * Fetches all manager names and execution events in two queries total.
   */
  private async enhancePoolsWithDataBulk(
    pools: (PoolRow | PoolWithResponsibilities)[],
    onChainDataMap: Map<string, OnChainPoolData>,
  ): Promise<EnhancedPool[]> {
    const client = this.supabase.getClient();

    // 1. Bulk-fetch manager names
    const managerAddresses = [
      ...new Set(
        pools
          .map((p) => p.manager_address)
          .filter((addr): addr is string => !!addr),
      ),
    ];

    const managerNameMap = new Map<string, string>();
    if (managerAddresses.length > 0) {
      try {
        const { data: managers } = await client
          .from('managers')
          .select('owner_address, company_name')
          .in('owner_address', managerAddresses);
        for (const m of managers ?? []) {
          if (m.company_name) {
            managerNameMap.set(m.owner_address, m.company_name);
          }
        }
      } catch {
        // Non-critical — keep going without manager names
      }
    }

    // 2. Bulk-fetch execution events for borrowed/repaid totals
    const poolIds = pools.map((p) => p.id);
    const eventsByPool = new Map<
      string,
      { totalBorrowed: number; totalRepaid: number }
    >();
    if (poolIds.length > 0) {
      try {
        const { data: events } = await client
          .from('execution_events')
          .select('target_id, event_type, payload')
          .in('target_id', poolIds)
          .in('event_type', ['pool.draw_down', 'pool.repayment']);
        for (const e of events ?? []) {
          const amount = Number(
            (e.payload as Record<string, unknown>)?.amount ?? 0,
          );
          const existing = eventsByPool.get(e.target_id) ?? {
            totalBorrowed: 0,
            totalRepaid: 0,
          };
          if (e.event_type === 'pool.draw_down')
            existing.totalBorrowed += amount;
          else if (e.event_type === 'pool.repayment')
            existing.totalRepaid += amount;
          eventsByPool.set(e.target_id, existing);
        }
      } catch {
        // Non-critical — leave undefined
      }
    }

    // 3. Build enhanced pools from lookup maps
    return pools.map((pool) => {
      const onChainData = pool.on_chain_address
        ? onChainDataMap.get(pool.id)
        : undefined;

      const enhancedPool: EnhancedPool = { ...pool };

      if (onChainData) {
        enhancedPool.onChainData = {
          ...onChainData,
          pricePerShare:
            pool.price_per_share != null
              ? Number(pool.price_per_share)
              : onChainData.pricePerShare,
        };
      }

      const extra = enhancedPool as Record<string, unknown>;

      if (pool.manager_address) {
        const name = managerNameMap.get(pool.manager_address);
        if (name) extra.manager_name = name;
      }

      const totals = eventsByPool.get(pool.id);
      extra.totalBorrowed = (totals?.totalBorrowed ?? 0).toString();
      extra.totalRepaid = (totals?.totalRepaid ?? 0).toString();

      return enhancedPool;
    });
  }

  // ==================== DELEGATED CRUD OPERATIONS ====================

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = 'start_time',
    sortOrder: string = 'descending',
    filter: FilterDto = {},
  ): Promise<PaginatedResult<EnhancedPool>> {
    const result = await this.poolCrudService.findAll(
      page,
      pageSize,
      sortBy,
      sortOrder,
      filter,
    );

    const deployedPools = result.data.filter((pool) => pool.on_chain_address);
    const poolIds = deployedPools.map((pool) => pool.id);

    const onChainDataResult =
      await this.poolOnChainService.fetchMultiplePoolsOnChainData(poolIds);

    const onChainDataMap =
      onChainDataResult.status === 'success'
        ? onChainDataResult.data
        : new Map<string, OnChainPoolData>();

    if (onChainDataResult.status === 'error') {
      this.logger.warn(
        `Failed to fetch on-chain data for pools: ${onChainDataResult.error}`,
      );
    }

    const enhancedItems = await this.enhancePoolsWithDataBulk(
      result.data,
      onChainDataMap,
    );

    return new PaginatedResult<EnhancedPool>(
      enhancedItems,
      result.pagination.total,
      page,
      pageSize,
    );
  }

  async findOne(id: string): Promise<PoolWithResponsibilities | null> {
    return this.poolCrudService.findOne(id);
  }

  async findOneWithEnhancedData(id: string): Promise<EnhancedPool | null> {
    const pool = await this.findOne(id);
    if (!pool) {
      return null;
    }

    let onChainData: OnChainPoolData | undefined;
    if (pool.on_chain_address) {
      const result = await this.poolOnChainService.fetchPoolOnChainData(
        pool.id,
      );
      if (result.status === 'success') {
        onChainData = result.data;
      } else if (result.status === 'error') {
        this.logger.warn(
          `Failed to fetch on-chain data for pool ${pool.id}: ${result.error}`,
        );
      }
    }

    return this.enhancePoolWithData(pool, onChainData);
  }

  async findByAddress(
    address: string,
  ): Promise<PoolWithResponsibilities | null> {
    return this.poolCrudService.findByAddress(address);
  }

  async findByAddressWithEnhancedData(
    address: string,
  ): Promise<EnhancedPool | null> {
    const pool = await this.findByAddress(address);
    if (!pool) {
      return null;
    }

    const fetchResult = await this.poolOnChainService.fetchPoolOnChainData(
      pool.id,
    );

    let onChainData: OnChainPoolData | undefined;
    if (fetchResult.status === 'success') {
      onChainData = fetchResult.data;
    } else if (fetchResult.status === 'error') {
      this.logger.warn(
        `Failed to fetch on-chain data for pool ${pool.id}: ${fetchResult.error}`,
      );
    }

    return this.enhancePoolWithData(pool, onChainData);
  }

  async update(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<PoolRow | null> {
    return this.poolCrudService.update(id, updateData);
  }

  async remove(id: string): Promise<PoolRow | null> {
    return this.poolCrudService.remove(id);
  }

  async findPoolsByAddress(
    address: string,
    type: 'manager' | 'both' = 'both',
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = 'start_time',
    sortOrder: string = 'descending',
    additionalFilter: QueryFilter = {},
  ): Promise<PaginatedResult<EnhancedPool>> {
    const result = await this.poolCrudService.findPoolsByAddress(
      address,
      type,
      page,
      pageSize,
      sortBy,
      sortOrder,
      additionalFilter,
    );

    const deployedPools = result.data.filter((pool) => pool.on_chain_address);
    const poolIds = deployedPools.map((pool) => pool.id);

    const onChainDataResult =
      await this.poolOnChainService.fetchMultiplePoolsOnChainData(poolIds);

    const onChainDataMap =
      onChainDataResult.status === 'success'
        ? onChainDataResult.data
        : new Map<string, OnChainPoolData>();

    if (onChainDataResult.status === 'error') {
      this.logger.warn(
        `Failed to fetch on-chain data for pools: ${onChainDataResult.error}`,
      );
    }

    const enhancedItems = await this.enhancePoolsWithDataBulk(
      result.data,
      onChainDataMap,
    );

    return new PaginatedResult<EnhancedPool>(
      enhancedItems,
      result.pagination.total,
      page,
      pageSize,
    );
  }

  /**
   * Get pool ID by blockchain address
   */
  async getPoolIdByAddress(address: string): Promise<string | null> {
    const pool = await this.findByAddress(address);
    if (!pool) {
      return null;
    }

    return pool.id || null;
  }

  // ==================== PIPELINE KEYS ====================

  async findAvailablePipelineKeys() {
    return this.poolCrudService.findAvailablePipelineKeys();
  }

  // ==================== ADMIN POOLS LIST ====================

  async findAllAdminWithOnChain(filters?: {
    pool_type?: string;
    deployed?: boolean;
  }) {
    const pools = await this.poolCrudService.findAllAdmin(filters);

    const deployedPoolIds = pools
      .filter((p) => p.on_chain_address)
      .map((p) => p.id);
    const onChainDataResult =
      deployedPoolIds.length > 0
        ? await this.poolOnChainService.fetchMultiplePoolsOnChainData(
            deployedPoolIds,
          )
        : {
            status: 'success' as const,
            data: new Map<string, OnChainPoolData>(),
          };

    const onChainMap =
      onChainDataResult.status === 'success'
        ? onChainDataResult.data
        : new Map<string, OnChainPoolData>();

    return pools.map((p) => {
      const ocd = onChainMap.get(p.id);
      return {
        ...p,
        onChainData: ocd
          ? {
              manager: ocd.manager,
              shareMint: ocd.sharesMint,
              depositVault: ocd.depositVault,
              depositMint: ocd.assetMint,
              navOracle: ocd.navOracle,
              attester: ocd.attester,
              investmentWindowOpen: ocd.investmentWindowOpen,
              totalAssets: ocd.totalAssets,
              totalShares: ocd.totalShares,
              pricePerShare: p.price_per_share ?? ocd.pricePerShare,
              minimumInvestment: ocd.minimumInvestment,
            }
          : null,
      };
    });
  }

  // ==================== FIDC ACTIVATION ====================

  /**
   * Activate a FIDC on the marketplace by CNPJ.
   * Validates pipeline data exists before activation (defense in depth).
   */
  async activateFromPipelineKey(
    dto: {
      pipeline_key: string;
      title?: string;
      minimum_investment?: number;
      fund_size?: number;
      investment_window_open?: boolean;
      manager_address?: string;
      attester_address?: string;
      asset_mint: string;
    },
    adminAddress: string,
  ): Promise<PoolRow> {
    // Validate pipeline data exists by checking if a risk score is available
    try {
      await this.riskService.getScore(dto.pipeline_key);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new BadRequestException(
          `No risk data found for ${dto.pipeline_key}. Cannot activate without risk score.`,
        );
      }
      throw err;
    }

    // Use backend ATTESTER env var — frontend should not dictate the attester
    const attesterAddress = this.configService.getOrThrow<string>('ATTESTER');
    const pool = await this.poolCrudService.activateFromPipelineKey({
      ...dto,
      attester_address: attesterAddress || dto.attester_address,
    });

    await this.events.emit({
      event_type: 'pool.activated',
      correlation_id: pool.id,
      actor_id: adminAddress,
      actor_type: 'admin',
      target_type: 'pool',
      target_id: pool.id,
      payload: {
        pipeline_key: dto.pipeline_key,
        activation_source: 'pipeline',
      },
    });

    return pool;
  }

  // ==================== REDEMPTION ADMIN ====================

  async getRedemptionRequests(
    poolId?: string,
  ): Promise<Record<string, unknown>[]> {
    try {
      const requests = await this.events.findByEventType(
        'withdrawal.requested',
        poolId,
      );
      if (requests.length === 0) return [];

      // Filter out requests that already have settled/cancelled/rejected events
      const requestIds = requests.map((r) => r.correlation_id);

      const resolutions = await this.events.findResolutionsByCorrelationIds(
        requestIds,
        ['withdrawal.settled', 'withdrawal.cancelled', 'withdrawal.rejected'],
      );

      const resolvedIds = new Set(resolutions.map((r) => r.correlation_id));
      return requests.filter((r) => !resolvedIds.has(r.correlation_id));
    } catch (error) {
      logError(this.logger, 'Failed to fetch redemption requests', error);
      throw error;
    }
  }

  // ==================== VISIBILITY ====================

  async updateVisibility(poolId: string, isVisible: boolean): Promise<void> {
    const client = this.supabase.getClient();
    const { error } = await client
      .from('pools')
      .update({ is_visible: isVisible })
      .eq('id', poolId);
    if (error) {
      logError(this.logger, 'Failed to update pool visibility', error);
      throw new InternalServerErrorException(
        'Failed to update pool visibility',
      );
    }
  }

  // ==================== POOL TRANSACTION HISTORY ====================

  async getPoolTransactions(
    poolId: string,
    page: number,
    size: number,
    typeFilter?: string,
  ) {
    const client = this.supabase.getClient();
    const offset = (page - 1) * size;

    // Determine which event types to include
    let eventTypes: string[];
    switch (typeFilter) {
      case 'investment':
        eventTypes = [
          'investment.requested',
          'investment.settled',
          'investment.claimed',
          'investment.rejected',
          'investment.cancelled',
        ];
        break;
      case 'withdrawal':
        eventTypes = [
          'withdrawal.requested',
          'withdrawal.settled',
          'withdrawal.claimed',
          'withdrawal.cancelled',
        ];
        break;
      case 'pool':
        eventTypes = [
          'pool.draw_down',
          'pool.repayment',
          'pool.investment_window_opened',
          'pool.investment_window_closed',
          'pool.paused',
          'pool.unpaused',
        ];
        break;
      default:
        eventTypes = [
          'investment.requested',
          'investment.settled',
          'investment.claimed',
          'investment.rejected',
          'investment.cancelled',
          'withdrawal.requested',
          'withdrawal.settled',
          'withdrawal.claimed',
          'withdrawal.cancelled',
          'pool.draw_down',
          'pool.repayment',
          'pool.investment_window_opened',
          'pool.investment_window_closed',
        ];
    }

    const { count, error: countError } = await client
      .from('execution_events')
      .select('id', { count: 'exact', head: true })
      .eq('target_id', poolId)
      .in('event_type', eventTypes);

    if (countError) {
      throw new InternalServerErrorException(
        'Failed to count pool transactions',
      );
    }

    const { data: events, error } = await client
      .from('execution_events')
      .select(
        'id, event_type, actor_id, payload, chain_tx_id, created_at, correlation_id',
      )
      .eq('target_id', poolId)
      .in('event_type', eventTypes)
      .order('created_at', { ascending: false })
      .range(offset, offset + size - 1);

    if (error) {
      throw new InternalServerErrorException(
        'Failed to fetch pool transactions',
      );
    }

    // Fetch pool details for token decimals
    const { data: pool } = await client
      .from('pools')
      .select('asset_mint')
      .eq('id', poolId)
      .single();

    const { getTokenMeta } = await import('../blockchain/solana-config');
    const token = getTokenMeta(pool?.asset_mint ?? '');

    // Backfill amounts: approve/claim events don't carry amount in payload,
    // so look up the .requested event for the same correlation_id
    const corrIds = [
      ...new Set(
        (events ?? [])
          .filter(
            (e) =>
              !(e.payload as Record<string, unknown> | null)?.amount &&
              e.correlation_id,
          )
          .map((e) => e.correlation_id),
      ),
    ];

    const amountByCorrId = new Map<string, number>();
    if (corrIds.length > 0) {
      const { data: reqEvents } = await client
        .from('execution_events')
        .select('correlation_id, payload')
        .in('correlation_id', corrIds)
        .in('event_type', ['investment.requested', 'withdrawal.requested']);
      for (const req of reqEvents ?? []) {
        const p = req.payload as Record<string, unknown> | null;
        if (p?.amount != null) {
          amountByCorrId.set(req.correlation_id, Number(p.amount));
        }
      }
    }

    const data = (events ?? []).map((e) => {
      const payload = e.payload as Record<string, unknown> | null;
      let rawAmount = payload?.amount != null ? Number(payload.amount) : null;
      const rawShares = payload?.shares != null ? Number(payload.shares) : null;

      // Backfill from .requested event if this event has no amount
      if (rawAmount == null && e.correlation_id) {
        rawAmount = amountByCorrId.get(e.correlation_id) ?? null;
      }

      return {
        id: e.id,
        eventType: e.event_type,
        actor: e.actor_id,
        tokenSymbol: token.symbol,
        amount: rawAmount != null ? rawAmount / 10 ** token.decimals : null,
        shares:
          rawShares != null
            ? rawShares / 10 ** SOLANA_CONFIG.SHARE_DECIMALS
            : null,
        chainTxId: e.chain_tx_id,
        createdAt: e.created_at,
      };
    });

    return { data, total: count ?? 0, page, size };
  }

  // ==================== NAV HISTORY ====================

  async getNavHistory(
    poolId: string,
    options?: { from?: string; to?: string; limit?: number },
  ) {
    const client = this.supabase.getClient();
    const queryLimit = options?.limit ?? 1000;
    const now = new Date();
    const from = options?.from ?? new Date(0).toISOString(); // Default: all time
    const to = options?.to ?? now.toISOString();

    const { data, error } = await client
      .from('nav_price_history')
      .select('price, recorded_at')
      .eq('pool_id', poolId)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('recorded_at', { ascending: true })
      .limit(queryLimit);

    if (error) {
      logError(this.logger, 'Failed to fetch nav history', error, { poolId });
      throw error;
    }

    // Convert raw oracle prices (u64 with ORACLE_PRICE_DECIMALS) to human-readable
    const divisor = 10 ** SOLANA_CONFIG.ORACLE_PRICE_DECIMALS;
    return (data ?? []).map((row) => ({
      ...row,
      price: row.price / divisor,
    }));
  }

  // ==================== DATABASE UTILITIES ====================

  private async verifyDatabaseConnection(): Promise<void> {
    try {
      const { count, error } = await this.supabase
        .getClient()
        .from('pools')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      this.logger.log(
        `Database connection verified. Found ${count} pools in table 'pools'`,
      );
    } catch (error) {
      logError(this.logger, 'Failed to verify database connection', error);
      throw error;
    }
  }
}
