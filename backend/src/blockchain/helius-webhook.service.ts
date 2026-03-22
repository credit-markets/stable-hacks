import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import {
  ExecutionEventService,
  ExecutionEvent,
} from '../events/events.service';
import { SupabaseService } from '../database/supabase.service';
import { SolanaService } from './solana.service';
import { AttesterGuard } from '../auth/guards/attester.guard';
import { logError } from '../common/utils/error.util';
// import { Database } from '../database/database.types';
import { utils } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { SOLANA_CONFIG } from './solana-config';
import { PoolOnChainService } from '../pools/services/pool-onchain.service';

/**
 * Build a map from Anchor 8-byte discriminator (hex) to instruction name.
 * Anchor discriminator = first 8 bytes of sha256("global:<instruction_name>").
 */
function anchorDiscriminator(name: string): string {
  return createHash('sha256')
    .update(`global:${name}`)
    .digest()
    .subarray(0, 8)
    .toString('hex');
}

/**
 * The on-chain program uses Anchor < 0.30, which computes discriminators
 * from snake_case names: sha256("global:initialize_pool").
 * Our event map uses camelCase names, so we build the discriminator from
 * snake_case but map it to the camelCase name used in INSTRUCTION_TO_EVENT.
 */
const SNAKE_TO_CAMEL: Record<string, string> = {
  initialize_pool: 'initializePool',
  open_investment_window: 'openInvestmentWindow',
  close_investment_window: 'closeInvestmentWindow',
  request_deposit: 'requestDeposit',
  approve_deposit: 'approveDeposit',
  claim_deposit: 'claimDeposit',
  reject_deposit: 'rejectDeposit',
  cancel_deposit: 'cancelDeposit',
  request_redeem: 'requestRedeem',
  approve_redeem: 'approveRedeem',
  claim_redeem: 'claimRedeem',
  cancel_redeem: 'cancelRedeem',
  draw_down: 'drawDown',
  repay: 'repay',
  freeze_account: 'freezeAccount',
  unfreeze_account: 'unfreezeAccount',
  pause: 'pause',
  unpause: 'unpause',
  set_manager: 'setManager',
  transfer_authority: 'transferAuthority',
  update_attester: 'updateAttester',
  create_attestation: 'createAttestation',
  revoke_attestation: 'revokeAttestation',
  set_price: 'setPrice',
};

const DISCRIMINATOR_TO_NAME: Record<string, string> = {};
for (const [snakeName, camelName] of Object.entries(SNAKE_TO_CAMEL)) {
  DISCRIMINATOR_TO_NAME[anchorDiscriminator(snakeName)] = camelName;
}

// Type aliases available if needed for typed webhook payloads:
// type RiskTidcScoreRow = Database['public']['Tables']['risk_tidc_scores']['Row'];
// type RiskFidcScoreRow = Database['public']['Tables']['risk_fidc_scores']['Row'];

/**
 * Shape of a Helius enhanced transaction delivered via webhook.
 */
export interface HeliusTransaction {
  signature: string;
  timestamp: number;
  instructions?: HeliusInstruction[];
  transactionError?: unknown;
  meta?: { err?: unknown };
}

/**
 * Shape of a single parsed instruction inside a Helius transaction.
 * Updated for SVS-11 CreditVault program.
 */
interface HeliusInstruction {
  data?: {
    name?: string;
    args?: {
      vaultId?: string;
      amount?: string;
      shares?: string;
      pricePerShare?: string;
      reasonCode?: string;
      newManager?: string;
      newAuthority?: string;
      newAttester?: string;
      newAttestationProgram?: string;
      // Mock Oracle
      price?: string;
      timestamp?: number;
      // Mock SAS
      issuer?: string;
      attestationType?: number;
      countryCode?: number[];
      expiresAt?: string;
    };
  };
  parsed?: { type?: string };
  accounts?: string[];
  programId?: string;
}

/**
 * Payload extracted from a Helius instruction for event processing.
 * Updated for SVS-11: vault_id replaces pool_id for on-chain identity.
 */
interface InstructionPayload {
  pool_id: string | undefined;
  vault_id: string | undefined;
  amount: string | undefined;
  shares: string | undefined;
  new_nav: string | undefined;
  reason_code: string | undefined;
  request_pda: string | undefined;
  accounts: string[] | undefined;
  new_manager: string | undefined;
  new_authority: string | undefined;
  new_attester: string | undefined;
}

