import { Injectable, Logger } from '@nestjs/common';
import { SolanaService } from '../../blockchain/solana.service';
import { SupabaseService } from '../../database/supabase.service';
import { logError } from '../../common/utils';
import { PublicKey } from '@solana/web3.js';
import { SOLANA_CONFIG } from '../../blockchain/solana-config';

/**
 * BN from bn.js lacks type declarations, so Anchor account fields typed as BN
 * resolve to `any`. This interface provides the structural shape we need.
 */
interface BNLike {
  toString(): string;
}

/** Safely convert a BN-like value to a string to avoid Number.MAX_SAFE_INTEGER overflow */
function bnToString(val: BNLike): string {
  return val.toString();
}

/** Returns true if the error indicates a missing SPL token account (expected for new investors) */
function isTokenAccountNotFound(err: unknown): boolean {
  // TokenAccountNotFoundError from @solana/spl-token is a class with an empty message,
  // so we also check the constructor name.
  const name = err instanceof Error ? err.constructor.name : '';
  const message = err instanceof Error ? err.message : String(err);
  return (
    name === 'TokenAccountNotFoundError' ||
    message.includes('could not find account') ||
    message.includes('Account does not exist') ||
    message.includes('TokenAccountNotFoundError')
  );
}

export type OnChainPoolData = {
  manager: string;
  sharesMint: string;
  depositVault: string;
  assetMint: string;
  navOracle: string;
  attester: string;
  investmentWindowOpen: boolean;
  totalAssets: string;
  totalShares: string;
  totalPendingDeposits: string;
  depositVaultBalance: string;
  pricePerShare: number | null;
  minimumInvestment: string;
  paused: boolean;
};

export type PoolOnChainDataResult =
  | { status: 'success'; data: OnChainPoolData }
  | { status: 'not_found' }
  | { status: 'error'; error: string };

export type MultiplePoolsOnChainDataResult =
  | { status: 'success'; data: Map<string, OnChainPoolData> }
  | { status: 'error'; error: string };

@Injectable()
export class PoolOnChainService {
  private readonly logger = new Logger(PoolOnChainService.name);

  getOraclePda(): string {
    return this.solanaService.getOraclePda();
  }

