import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { SolanaService } from '../../blockchain/solana.service';
import { ExecutionEventService } from '../../events/events.service';
import { SupabaseService } from '../../database/supabase.service';
import { PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SOLANA_CONFIG, getTokenMeta } from '../../blockchain/solana-config';
import { BN } from '@coral-xyz/anchor';

/**
 * bn.js ships no type declarations so `BN` resolves to `any`.
 * This typed constructor interface provides type safety for BN construction.
 */
interface BNConstructor {
  new (value: number | string): { toNumber(): number; toString(): string };
}
const TypedBN = BN as unknown as BNConstructor;

export interface InvestmentRequestSummary {
  correlationId: string;
  investorAddress: string;
  amount: number;
  latestEvent: string;
  createdAt: string;
}

export interface RedemptionRequestSummary {
  correlationId: string;
  investorAddress: string;
  shares: number;
  latestEvent: string;
  createdAt: string;
}

const TOKEN_2022_PROGRAM_ID = new PublicKey(
  SOLANA_CONFIG.TOKEN_2022_PROGRAM_ID,
);

@Injectable()
export class PoolDeploymentService {
  private readonly logger = new Logger(PoolDeploymentService.name);

  constructor(
    private solanaService: SolanaService,
    private eventService: ExecutionEventService,
    private supabaseService: SupabaseService,
  ) {}

  // ─── Helper: serialize unsigned tx ───────────────────────────────────