/**
 * Maps SVS-11 Anchor instruction names (camelCase) to execution event types.
 *
 * KEY DESIGN DECISION: approveDeposit and approveRedeem each produce TWO events:
 *   1. investment.approved / withdrawal.approved -- emitted by the tx builder
 *      BEFORE signing (chain_confirmed: false)
 *   2. investment.settled / withdrawal.settled -- emitted HERE by the webhook
 *      AFTER chain confirmation (chain_confirmed: true)
 *
 * This two-step distinction is required by §4.5: the investor sees
 * "approved, confirming..." before "settled."
 */
const INSTRUCTION_TO_EVENT: Record<string, string> = {
  // --- SVS-11 Credit Vault ---
  initializePool: 'pool.deployed',
  openInvestmentWindow: 'pool.investment_window_opened',
  closeInvestmentWindow: 'pool.investment_window_closed',
  requestDeposit: 'investment.requested',
  approveDeposit: 'investment.settled',
  claimDeposit: 'investment.claimed',
  rejectDeposit: 'investment.rejected',
  cancelDeposit: 'investment.cancelled',
  requestRedeem: 'withdrawal.requested',
  approveRedeem: 'withdrawal.settled',
  claimRedeem: 'withdrawal.claimed',
  cancelRedeem: 'withdrawal.cancelled',
  drawDown: 'pool.draw_down',
  repay: 'pool.repayment',
  freezeAccount: 'compliance.account_frozen',
  unfreezeAccount: 'compliance.account_unfrozen',
  pause: 'pool.paused',
  unpause: 'pool.unpaused',
  setManager: 'pool.manager_changed',
  transferAuthority: 'pool.authority_transferred',
  updateAttester: 'pool.attester_updated',
  // --- Mock SAS (attestation) ---
  createAttestation: 'kyb.attestation_created',
  revokeAttestation: 'kyb.attestation_revoked',
  // --- Mock Oracle (NAV pricing) ---
  setPrice: 'oracle.price_updated',
};

@Injectable()
export class HeliusWebhookService {
  private readonly logger = new Logger(HeliusWebhookService.name);
  private readonly authorityAddress: string;
  private readonly attesterAddress: string;

  constructor(
    private eventService: ExecutionEventService,
    private supabaseService: SupabaseService,
    private solanaService: SolanaService,
    private configService: ConfigService,
    private attesterGuard: AttesterGuard,
    private poolOnChainService: PoolOnChainService,
  ) {
    this.authorityAddress = this.configService.getOrThrow<string>('AUTHORITY');
    this.attesterAddress = this.configService.getOrThrow<string>('ATTESTER');
  }

  async processTransaction(tx: HeliusTransaction): Promise<void> {
    this.logger.debug(`Processing tx: ${tx.signature}`);

    // Skip failed transactions — Helius sends them but instructions didn't execute
    if (tx.transactionError || tx.meta?.err) {
      this.logger.debug(
        `Skipping failed tx ${tx.signature}: ${JSON.stringify(tx.transactionError ?? tx.meta?.err)}`,
      );
      return;
    }

    try {
      for (const ix of tx.instructions ?? []) {
        let instructionName = ix.data?.name ?? ix.parsed?.type ?? '';

        // Helius enhanced mode doesn't parse custom Anchor programs.
        // Decode the instruction name and args from the raw base58 data.
        if (!instructionName && typeof ix.data === 'string') {
          try {
            const decoded = utils.bytes.bs58.decode(ix.data);
            const disc = Buffer.from(decoded.subarray(0, 8)).toString('hex');
            instructionName = DISCRIMINATOR_TO_NAME[disc] ?? '';
            if (instructionName) {
              this.logger.debug(
                `Decoded instruction from discriminator: ${instructionName}`,
              );
              // Decode args from raw bytes and reconstruct ix.data as a proper object
              // so downstream consumers (extractPayload, processOracleEvent, etc.) work unchanged.
              const args = this.decodeInstructionArgs(
                instructionName,
                decoded.subarray(8),
              );
              (ix as { data: HeliusInstruction['data'] }).data = {
                name: instructionName,
                args,
              };
            }
          } catch (err) {
            this.logger.warn(
              `Failed to decode instruction data: ${err instanceof Error ? err.message : 'unknown'}`,
            );
          }
        }

        const eventType = INSTRUCTION_TO_EVENT[instructionName];
        if (!eventType) continue;

        try {
          // Route attestation and oracle events to dedicated handlers
          if (eventType.startsWith('kyb.')) {
            await this.processAttestationEvent(eventType, ix, tx);
            continue;
          }
          if (eventType.startsWith('oracle.')) {
            await this.processOracleEvent(eventType, ix, tx);
            continue;
          }

          const payload: InstructionPayload = this.extractPayload(ix);

          // Resolve pool_id from accounts before event emission
          payload.pool_id = await this.resolvePoolId(payload);

          // Correlation: use request_pda only for deposit/redeem events,
          // otherwise use pool_id or tx signature
          const isRequestEvent =
            eventType.startsWith('investment.') ||
            eventType.startsWith('withdrawal.');

          let correlationId: string;
          if (isRequestEvent) {
            correlationId =
              payload.request_pda ?? payload.pool_id ?? tx.signature;
          } else {
            correlationId = payload.pool_id ?? tx.signature;
          }

          if (correlationId === tx.signature) {
            this.logger.warn(
              `Using tx signature as correlation_id for ${eventType} — pool_id could not be resolved`,
            );
          }

          await this.eventService.emit({
            event_type: eventType,
            correlation_id: correlationId,
            actor_id: ix.accounts?.[0] ?? 'unknown',
            actor_type: this.inferActorType(eventType),
            target_type: 'pool',
            target_id: payload.pool_id ?? 'unknown',
            payload: { ...payload, timestamp: tx.timestamp },
            chain_tx_id: tx.signature,
            chain_confirmed: true,
          });

          await this.updateReadModels(
            eventType,
            payload,
            correlationId,
            tx.signature,
            tx.timestamp,
          );
        } catch (ixErr) {
          logError(
            this.logger,
            `Failed to process instruction ${eventType} in tx ${tx.signature}`,
            ixErr,
            { eventType },
          );
          throw ixErr;
        }
      }
    } catch (err) {
      logError(this.logger, `Failed to process tx ${tx.signature}`, err);
      throw err;
    }
  }