  constructor(
    private solanaService: SolanaService,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Look up vault_id and asset_mint from the DB for a given pool UUID,
   * then derive the vault PDA.
   */
  private async getPoolVaultParams(poolId: string): Promise<{
    vaultId: number;
    assetMint: PublicKey;
    vaultPda: PublicKey;
  }> {
    const client = this.supabaseService.getClient();
    const { data: pool, error } = await client
      .from('pools')
      .select('vault_id, asset_mint')
      .eq('id', poolId)
      .single();
    if (error || !pool?.vault_id || !pool?.asset_mint) {
      throw new Error(`Pool ${poolId} missing vault_id or asset_mint`);
    }
    const assetMint = new PublicKey(pool.asset_mint);
    const vaultPda = this.solanaService.getVaultPda(assetMint, pool.vault_id);
    return { vaultId: pool.vault_id, assetMint, vaultPda };
  }

  async getPoolOnchainState(poolId: string) {
    const { vaultId, assetMint } = await this.getPoolVaultParams(poolId);
    const state = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!state) return null;

    // Read NAV per share from the oracle PDA
    // Oracle stores price_per_share as u64 with ORACLE_PRICE_DECIMALS (8) decimals
    let pricePerShare: number | null = null;
    try {
      const oracleData = await this.solanaService.fetchOracleData(
        state.navOracle,
      );
      if (oracleData) {
        const raw = Number(bnToString(oracleData.pricePerShare as BNLike));
        pricePerShare = raw / 10 ** SOLANA_CONFIG.ORACLE_PRICE_DECIMALS;
      }
    } catch (err) {
      logError(
        this.logger,
        'Oracle fetch failed — pricePerShare will be null',
        err,
        {
          oracleAddress: state.navOracle?.toString(),
        },
      );
    }

    // Read the deposit vault's actual token balance
    let depositVaultBalance = '0';
    try {
      const { getAccount } = await import('@solana/spl-token');
      const vaultAccount = await getAccount(
        this.solanaService.getConnection(),
        state.depositVault,
      );
      depositVaultBalance = vaultAccount.amount.toString();
    } catch (err) {
      if (!isTokenAccountNotFound(err)) {
        this.logger.warn(
          `Failed to read deposit vault balance: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      manager: state.manager.toBase58(),
      sharesMint: state.sharesMint.toBase58(),
      depositVault: state.depositVault.toBase58(),
      assetMint: state.assetMint.toBase58(),
      navOracle: state.navOracle.toBase58(),
      attester: state.attester.toBase58(),
      investmentWindowOpen: state.investmentWindowOpen,
      totalAssets: bnToString(state.totalAssets as BNLike),
      totalShares: bnToString(state.totalShares as BNLike),
      totalPendingDeposits: bnToString(state.totalPendingDeposits as BNLike),
      depositVaultBalance,
      pricePerShare,
      minimumInvestment: bnToString(state.minimumInvestment as BNLike),
      paused: state.paused,
    };
  }

  async getRedemptionRequest(poolId: string, investorAddress: string) {
    const { vaultPda } = await this.getPoolVaultParams(poolId);
    const investor = new PublicKey(investorAddress);
    const [pda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    try {
      const request =
        await this.solanaService.accounts.redemptionRequest.fetch(pda);
      return {
        investor: request.investor.toBase58(),
        sharesLocked: bnToString(request.sharesLocked as BNLike),
        assetsClaimable: bnToString(request.assetsClaimable as BNLike),
        status: Object.keys(request.status)[0],
        requestedAt: bnToString(request.requestedAt as BNLike),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('Account does not exist') ||
        message.includes('could not find account')
      ) {
        return null;
      }
      this.logger.warn(`RPC error fetching redemption request: ${message}`);
      throw err;
    }
  }

  /**
   * Get the three balance states required by S5.2:
   * free shares / locked shares / claimable USDC
   */
  async getInvestorBalanceStates(poolId: string, investorAddress: string) {
    const { vaultPda, assetMint } = await this.getPoolVaultParams(poolId);
    const investor = new PublicKey(investorAddress);

    // 1. Get total share balance from SPL token account
    // shares_mint PDA is seeded with ["shares", vault_pda]
    const [sharesMintPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.SHARES_MINT),
      vaultPda.toBuffer(),
    ]);
    const { getAssociatedTokenAddress, getAccount, TOKEN_2022_PROGRAM_ID } =
      await import('@solana/spl-token');
    let totalShares = BigInt(0);
    try {
      const ata = await getAssociatedTokenAddress(
        sharesMintPda,
        investor,
        true,
        TOKEN_2022_PROGRAM_ID,
      );
      const account = await getAccount(
        this.solanaService.getConnection(),
        ata,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
      totalShares = BigInt(account.amount);
    } catch (err: unknown) {
      if (!isTokenAccountNotFound(err)) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`RPC error fetching share balance: ${message}`);
        throw err;
      }
    }

    // 2. Get investor's USDC wallet balance (for Max button on Invest form)
    let usdcBalance = BigInt(0);
    try {
      const usdcAta = await getAssociatedTokenAddress(assetMint, investor);
      const usdcAccount = await getAccount(
        this.solanaService.getConnection(),
        usdcAta,
      );
      usdcBalance = BigInt(usdcAccount.amount);
    } catch (err: unknown) {
      if (!isTokenAccountNotFound(err)) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`RPC error fetching USDC balance: ${message}`);
        throw err;
      }
    }

    // 3. Get locked shares and claimable USDC from RedemptionRequest PDA
    const redemption = await this.getRedemptionRequest(poolId, investorAddress);
    const lockedShares =
      redemption?.status === 'Pending'
        ? BigInt(redemption.sharesLocked)
        : BigInt(0);

    // After approveRedeem, assetsClaimable holds the USDC amount the investor can claim.
    // On-chain status 'Approved' corresponds to event 'withdrawal.settled'.
    const claimableAmount =
      redemption?.status === 'Approved' ? redemption.assetsClaimable : '0';

    const freeShares =
      totalShares > lockedShares ? totalShares - lockedShares : BigInt(0);

    return {
      freeShares: freeShares.toString(),
      lockedShares: lockedShares.toString(),
      claimableUsdc: claimableAmount,
      usdcBalance: usdcBalance.toString(),
    };
  }

  /**
   * Fetch on-chain data for a single pool (by pool UUID).
   */
  async fetchPoolOnChainData(poolId: string): Promise<PoolOnChainDataResult> {
    try {
      const data = await this.getPoolOnchainState(poolId);
      if (!data) return { status: 'not_found' };
      return { status: 'success', data };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch on-chain data for pool ${poolId}: ${error}`,
      );
      return { status: 'error', error: String(error) };
    }
  }

  /**
   * Fetch on-chain data for multiple pools (by pool UUIDs).
   */
  async fetchMultiplePoolsOnChainData(
    poolIds: string[],
  ): Promise<MultiplePoolsOnChainDataResult> {
    try {
      const dataMap = new Map<string, OnChainPoolData>();
      const results = await Promise.allSettled(
        poolIds.map(async (id) => {
          const data = await this.getPoolOnchainState(id);
          if (data) dataMap.set(id, data);
        }),
      );
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger.warn(
          `${failures.length}/${poolIds.length} pool on-chain fetches failed`,
        );
      }
      return { status: 'success', data: dataMap };
    } catch (error) {
      return { status: 'error', error: String(error) };
    }
  }
}