  private async serializeUnsignedTx(
    tx: Transaction,
    feePayer: PublicKey,
  ): Promise<string> {
    const { blockhash } = await this.solanaService
      .getConnection()
      .getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = feePayer;
    return tx.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // ─── Helper: ensure ATA exists (prepends create-ATA ix if needed) ──

  private async ensureAta(
    tx: Transaction,
    owner: PublicKey,
    mint: PublicKey,
    payer: PublicKey,
    tokenProgramId: PublicKey = TOKEN_PROGRAM_ID,
  ): Promise<PublicKey> {
    const {
      getAssociatedTokenAddress,
      getAccount,
      createAssociatedTokenAccountInstruction,
    } = await import('@solana/spl-token');

    const ata = await getAssociatedTokenAddress(
      mint,
      owner,
      true,
      tokenProgramId,
    );
    try {
      await getAccount(
        this.solanaService.getConnection(),
        ata,
        undefined,
        tokenProgramId,
      );
    } catch (error: unknown) {
      // Only create ATA if the account genuinely doesn't exist
      // Re-throw RPC errors, timeouts, etc.
      const isNotFound =
        error instanceof Error &&
        (error.name === 'TokenAccountNotFoundError' ||
          error.message.includes('could not find account'));
      if (!isNotFound) {
        throw error;
      }
      tx.add(
        createAssociatedTokenAccountInstruction(
          payer,
          ata,
          owner,
          mint,
          tokenProgramId,
        ),
      );
    }
    return ata;
  }

  // ─── Helper: derive common PDAs ──────────────────────────────────────

  private deriveFrozenCheckPda(
    vaultPda: PublicKey,
    investor: PublicKey,
  ): PublicKey {
    const [pda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.FROZEN_ACCOUNT),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    return pda;
  }

  /**
   * Resolve the frozen_check account for an instruction.
   * The IDL marks frozen_check as optional — if the FrozenAccount PDA
   * doesn't exist on-chain, pass the program ID (Anchor's "absent" sentinel).
   */
  private async resolveFrozenCheck(
    vaultPda: PublicKey,
    investor: PublicKey,
  ): Promise<PublicKey> {
    const pda = this.deriveFrozenCheckPda(vaultPda, investor);
    const exists = await this.solanaService.fetchFrozenAccount(
      vaultPda,
      investor,
    );
    return exists ? pda : this.solanaService.getProgram().programId;
  }

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

  // ─── Pool lifecycle ────────────────────────────────────────────────

  /**
   * Build unsigned initialize_pool tx. Authority signs in wallet.
   *
   * SVS-11 takes vault_id (u64), minimum_investment (u64), and max_staleness (i64).
   * The vault PDA is derived from ["credit_vault", asset_mint, vault_id_le_bytes].
   */
  /**
   * Get the next available vault_id by checking both DB and on-chain state.
   *
   * NOTE: Read-max-then-write pattern; concurrent deployments are prevented
   * by the on-chain existence check below (lines scan until free slot found).
   */
  private async getNextVaultId(assetMint: PublicKey): Promise<number> {
    const client = this.supabaseService.getClient();
    const { data } = await client
      .from('pools')
      .select('vault_id')
      .order('vault_id', { ascending: false })
      .limit(1)
      .single();

    let nextId = (data?.vault_id || 0) + 1;

    // Verify it's not already allocated on-chain
    const connection = this.solanaService.getConnection();
    const MAX_VAULT_SCAN = 100;
    const initialId = nextId;
    while (true) {
      if (nextId > initialId + MAX_VAULT_SCAN) {
        throw new InternalServerErrorException(
          `Could not find available vault ID after scanning ${MAX_VAULT_SCAN} slots`,
        );
      }
      const pda = this.solanaService.getVaultPda(assetMint, nextId);
      const account = await connection.getAccountInfo(pda);
      if (!account) break;
      this.logger.warn(
        `vault_id ${nextId} already exists on-chain, trying ${nextId + 1}`,
      );
      nextId++;
    }

    return nextId;
  }

  async buildInitializePoolTx(params: {
    poolId: string;
    authorityAddress: string;
    assetMint: string;
    managerAddress: string;
    minimumInvestment: number;
    maxStaleness: number;
    navOracle: string;
    oracleProgram: string;
    attester: string;
    attestationProgram: string;
  }): Promise<{
    transaction: string;
    correlationId: string;
    vaultPda: string;
    sharesMintPda: string;
  }> {
    const program = this.solanaService.getProgram();
    const assetMint = new PublicKey(params.assetMint);
    const manager = new PublicKey(params.managerAddress);
    const authority = new PublicKey(params.authorityAddress);

    // Auto-assign next available vault_id
    const vaultId = await this.getNextVaultId(assetMint);
    this.logger.log(
      `Auto-assigned vault_id ${vaultId} for pool ${params.poolId}`,
    );

    const vaultPda = this.solanaService.getVaultPda(assetMint, vaultId);
    // shares_mint PDA is seeded with ["shares", vault_pda]
    const [sharesMintPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.SHARES_MINT),
      vaultPda.toBuffer(),
    ]);
    // deposit_vault is an ATA: [vault, token_program, asset_mint]
    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const depositVaultPda = await getAssociatedTokenAddress(
      assetMint,
      vaultPda,
      true, // allowOwnerOffCurve — PDA is not on curve
      TOKEN_PROGRAM_ID,
    );
    // redemption_escrow PDA: ["redemption_escrow", vault]
    const [redemptionEscrowPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_ESCROW),
      vaultPda.toBuffer(),
    ]);

    const navOracle = new PublicKey(params.navOracle);
    const oracleProgram = new PublicKey(params.oracleProgram);
    const attester = new PublicKey(params.attester);
    const attestationProgram = new PublicKey(params.attestationProgram);

    const tx = await program.methods
      .initializePool(
        new TypedBN(vaultId),
        new TypedBN(params.minimumInvestment),
        new TypedBN(params.maxStaleness),
      )
      .accounts({
        authority,
        manager,
        vault: vaultPda,
        assetMint,
        sharesMint: sharesMintPda,
        depositVault: depositVaultPda,
        redemptionEscrow: redemptionEscrowPda,
        navOracle,
        oracleProgram,
        attester,
        attestationProgram,
        assetTokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    // Serialize the transaction BEFORE emitting the event to prevent
    // event log / chain divergence if serialization fails (H7)
    const transaction = await this.serializeUnsignedTx(tx, authority);

    // Save vault_id and on_chain_address so the webhook can match this pool
    const client = this.supabaseService.getClient();
    const { error: updateError } = await client
      .from('pools')
      .update({
        vault_id: vaultId,
        on_chain_address: vaultPda.toBase58(),
      })
      .eq('id', params.poolId);
    if (updateError) {
      this.logger.error(
        `Failed to save vault_id/on_chain_address for pool ${params.poolId}: ${updateError.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to save pool deployment data. Please retry.',
      );
    }

    await this.eventService.emit({
      event_type: 'pool.deployment_initiated',
      correlation_id: params.poolId,
      actor_id: params.authorityAddress,
      actor_type: 'admin',
      target_type: 'pool',
      target_id: params.poolId,
      payload: {
        vault_id: vaultId,
        vault_pda: vaultPda.toBase58(),
        shares_mint_pda: sharesMintPda.toBase58(),
      },
    });

    return {
      transaction,
      correlationId: params.poolId,
      vaultPda: vaultPda.toBase58(),
      sharesMintPda: sharesMintPda.toBase58(),
    };
  }

  /**
   * Build unsigned open_investment_window tx. Manager signs.
   */
  async buildOpenWindowTx(params: {
    poolId: string;
    managerAddress: string;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda } = await this.getPoolVaultParams(params.poolId);
    const manager = new PublicKey(params.managerAddress);

    const tx = await program.methods
      .openInvestmentWindow()
      .accounts({ vault: vaultPda, manager })
      .transaction();

    return {
      transaction: await this.serializeUnsignedTx(tx, manager),
      correlationId: params.poolId,
    };
  }

  /**
   * Build unsigned close_investment_window tx. Manager signs.
   */
  async buildCloseWindowTx(params: {
    poolId: string;
    managerAddress: string;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda } = await this.getPoolVaultParams(params.poolId);
    const manager = new PublicKey(params.managerAddress);

    const tx = await program.methods
      .closeInvestmentWindow()
      .accounts({ vault: vaultPda, manager })
      .transaction();

    return {
      transaction: await this.serializeUnsignedTx(tx, manager),
      correlationId: params.poolId,
    };
  }

  /**
   * Build unsigned update_attester tx. Authority signs.
   */
  async buildUpdateAttesterTx(params: {
    poolId: string;
    authorityAddress: string;
    newAttester: string;
    newAttestationProgram: string;
  }): Promise<{ transaction: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda } = await this.getPoolVaultParams(params.poolId);
    const authority = new PublicKey(params.authorityAddress);

    const tx = await program.methods
      .updateAttester(
        new PublicKey(params.newAttester),
        new PublicKey(params.newAttestationProgram),
      )
      .accounts({ authority, vault: vaultPda })
      .transaction();

    return { transaction: await this.serializeUnsignedTx(tx, authority) };
  }

  // ─── Freeze / Unfreeze ─────────────────────────────────────────────

  /**
   * freeze_account — Manager signs. Prevents investor from depositing/redeeming.
   */
  async buildFreezeAccountTx(params: {
    poolId: string;
    managerAddress: string;
    investorAddress: string;
  }): Promise<{ transaction: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda } = await this.getPoolVaultParams(params.poolId);
    const manager = new PublicKey(params.managerAddress);
    const investor = new PublicKey(params.investorAddress);
    const frozenAccountPda = this.deriveFrozenCheckPda(vaultPda, investor);

    const tx = await program.methods
      .freezeAccount()
      .accounts({
        manager,
        vault: vaultPda,
        investor,
        frozenAccount: frozenAccountPda,
      })
      .transaction();

    return { transaction: await this.serializeUnsignedTx(tx, manager) };
  }

  /**
   * unfreeze_account — Manager signs.
   */
  async buildUnfreezeAccountTx(params: {
    poolId: string;
    managerAddress: string;
    investorAddress: string;
  }): Promise<{ transaction: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda } = await this.getPoolVaultParams(params.poolId);
    const manager = new PublicKey(params.managerAddress);
    const investor = new PublicKey(params.investorAddress);
    const frozenAccountPda = this.deriveFrozenCheckPda(vaultPda, investor);

    const tx = await program.methods
      .unfreezeAccount()
      .accounts({
        manager,
        vault: vaultPda,
        frozenAccount: frozenAccountPda,
      })
      .transaction();

    return { transaction: await this.serializeUnsignedTx(tx, manager) };
  }

  // ─── Investment flow ───────────────────────────────────────────────

  /**
   * Build unsigned request_deposit tx. Investor signs.
   * Creates investor deposit token ATA if it doesn't exist yet.
   *
   * Pre-checks:
   * - Rejects with 409 if an InvestmentRequest PDA already exists (one per investor per pool)
   */
  async buildRequestDepositTx(params: {
    poolId: string;
    investorAddress: string;
    amount: number;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const investor = new PublicKey(params.investorAddress);

    // Check for existing pending request
    const existing = await this.solanaService.fetchInvestmentRequest(
      vaultPda,
      investor,
    );
    if (existing) {
      const status = Object.keys(existing.status)[0];
      if (status === 'Pending') {
        throw new ConflictException(
          'You already have a pending investment request for this pool. Cancel it first or wait for manager decision.',
        );
      }
      // TODO: SVS-11 program uses `init` for InvestmentRequest PDA but never closes it
      // after approval/rejection/cancellation. This blocks repeat deposits.
      //
      // Program fix needed (lib.rs):
      //   - approve_deposit: add `close = investor` to investment_request account constraint
      //   - reject_deposit:  add `close = investor` to investment_request account constraint
      //   - cancel_deposit:  add `close = investor` to investment_request account constraint
      //
      // Same issue exists for RedemptionRequest PDA:
      //   - approve_redeem:  add `close = investor` to redemption_request account constraint
      //   - cancel_redeem:   add `close = investor` to redemption_request account constraint
      //   - claim_redeem:    add `close = investor` to redemption_request account constraint
      //
      // Once the program closes PDAs on terminal states, remove this guard.
      throw new ConflictException(
        'You need to claim your approved deposit before making a new investment request.',
      );
    }

    const [investmentRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.INVESTMENT_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    const frozenCheck = await this.resolveFrozenCheck(vaultPda, investor);

    // Build tx with ATA creation if needed
    const tx = new Transaction();
    const investorTokenAccount = await this.ensureAta(
      tx,
      investor,
      assetMint,
      investor,
    );

    const depositIx = await program.methods
      .requestDeposit(new TypedBN(params.amount))
      .accounts({
        investor,
        vault: vaultPda,
        investmentRequest: investmentRequestPda,
        investorTokenAccount,
        depositVault: vaultState.depositVault,
        assetMint,
        attestation: this.solanaService.getAttestationPda(
          vaultState.attester,
          investor,
        ),
        frozenCheck,
        assetTokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    tx.add(depositIx);

    const correlationId = investmentRequestPda.toBase58();

    return {
      transaction: await this.serializeUnsignedTx(tx, investor),
      correlationId,
    };
  }

  /**
   * Build unsigned approve_deposit tx. Manager signs.
   * Creates investor's share token ATA (Token-2022) if it doesn't exist yet.
   */
  async buildApproveDepositTx(params: {
    poolId: string;
    managerAddress: string;
    investorAddress: string;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const manager = new PublicKey(params.managerAddress);
    const investor = new PublicKey(params.investorAddress);

    const [investmentRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.INVESTMENT_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    const [sharesMintPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.SHARES_MINT),
      vaultPda.toBuffer(),
    ]);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    const frozenCheck = await this.resolveFrozenCheck(vaultPda, investor);

    // Ensure investor has a share token ATA (Token-2022, manager pays)
    const tx = new Transaction();
    const _investorShareAccount = await this.ensureAta(
      tx,
      investor,
      sharesMintPda,
      manager,
      TOKEN_2022_PROGRAM_ID,
    );

    const approveIx = await program.methods
      .approveDeposit()
      .accounts({
        manager,
        vault: vaultPda,
        investmentRequest: investmentRequestPda,
        investor,
        navOracle: vaultState.navOracle,
        attestation: this.solanaService.getAttestationPda(
          vaultState.attester,
          investor,
        ),
        frozenCheck: frozenCheck,
      })
      .instruction();
    tx.add(approveIx);

    const correlationId = investmentRequestPda.toBase58();

    // Serialize the transaction BEFORE emitting the event to prevent
    // event log / chain divergence if serialization fails (H7)
    const transaction = await this.serializeUnsignedTx(tx, manager);

    await this.eventService.emit({
      event_type: 'investment.approved',
      correlation_id: correlationId,
      actor_id: params.managerAddress,
      actor_type: 'manager',
      target_type: 'pool',
      target_id: params.poolId,
      payload: { investor: params.investorAddress },
      chain_confirmed: false,
    });

    return {
      transaction,
      correlationId,
    };
  }

  /**
   * Build unsigned reject_deposit tx. Manager signs.
   * Returns locked deposit tokens to investor.
   */
  async buildRejectDepositTx(params: {
    poolId: string;
    managerAddress: string;
    investorAddress: string;
    reasonCode: number; // 0=below_minimum, 1=kyc_expired, 2=window_closed, 3=qualification, 4=discretion
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const manager = new PublicKey(params.managerAddress);
    const investor = new PublicKey(params.investorAddress);

    const [investmentRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.INVESTMENT_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const investorTokenAccount = await getAssociatedTokenAddress(
      assetMint,
      investor,
    );

    const tx = await program.methods
      .rejectDeposit(params.reasonCode)
      .accounts({
        manager,
        vault: vaultPda,
        investmentRequest: investmentRequestPda,
        investor,
        depositVault: vaultState.depositVault,
        investorTokenAccount,
        assetMint,
        assetTokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return {
      transaction: await this.serializeUnsignedTx(tx, manager),
      correlationId: investmentRequestPda.toBase58(),
    };
  }

  /**
   * Build unsigned cancel_deposit tx. Investor signs.
   * Only allowed while request status is Pending.
   */
  async buildCancelDepositTx(params: {
    poolId: string;
    investorAddress: string;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const investor = new PublicKey(params.investorAddress);

    const [investmentRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.INVESTMENT_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const investorTokenAccount = await getAssociatedTokenAddress(
      assetMint,
      investor,
    );

    const tx = await program.methods
      .cancelDeposit()
      .accounts({
        investor,
        vault: vaultPda,
        investmentRequest: investmentRequestPda,
        depositVault: vaultState.depositVault,
        investorTokenAccount,
        assetMint,
        assetTokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return {
      transaction: await this.serializeUnsignedTx(tx, investor),
      correlationId: investmentRequestPda.toBase58(),
    };
  }

  /**
   * Build unsigned claim_deposit tx. Investor signs.
   * Claims approved shares and closes the InvestmentRequest PDA,
   * allowing the investor to deposit again.
   */
  async buildClaimDepositTx(params: {
    poolId: string;
    investorAddress: string;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda } = await this.getPoolVaultParams(params.poolId);
    const investor = new PublicKey(params.investorAddress);

    const [investmentRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.INVESTMENT_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    const [sharesMintPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.SHARES_MINT),
      vaultPda.toBuffer(),
    ]);

    const tx = new Transaction();
    const investorSharesAccount = await this.ensureAta(
      tx,
      investor,
      sharesMintPda,
      investor,
      TOKEN_2022_PROGRAM_ID,
    );

    const claimIx = await program.methods
      .claimDeposit()
      .accounts({
        investor,
        vault: vaultPda,
        investmentRequest: investmentRequestPda,
        sharesMint: sharesMintPda,
        investorSharesAccount,
        token2022Program: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
    tx.add(claimIx);

    return {
      transaction: await this.serializeUnsignedTx(tx, investor),
      correlationId: investmentRequestPda.toBase58(),
    };
  }

  // ─── Redemption flow ───────────────────────────────────────────────

  /**
   * Build unsigned request_redeem tx. Investor signs.
   * Locks shares in redemption escrow.
   *
   * Pre-checks:
   * - Rejects with 409 if a RedemptionRequest PDA already exists
   */
  async buildRequestRedeemTx(params: {
    poolId: string;
    investorAddress: string;
    shares: number;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const investor = new PublicKey(params.investorAddress);

    // Check for existing pending redemption
    const [existingPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    try {
      const existing =
        await this.solanaService.accounts.redemptionRequest.fetch(existingPda);
      if (existing && Object.keys(existing.status)[0] === 'Pending') {
        throw new ConflictException(
          'You already have a pending redemption request for this pool.',
        );
      }
    } catch (e) {
      if (e instanceof ConflictException) throw e;
      // Account not found is expected (no existing request) — only swallow that
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (
        !errorMessage.includes('Account does not exist') &&
        !errorMessage.includes('Could not find')
      ) {
        this.logger.error('Failed to check existing redemption request', e);
        throw new InternalServerErrorException(
          'Failed to verify redemption eligibility',
        );
      }
    }

    const [sharesMintPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.SHARES_MINT),
      vaultPda.toBuffer(),
    ]);
    const [redemptionRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    const [redemptionEscrowPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_ESCROW),
      vaultPda.toBuffer(),
    ]);

    const frozenCheck = await this.resolveFrozenCheck(vaultPda, investor);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const investorSharesAccount = await getAssociatedTokenAddress(
      sharesMintPda,
      investor,
      true,
      TOKEN_2022_PROGRAM_ID,
    );

    const tx = await program.methods
      .requestRedeem(new TypedBN(params.shares))
      .accounts({
        investor,
        vault: vaultPda,
        redemptionRequest: redemptionRequestPda,
        sharesMint: sharesMintPda,
        investorSharesAccount,
        redemptionEscrow: redemptionEscrowPda,
        attestation: this.solanaService.getAttestationPda(
          vaultState.attester,
          investor,
        ),
        frozenCheck: frozenCheck,
      })
      .transaction();

    const correlationId = redemptionRequestPda.toBase58();

    return {
      transaction: await this.serializeUnsignedTx(tx, investor),
      correlationId,
    };
  }

  /**
   * Build unsigned approve_redeem tx. Manager signs.
   * Burns shares from escrow, moves deposit tokens to claimable_tokens account.
   */
  async buildApproveRedeemTx(params: {
    poolId: string;
    managerAddress: string;
    investorAddress: string;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const manager = new PublicKey(params.managerAddress);
    const investor = new PublicKey(params.investorAddress);

    const [redemptionRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    const [sharesMintPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.SHARES_MINT),
      vaultPda.toBuffer(),
    ]);
    const [redemptionEscrowPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_ESCROW),
      vaultPda.toBuffer(),
    ]);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    // claimable_tokens ATA for the investor
    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const claimableTokensPda = await getAssociatedTokenAddress(
      assetMint,
      investor,
      true,
      TOKEN_PROGRAM_ID,
    );

    const frozenCheck = await this.resolveFrozenCheck(vaultPda, investor);

    const tx = await program.methods
      .approveRedeem()
      .accounts({
        manager,
        vault: vaultPda,
        redemptionRequest: redemptionRequestPda,
        investor,
        sharesMint: sharesMintPda,
        redemptionEscrow: redemptionEscrowPda,
        depositVault: vaultState.depositVault,
        assetMint,
        claimableTokens: claimableTokensPda,
        navOracle: vaultState.navOracle,
        attestation: this.solanaService.getAttestationPda(
          vaultState.attester,
          investor,
        ),
        frozenCheck: frozenCheck,
        assetTokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    const correlationId = redemptionRequestPda.toBase58();

    // Serialize the transaction BEFORE emitting the event to prevent
    // event log / chain divergence if serialization fails (H7)
    const transaction = await this.serializeUnsignedTx(tx, manager);

    await this.eventService.emit({
      event_type: 'withdrawal.approved',
      correlation_id: correlationId,
      actor_id: params.managerAddress,
      actor_type: 'manager',
      target_type: 'pool',
      target_id: params.poolId,
      payload: { investor: params.investorAddress },
      chain_confirmed: false,
    });

    return {
      transaction,
      correlationId,
    };
  }

  /**
   * Build unsigned cancel_redeem tx. Investor signs.
   * Returns locked shares from escrow to investor.
   */
  async buildCancelRedeemTx(params: {
    poolId: string;
    investorAddress: string;
  }): Promise<{ transaction: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda } = await this.getPoolVaultParams(params.poolId);
    const investor = new PublicKey(params.investorAddress);

    const [sharesMintPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.SHARES_MINT),
      vaultPda.toBuffer(),
    ]);
    const [redemptionRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    const [redemptionEscrowPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_ESCROW),
      vaultPda.toBuffer(),
    ]);

    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const investorSharesAccount = await getAssociatedTokenAddress(
      sharesMintPda,
      investor,
      true,
      TOKEN_2022_PROGRAM_ID,
    );

    const tx = await program.methods
      .cancelRedeem()
      .accounts({
        investor,
        vault: vaultPda,
        redemptionRequest: redemptionRequestPda,
        sharesMint: sharesMintPda,
        investorSharesAccount,
        redemptionEscrow: redemptionEscrowPda,
      })
      .transaction();

    return { transaction: await this.serializeUnsignedTx(tx, investor) };
  }

  /**
   * Build unsigned claim_redeem tx. Investor signs.
   * Transfers claimable deposit tokens to investor wallet.
   */
  async buildClaimRedemptionTx(params: {
    poolId: string;
    investorAddress: string;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const investor = new PublicKey(params.investorAddress);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    const [redemptionRequestPda] = this.solanaService.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);

    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const claimableTokensPda = await getAssociatedTokenAddress(
      assetMint,
      investor,
      true,
      TOKEN_PROGRAM_ID,
    );

    const tx = new Transaction();
    const investorTokenAccount = await this.ensureAta(
      tx,
      investor,
      assetMint,
      investor,
    );

    const claimIx = await program.methods
      .claimRedeem()
      .accounts({
        investor,
        vault: vaultPda,
        redemptionRequest: redemptionRequestPda,
        assetMint,
        claimableTokens: claimableTokensPda,
        investorTokenAccount,
        assetTokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    tx.add(claimIx);

    return {
      transaction: await this.serializeUnsignedTx(tx, investor),
      correlationId: redemptionRequestPda.toBase58(),
    };
  }

  // ─── Draw down & Repayment ─────────────────────────────────────────

  /**
   * Build unsigned draw_down tx. Manager signs.
   * Withdraws capital from the vault for off-chain deployment.
   */
  async buildDrawDownTx(params: {
    poolId: string;
    managerAddress: string;
    amount: number;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const manager = new PublicKey(params.managerAddress);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    const tx = new Transaction();
    const destination = await this.ensureAta(tx, manager, assetMint, manager);

    const drawDownIx = await program.methods
      .drawDown(new TypedBN(params.amount))
      .accounts({
        manager,
        vault: vaultPda,
        depositVault: vaultState.depositVault,
        destination,
        assetMint,
        assetTokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    tx.add(drawDownIx);

    return {
      transaction: await this.serializeUnsignedTx(tx, manager),
      correlationId: params.poolId,
    };
  }

  /**
   * Build unsigned repay tx. Manager signs.
   * Returns deposit tokens to the pool vault, increasing totalAssets.
   */
  async buildRepayTx(params: {
    poolId: string;
    managerAddress: string;
    amount: number;
  }): Promise<{ transaction: string; correlationId: string }> {
    const program = this.solanaService.getProgram();
    const { vaultPda, assetMint, vaultId } = await this.getPoolVaultParams(
      params.poolId,
    );
    const manager = new PublicKey(params.managerAddress);

    const vaultState = await this.solanaService.fetchVault(assetMint, vaultId);
    if (!vaultState) throw new Error('Vault not found on-chain');

    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const managerTokenAccount = await getAssociatedTokenAddress(
      assetMint,
      manager,
    );

    const tx = await program.methods
      .repay(new TypedBN(params.amount))
      .accounts({
        manager,
        vault: vaultPda,
        managerTokenAccount,
        depositVault: vaultState.depositVault,
        assetMint,
        assetTokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return {
      transaction: await this.serializeUnsignedTx(tx, manager),
      correlationId: params.poolId,
    };
  }

  // ─── Confirmation (called by Helius webhook) ──────────────────────

  async confirmDeployment(
    poolId: string,
    solTxId: string,
    poolPdaAddress: string,
  ) {
    await this.eventService.emit({
      event_type: 'pool.deployed',
      correlation_id: poolId,
      actor_id: 'system',
      actor_type: 'system',
      target_type: 'pool',
      target_id: poolId,
      payload: { on_chain_address: poolPdaAddress },
      chain_tx_id: solTxId,
      chain_confirmed: true,
    });
  }

  // ─── Manager approval queue queries ────────────────────────────────

  async getInvestmentRequests(
    poolId: string,
    status?: string,
  ): Promise<InvestmentRequestSummary[]> {
    const supabase = this.supabaseService.getClient();

    // Get pool's asset mint for decimal conversion
    const { data: pool } = await supabase
      .from('pools')
      .select('asset_mint')
      .eq('id', poolId)
      .single();
    const token = getTokenMeta(pool?.asset_mint ?? '');

    const query = supabase
      .from('execution_events')
      .select('correlation_id, actor_id, payload, created_at, event_type')
      .eq('target_id', poolId)
      .in('event_type', [
        'investment.requested',
        'investment.settled',
        'investment.rejected',
        'investment.cancelled',
      ])
      .order('created_at', { ascending: false });

    const { data: events } = await query;
    if (!events?.length) return [];

    const requestMap = new Map<string, InvestmentRequestSummary>();
    for (const event of events) {
      if (!requestMap.has(event.correlation_id)) {
        const payload = event.payload as Record<string, unknown> | null;
        requestMap.set(event.correlation_id, {
          correlationId: event.correlation_id,
          investorAddress: event.actor_id,
          amount: ((payload?.amount as number) || 0) / 10 ** token.decimals,
          latestEvent: event.event_type,
          createdAt: event.created_at,
        });
      }
    }

    const requests = Array.from(requestMap.values());
    // Default to pending — settled/rejected/cancelled belong in transaction history
    if (!status || status === 'pending') {
      return requests.filter((r) => r.latestEvent === 'investment.requested');
    }
    return requests;
  }

  async getRedemptionRequests(
    poolId: string,
    status?: string,
  ): Promise<RedemptionRequestSummary[]> {
    const supabase = this.supabaseService.getClient();

    const { data: events } = await supabase
      .from('execution_events')
      .select('correlation_id, actor_id, payload, created_at, event_type')
      .eq('target_id', poolId)
      .in('event_type', [
        'withdrawal.requested',
        'withdrawal.settled',
        'withdrawal.claimed',
      ])
      .order('created_at', { ascending: false });

    if (!events?.length) return [];

    const requestMap = new Map<string, RedemptionRequestSummary>();
    for (const event of events) {
      if (!requestMap.has(event.correlation_id)) {
        const payload = event.payload as Record<string, unknown> | null;
        requestMap.set(event.correlation_id, {
          correlationId: event.correlation_id,
          investorAddress: event.actor_id,
          shares:
            ((payload?.shares as number) || 0) /
            10 ** SOLANA_CONFIG.SHARE_DECIMALS,
          latestEvent: event.event_type,
          createdAt: event.created_at,
        });
      }
    }

    const requests = Array.from(requestMap.values());
    if (status === 'pending') {
      return requests.filter((r) => r.latestEvent === 'withdrawal.requested');
    }
    return requests;
  }
}