  // ─── Attestation (Mock SAS) ──────────────────────────────────────

  /**
   * Process createAttestation / revokeAttestation from the Mock SAS program.
   * Only accepts events from our known attester address.
   *
   * Account layout (createAttestation): [authority(0), attestation(1), subject(2), system_program(3)]
   * Account layout (revokeAttestation): [authority(0), attestation(1)]
   */
  private async processAttestationEvent(
    eventType: string,
    ix: HeliusInstruction,
    tx: HeliusTransaction,
  ): Promise<void> {
    // Verify instruction is from our attestation program
    if (ix.programId !== SOLANA_CONFIG.MOCK_SAS_PROGRAM_ID) {
      this.logger.debug(
        `Ignoring attestation from unknown program: ${ix.programId}`,
      );
      return;
    }

    const authority = ix.accounts?.[0];
    if (!authority || authority !== this.attesterAddress) {
      this.logger.warn(
        `Ignoring attestation from non-platform attester: ${authority ?? 'unknown'}`,
      );
      return;
    }

    const supabase = this.supabaseService.getClient();

    if (eventType === 'kyb.attestation_created') {
      const attestationPda = ix.accounts?.[1];
      const subjectWallet = ix.accounts?.[2];
      if (!subjectWallet) {
        this.logger.warn('createAttestation missing subject account');
        return;
      }

      // Find the KYB submission for this investor wallet
      const { data: wallet } = await supabase
        .from('kyb_wallet_declarations')
        .select('submission_id')
        .eq('wallet_address', subjectWallet)
        .limit(1)
        .single();

      if (!wallet) {
        this.logger.warn(
          `No KYB submission found for subject wallet: ${subjectWallet}`,
        );
        return;
      }

      // Update the submission with chain-confirmed attestation and set approved
      const { error } = await supabase
        .from('kyb_submissions')
        .update({
          attestation_tx: tx.signature,
          attestation_pda: attestationPda ?? null,
          status: 'approved',
        })
        .eq('id', wallet.submission_id);

      if (error) {
        logError(
          this.logger,
          'Failed to update kyb_submissions with attestation',
          error,
          { submissionId: wallet.submission_id },
        );
        throw error;
      }

      // Update the user record with kyc_attestation — this gates investor access
      const { error: userError } = await supabase
        .from('users')
        .update({
          kyc_attestation: tx.signature,
          updated_at: new Date().toISOString(),
        })
        .eq('account', subjectWallet);

      if (userError) {
        logError(
          this.logger,
          'Failed to update user kyc_attestation',
          userError,
          { subjectWallet },
        );
        throw userError; // Trigger Helius retry — both updates must succeed
      }

      await this.eventService.emit({
        event_type: eventType,
        correlation_id: wallet.submission_id,
        actor_id: authority,
        actor_type: 'attester',
        target_type: 'kyb_submission',
        target_id: wallet.submission_id,
        payload: {
          subject_wallet: subjectWallet,
          attestation_pda: attestationPda,
          timestamp: tx.timestamp,
        },
        chain_tx_id: tx.signature,
        chain_confirmed: true,
      });

      this.logger.log(
        `Attestation confirmed on-chain for submission ${wallet.submission_id}`,
      );
    }

    if (eventType === 'kyb.attestation_revoked') {
      const attestationPda = ix.accounts?.[1];
      if (!attestationPda) return;

      // Find submission by attestation_pda
      const { data: submission } = await supabase
        .from('kyb_submissions')
        .select('id')
        .eq('attestation_pda', attestationPda)
        .limit(1)
        .single();

      if (!submission) {
        this.logger.warn(
          `No KYB submission found for attestation PDA: ${attestationPda}`,
        );
        return;
      }

      const { error } = await supabase
        .from('kyb_submissions')
        .update({ status: 'revoked' })
        .eq('id', submission.id);

      if (error) {
        logError(
          this.logger,
          'Failed to revoke kyb_submission via webhook',
          error,
          { submissionId: submission.id },
        );
        throw error;
      }

      await this.eventService.emit({
        event_type: eventType,
        correlation_id: submission.id,
        actor_id: authority,
        actor_type: 'attester',
        target_type: 'kyb_submission',
        target_id: submission.id,
        payload: { attestation_pda: attestationPda, timestamp: tx.timestamp },
        chain_tx_id: tx.signature,
        chain_confirmed: true,
      });

      // Clear cached attester status
      this.attesterGuard.clearCacheForWallet(authority);
      this.logger.log(
        `Attestation revoked on-chain for submission ${submission.id}`,
      );
    }
  }

  // ─── Oracle (NAV pricing) ──────────────────────────────────────

  /**
   * Process setPrice from the Mock Oracle program.
   * Resolves pools linked to this oracle and persists price to nav_price_history
   * and pools.price_per_share.
   *
   * Account layout: [authority(0), oracle_data(1), system_program(2)]
   */
  private async processOracleEvent(
    eventType: string,
    ix: HeliusInstruction,
    tx: HeliusTransaction,
  ): Promise<void> {
    if (ix.programId !== SOLANA_CONFIG.MOCK_ORACLE_PROGRAM_ID) {
      this.logger.debug(
        `Ignoring oracle event from unknown program: ${ix.programId}`,
      );
      return;
    }

    const authority = ix.accounts?.[0];
    const rawPrice = Number(ix.data?.args?.price);

    if (Number.isNaN(rawPrice)) {
      this.logger.warn('setPrice instruction missing price arg');
      return;
    }

    const supabase = this.supabaseService.getClient();

    // Resolve pools that use this oracle.
    // Try matching by oracle data account first (production: per-pool oracle PDA).
    // Fall back to oracle program ID (mock oracle: shared singleton).
    const oracleAccount = ix.accounts?.[1];
    const oracleProgramId = ix.programId;

    const { data: initialPools, error: lookupError } = await supabase
      .from('pools')
      .select('id')
      .eq('nav_oracle_address', oracleAccount ?? '')
      .eq('status', 'deployed');

    if (lookupError) {
      logError(
        this.logger,
        'Failed to resolve pools for oracle event',
        lookupError,
      );
      throw lookupError;
    }

    let pools = initialPools;

    // Fallback: mock oracle stores program ID as nav_oracle_address, not the data PDA
    if ((!pools || pools.length === 0) && oracleProgramId) {
      const fallback = await supabase
        .from('pools')
        .select('id')
        .eq('nav_oracle_address', oracleProgramId)
        .eq('status', 'deployed');

      if (fallback.error) {
        logError(
          this.logger,
          'Failed to resolve pools by program ID',
          fallback.error,
        );
        throw fallback.error;
      }
      pools = fallback.data;
    }

    if (!pools || pools.length === 0) {
      this.logger.warn(
        `No deployed pools found for oracle account: ${oracleAccount ?? 'unknown'} or program: ${oracleProgramId ?? 'unknown'}`,
      );
      return;
    }

    const recordedAt = new Date(tx.timestamp * 1000).toISOString();

    for (const pool of pools) {
      // Insert price history (idempotent — upsert with ignoreDuplicates for webhook retries)
      const { error: insertError } = await supabase
        .from('nav_price_history')
        .upsert(
          {
            pool_id: pool.id,
            price: rawPrice,
            recorded_at: recordedAt,
            chain_tx_id: tx.signature,
          },
          { onConflict: 'pool_id,chain_tx_id', ignoreDuplicates: true },
        );

      if (insertError) {
        logError(
          this.logger,
          'Failed to insert nav price history',
          insertError,
          {
            poolId: pool.id,
          },
        );
        throw insertError;
      }

      // Update latest price on pools table
      const { error: updateError } = await supabase
        .from('pools')
        .update({
          price_per_share: rawPrice / 10 ** SOLANA_CONFIG.ORACLE_PRICE_DECIMALS,
        })
        .eq('id', pool.id);

      if (updateError) {
        logError(this.logger, 'Failed to update price_per_share', updateError, {
          poolId: pool.id,
        });
        throw updateError;
      }

      // Emit execution event with pool context
      await this.eventService.emit({
        event_type: eventType,
        correlation_id: pool.id,
        actor_id: authority ?? 'unknown',
        actor_type: 'oracle',
        target_type: 'pool',
        target_id: pool.id,
        payload: { price: rawPrice, timestamp: tx.timestamp },
        chain_tx_id: tx.signature,
        chain_confirmed: true,
      });

      this.logger.log(
        `NAV price updated for pool ${pool.id}: raw=${rawPrice} normalized=${rawPrice / 10 ** SOLANA_CONFIG.ORACLE_PRICE_DECIMALS} by ${authority}`,
      );

      // Snapshot TVL after price update
      await this.snapshotPoolTvl(
        pool.id,
        eventType,
        tx.signature,
        tx.timestamp,
      );
    }
  }

  // ─── TVL Snapshots ────────────────────────────────────────────

  /**
   * Write a TVL snapshot for a pool after a TVL-affecting event.
   * Reads totalShares from chain (one RPC call), combines with
   * price_per_share from DB, writes to tvl_snapshots table.
   */
  private async snapshotPoolTvl(
    poolId: string,
    eventType: string,
    txSignature: string,
    timestamp: number,
  ): Promise<void> {
    try {
      const onChainState =
        await this.poolOnChainService.getPoolOnchainState(poolId);
      if (!onChainState) {
        this.logger.warn(
          `TVL snapshot skipped: vault not found on-chain for pool ${poolId}`,
        );
        return;
      }

      const totalSharesStr = onChainState.totalShares;
      const totalSharesBig = BigInt(totalSharesStr);
      if (totalSharesBig === 0n) return;

      const supabase = this.supabaseService.getClient();
      const { data: pool } = await supabase
        .from('pools')
        .select('price_per_share')
        .eq('id', poolId)
        .single();

      const pricePerShare = pool?.price_per_share;
      if (pricePerShare == null) {
        this.logger.debug(
          `TVL snapshot skipped: no price_per_share for pool ${poolId}`,
        );
        return;
      }

      // price_per_share is stored as a float (e.g., 1.05 = $1.05 per share).
      // Scale to microdollars (6 decimals) for BigInt arithmetic, then divide out.
      const priceScaled = BigInt(Math.round(pricePerShare * 1_000_000));
      const tvlBig = (totalSharesBig * priceScaled) / 1_000_000_000_000n;
      const tvl = Number(tvlBig);

      const { error } = await supabase.from('tvl_snapshots').insert({
        pool_id: poolId,
        tvl,
        total_shares: Number(totalSharesStr),
        price_per_share: pricePerShare,
        event_type: eventType,
        chain_tx_id: txSignature,
        recorded_at: new Date(timestamp * 1000).toISOString(),
      });

      if (error) {
        logError(this.logger, 'Failed to insert TVL snapshot', error, {
          poolId,
        });
      } else {
        this.logger.log(
          `TVL snapshot: pool=${poolId} tvl=$${tvl.toFixed(2)} event=${eventType}`,
        );
      }
    } catch (err) {
      // Non-fatal — log and continue. Next event will capture state.
      logError(this.logger, 'TVL snapshot failed (RPC or DB error)', err, {
        poolId,
        eventType,
      });
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private inferActorType(eventType: string): ExecutionEvent['actor_type'] {
    if (eventType.startsWith('kyb.')) return 'attester';
    if (eventType.startsWith('oracle.')) return 'oracle';
    if (eventType.includes('requested') || eventType.includes('cancelled'))
      return 'investor';
    if (eventType.includes('settled') || eventType.includes('failed'))
      return 'system';
    // Authority-only actions (require authority signer, not manager)
    if (
      eventType === 'pool.deployed' ||
      eventType === 'pool.authority_transferred' ||
      eventType === 'pool.attester_updated'
    )
      return 'admin';
    return 'manager';
  }

  /**
   * Decode instruction args from raw Borsh-serialized bytes (after the 8-byte discriminator).
   * Layouts come from the on-chain IDL (svs_11.json, mock_oracle.json, mock_sas.json).
   */
  private decodeInstructionArgs(
    instructionName: string,
    data: Uint8Array,
  ): NonNullable<NonNullable<HeliusInstruction['data']>['args']> {
    const buf = Buffer.from(data);
    switch (instructionName) {
      case 'initializePool':
        return { vaultId: buf.readBigUInt64LE(0).toString() };
      case 'requestDeposit':
      case 'drawDown':
      case 'repay':
        return { amount: buf.readBigUInt64LE(0).toString() };
      case 'requestRedeem':
        return { shares: buf.readBigUInt64LE(0).toString() };
      case 'rejectDeposit':
        return { reasonCode: String(buf.readUInt8(0)) };
      case 'setManager':
        return {
          newManager: new PublicKey(buf.subarray(0, 32)).toBase58(),
        };
      case 'transferAuthority':
        return {
          newAuthority: new PublicKey(buf.subarray(0, 32)).toBase58(),
        };
      case 'updateAttester':
        return {
          newAttester: new PublicKey(buf.subarray(0, 32)).toBase58(),
          newAttestationProgram: new PublicKey(buf.subarray(32, 64)).toBase58(),
        };
      case 'setPrice':
        return { price: buf.readBigUInt64LE(0).toString() };
      case 'createAttestation':
        return {
          issuer: new PublicKey(buf.subarray(0, 32)).toBase58(),
          attestationType: buf.readUInt8(32),
          countryCode: [buf.readUInt8(33), buf.readUInt8(34)],
          expiresAt: buf.readBigInt64LE(35).toString(),
        };
      default:
        return {};
    }
  }

  private extractPayload(instruction: HeliusInstruction): InstructionPayload {
    const args = instruction.data?.args;
    return {
      pool_id: undefined, // SVS-11 uses vault_id; pool_id resolved via DB lookup if needed
      vault_id: args?.vaultId,
      amount: args?.amount,
      shares: args?.shares,
      new_nav: args?.pricePerShare,
      reason_code: args?.reasonCode,
      // Account positions are instruction-specific:
      //   initialize_pool: [authority, manager, vault, assetMint, sharesMint, depositVault, redemptionEscrow, navOracle, oracleProgram, attester, attestationProgram, ...]
      //   set_manager/transfer_authority/update_attester: [authority, vault]
      //   approve_deposit/reject_deposit/approve_redeem: [signer, vault, request_pda, ...]
      // Position 2 is the request PDA for deposit/redeem instructions (undefined for others — falls through gracefully)
      request_pda: instruction.accounts?.[2],
      accounts: instruction.accounts,
      new_manager: args?.newManager,
      new_authority: args?.newAuthority,
      new_attester: args?.newAttester,
    };
  }

  /**
   * Emit risk.snapshot_attached when an investment is settled (§4.9).
   * Non-negotiable per spec: every share issuance must carry the risk state
   * at the moment of approval.
   */
  private async attachRiskSnapshot(correlationId: string, poolId: string) {
    const supabase = this.supabaseService.getClient();

    // Get pool's pipeline_key and pool_type to route to the correct risk table
    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .select('pipeline_key, pool_type')
      .eq('id', poolId)
      .single();
    if (poolError) {
      logError(
        this.logger,
        'Failed to fetch pool for risk snapshot',
        poolError,
        { poolId },
      );
      throw poolError;
    }
    if (!pool?.pipeline_key) return;

    // Route to the correct risk score table based on pool type
    if (pool.pool_type === 'tidc') {
      const { data: tidcRisk, error: tidcError } = await supabase
        .from('risk_tidc_scores')
        .select(
          'score_risco, faixa_risco, default_ratio, collection_rate, alerta_deterioracao',
        )
        .eq('pipeline_key', pool.pipeline_key)
        .single();

      if (tidcError || !tidcRisk) {
        this.logger.warn(
          `No TIDC risk data for ${pool.pipeline_key} -- skipping snapshot`,
        );
        return;
      }

      await this.eventService.emit({
        event_type: 'risk.snapshot_attached',
        correlation_id: correlationId,
        actor_id: 'system',
        actor_type: 'system',
        target_type: 'pool',
        target_id: poolId,
        payload: {
          pipeline_key: pool.pipeline_key,
          pool_type: 'tidc',
          score_risco: tidcRisk.score_risco,
          faixa_risco: tidcRisk.faixa_risco,
          default_ratio: tidcRisk.default_ratio,
          collection_rate: tidcRisk.collection_rate,
          alerta_deterioracao: tidcRisk.alerta_deterioracao,
        },
      });
    } else {
      const { data: fidcRisk, error: fidcError } = await supabase
        .from('risk_fidc_scores')
        .select(
          'score_risco, faixa_risco, pdd_ratio, delta_pdd, alerta_deterioracao',
        )
        .eq('pipeline_key', pool.pipeline_key)
        .single();

      if (fidcError || !fidcRisk) {
        this.logger.warn(
          `No FIDC risk data for ${pool.pipeline_key} -- skipping snapshot`,
        );
        return;
      }

      await this.eventService.emit({
        event_type: 'risk.snapshot_attached',
        correlation_id: correlationId,
        actor_id: 'system',
        actor_type: 'system',
        target_type: 'pool',
        target_id: poolId,
        payload: {
          pipeline_key: pool.pipeline_key,
          pool_type: 'fidc',
          score_risco: fidcRisk.score_risco,
          faixa_risco: fidcRisk.faixa_risco,
          pdd_ratio: fidcRisk.pdd_ratio,
          delta_pdd: fidcRisk.delta_pdd,
          alerta_deterioracao: fidcRisk.alerta_deterioracao,
        },
      });
    }
  }

  // Pool funding status is tracked by the manager closing the investment window.

  /**
   * Resolve pool UUID from on-chain account addresses.
   * Account layouts differ per instruction:
   *   - initializePool: [authority(0), manager(1), vault(2), ...]
   *   - All other instructions: [signer(0), vault(1), ...]
   */
  private async resolvePoolId(
    payload: InstructionPayload,
  ): Promise<string | undefined> {
    if (payload.pool_id) return payload.pool_id;

    const supabase = this.supabaseService.getClient();

    // Batch-query all account positions against on_chain_address
    if (payload.accounts) {
      const accounts = payload.accounts.filter(Boolean);
      if (accounts.length > 0) {
        const { data } = await supabase
          .from('pools')
          .select('id, on_chain_address')
          .in('on_chain_address', accounts);
        if (data && data.length > 0) return data[0].id;
      }
    }

    // Fallback: vault_id from decoded args
    if (payload.vault_id !== undefined) {
      const { data } = await supabase
        .from('pools')
        .select('id')
        .eq('vault_id', Number(payload.vault_id))
        .single();
      if (data?.id) return data.id;
    }

    return undefined;
  }

  private async updateReadModels(
    eventType: string,
    payload: InstructionPayload,
    correlationId: string,
    txSignature: string,
    txTimestamp: number,
  ) {
    const supabase = this.supabaseService.getClient();
    const poolId = payload.pool_id;

    if (!poolId) {
      // For critical events, throw so Helius retries
      const criticalEvents = [
        'pool.deployed',
        'pool.manager_changed',
        'pool.authority_transferred',
        'pool.attester_updated',
      ];
      if (criticalEvents.includes(eventType)) {
        const msg = `pool_id resolution failed for critical event: ${eventType}`;
        logError(this.logger, msg, new Error(msg), {
          accounts: payload.accounts,
          vault_id: payload.vault_id,
        });
        throw new Error(msg);
      }
      return;
    }

    switch (eventType) {
      case 'pool.deployed': {
        const accounts = payload.accounts;
        const authorityAddress: string | undefined = accounts?.[0];

        // Reject vaults not created by the platform authority.
        // SVS-11 vault creation is permissionless — anyone can call initializePool.
        // Only vaults from our known authority are accepted into the platform.
        if (authorityAddress !== this.authorityAddress) {
          this.logger.warn(
            `Ignoring vault from non-platform authority: ${authorityAddress ?? 'unknown'}`,
          );
          return;
        }

        const onChainAddress: string | undefined = accounts?.[2]; // vault PDA at position 2
        const managerAddress: string | undefined = accounts?.[1];
        const attesterAddress: string | undefined = accounts?.[9]; // attester at position 9

        const { error: deployError } = await supabase
          .from('pools')
          .update({
            status: 'deployed',
            on_chain_address: onChainAddress ?? null,
            authority_address: authorityAddress ?? null,
            manager_address: managerAddress ?? null,
            attester_address: attesterAddress ?? null,
            nav_oracle_address: accounts?.[7] ?? null,
            deployed_at: new Date(txTimestamp * 1000).toISOString(),
          })
          .eq('id', poolId);
        if (deployError) {
          logError(
            this.logger,
            'Failed to update pool status to deployed',
            deployError,
            { poolId },
          );
          throw deployError;
        }
        break;
      }

      case 'pool.investment_window_opened': {
        const { error: openError } = await supabase
          .from('pools')
          .update({ investment_window_open: true })
          .eq('id', poolId);
        if (openError) {
          logError(
            this.logger,
            'Failed to update pool investment_window_open to true',
            openError,
            { poolId },
          );
          throw openError;
        }
        // Insert new window -- use RPC function to avoid race condition on window_number
        const { error: rpcOpenError } = await supabase.rpc(
          'open_investment_window',
          {
            p_pool_id: poolId,
            p_opened_at: new Date().toISOString(),
          },
        );
        if (rpcOpenError) {
          logError(
            this.logger,
            'Failed to open investment window via RPC',
            rpcOpenError,
            { poolId },
          );
          throw rpcOpenError;
        }
        break;
      }

      case 'pool.investment_window_closed': {
        const { error: closePoolError } = await supabase
          .from('pools')
          .update({ investment_window_open: false })
          .eq('id', poolId);
        if (closePoolError) {
          logError(
            this.logger,
            'Failed to update pool investment_window_open to false',
            closePoolError,
            { poolId },
          );
          throw closePoolError;
        }
        // Close the current open window
        const { error: closeWindowError } = await supabase
          .from('pool_investment_windows')
          .update({ closed_at: new Date().toISOString() })
          .eq('pool_id', poolId)
          .is('closed_at', null);
        if (closeWindowError) {
          logError(
            this.logger,
            'Failed to close investment window',
            closeWindowError,
            { poolId },
          );
          throw closeWindowError;
        }
        break;
      }

      case 'investment.settled': {
        // Update window totals
        const settledAmount = Number(payload.amount ?? 0);
        const { error: approvedError } = await supabase.rpc(
          'increment_window_approved',
          {
            p_pool_id: poolId,
            p_amount: settledAmount,
          },
        );
        if (approvedError) {
          logError(
            this.logger,
            'Failed to increment window approved amount',
            approvedError,
            { poolId },
          );
          throw approvedError;
        }
        // Attach risk snapshot (non-negotiable per §4.9)
        await this.attachRiskSnapshot(correlationId, poolId);
        // Snapshot TVL — shares were minted
        await this.snapshotPoolTvl(poolId, eventType, txSignature, txTimestamp);
        break;
      }

      case 'investment.rejected': {
        const rejectedAmount = Number(payload.amount ?? 0);
        const { error: rejectedError } = await supabase.rpc(
          'increment_window_rejected',
          {
            p_pool_id: poolId,
            p_amount: rejectedAmount,
          },
        );
        if (rejectedError) {
          logError(
            this.logger,
            'Failed to increment window rejected amount',
            rejectedError,
            { poolId },
          );
          throw rejectedError;
        }
        break;
      }

      case 'investment.requested': {
        const requestedAmount = Number(payload.amount ?? 0);
        const { error: requestedError } = await supabase.rpc(
          'increment_window_requested',
          {
            p_pool_id: poolId,
            p_amount: requestedAmount,
          },
        );
        if (requestedError) {
          logError(
            this.logger,
            'Failed to increment window requested amount',
            requestedError,
            { poolId },
          );
          throw requestedError;
        }
        break;
      }

      case 'pool.manager_changed': {
        const newManager = payload.new_manager;
        if (!newManager) {
          const msg = `set_manager webhook missing newManager arg for pool ${poolId}`;
          logError(this.logger, msg, new Error(msg), { poolId, payload });
          throw new Error(msg);
        }

        const { error } = await supabase
          .from('pools')
          .update({ manager_address: newManager })
          .eq('id', poolId);

        if (error) {
          logError(this.logger, 'Failed to update manager_address', error, {
            poolId,
          });
          throw error;
        }
        break;
      }

      case 'pool.authority_transferred': {
        const newAuthority = payload.new_authority;
        if (!newAuthority) {
          const msg = `transfer_authority webhook missing newAuthority arg for pool ${poolId}`;
          logError(this.logger, msg, new Error(msg), { poolId, payload });
          throw new Error(msg);
        }

        const { error } = await supabase
          .from('pools')
          .update({ authority_address: newAuthority })
          .eq('id', poolId);

        if (error) {
          logError(this.logger, 'Failed to update authority_address', error, {
            poolId,
          });
          throw error;
        }
        break;
      }

      case 'pool.attester_updated': {
        const newAttester = payload.new_attester;
        if (!newAttester) {
          const msg = `update_attester webhook missing newAttester arg for pool ${poolId}`;
          logError(this.logger, msg, new Error(msg), { poolId, payload });
          throw new Error(msg);
        }

        const { error } = await supabase
          .from('pools')
          .update({ attester_address: newAttester })
          .eq('id', poolId);

        if (error) {
          logError(this.logger, 'Failed to update attester_address', error, {
            poolId,
          });
          throw error;
        }

        // Clear cached attester status so next request re-queries DB
        this.attesterGuard.clearCacheForWallet(newAttester);
        break;
      }

      case 'withdrawal.settled': {
        // Shares burned — snapshot TVL
        await this.snapshotPoolTvl(poolId, eventType, txSignature, txTimestamp);
        break;
      }

      case 'pool.draw_down':
      case 'pool.repayment':
      case 'withdrawal.claimed':
      case 'investment.cancelled': {
        // These events are recorded in execution_events but don't require
        // read model updates — on-chain state is synced via NAV price updates
        break;
      }
    }
  }
}
