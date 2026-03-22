import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor';
import { SOLANA_CONFIG, vaultIdToBytes } from './solana-config';
import { SVS11_IDL, MOCK_ORACLE_IDL, MOCK_SAS_IDL } from './solana-config/idl';

// === SVS-11 Account Shapes ===

export interface CreditVaultAccount {
  authority: PublicKey;
  manager: PublicKey;
  assetMint: PublicKey;
  sharesMint: PublicKey;
  depositVault: PublicKey;
  redemptionEscrow: PublicKey;
  navOracle: PublicKey;
  oracleProgram: PublicKey;
  maxStaleness: BN;
  attester: PublicKey;
  attestationProgram: PublicKey;
  vaultId: BN;
  totalAssets: BN;
  totalShares: BN;
  totalPendingDeposits: BN;
  minimumInvestment: BN;
  investmentWindowOpen: boolean;
  decimalsOffset: number;
  bump: number;
  redemptionEscrowBump: number;
  paused: boolean;
  reserved: number[];
}

export interface InvestmentRequestAccount {
  investor: PublicKey;
  vault: PublicKey;
  amountLocked: BN;
  sharesClaimable: BN;
  status: Record<string, object>;
  requestedAt: BN;
  fulfilledAt: BN;
  bump: number;
}

export interface RedemptionRequestAccount {
  investor: PublicKey;
  vault: PublicKey;
  sharesLocked: BN;
  assetsClaimable: BN;
  status: Record<string, object>;
  requestedAt: BN;
  fulfilledAt: BN;
  bump: number;
}

export interface FrozenAccountState {
  investor: PublicKey;
  vault: PublicKey;
  frozenBy: PublicKey;
  frozenAt: BN;
  bump: number;
}

export interface OracleDataAccount {
  pricePerShare: BN;
  updatedAt: BN;
}

// === Account fetcher helpers ===

interface AccountFetcher<T> {
  fetch(address: PublicKey): Promise<T>;
}

interface Svs11Accounts {
  creditVault: AccountFetcher<CreditVaultAccount>;
  investmentRequest: AccountFetcher<InvestmentRequestAccount>;
  redemptionRequest: AccountFetcher<RedemptionRequestAccount>;
  frozenAccount: AccountFetcher<FrozenAccountState>;
}

@Injectable()
export class SolanaService implements OnModuleInit {
  private readonly logger = new Logger(SolanaService.name);
  private connection: Connection;
  private svs11Program: Program;
  private oracleProgram: Program;
  private mockSasProgram: Program;
  private operatorKeypair: Keypair | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    try {
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      let rpcUrl: string;
      if (nodeEnv === 'production') {
        rpcUrl = this.configService.getOrThrow<string>('SOLANA_RPC_URL');
      } else {
        rpcUrl =
          this.configService.get<string>('SOLANA_RPC_URL') ||
          'https://api.devnet.solana.com';
        if (!this.configService.get<string>('SOLANA_RPC_URL')) {
          this.logger.warn('SOLANA_RPC_URL not set — falling back to devnet');
        }
      }

      this.connection = new Connection(rpcUrl, 'confirmed');

      const operatorPk = this.configService.get<string>('SOLANA_OPERATOR_PK');
      if (operatorPk) {
        try {
          this.operatorKeypair = Keypair.fromSecretKey(
            Buffer.from(JSON.parse(operatorPk)),
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `SOLANA_OPERATOR_PK invalid — read-only mode. Error: ${message}`,
          );
        }
      }

      const wallet = new Wallet(this.operatorKeypair || Keypair.generate());
      const provider = new AnchorProvider(this.connection, wallet, {
        commitment: 'confirmed',
      });

      // SVS-11 program — address from SOLANA_CONFIG constants
      const svs11Id = SOLANA_CONFIG.SVS11_PROGRAM_ID;
      const idlWithAddress = { ...SVS11_IDL, address: svs11Id };
      this.svs11Program = new Program(idlWithAddress, provider);

      // Mock Oracle program — address from SOLANA_CONFIG constants
      const oracleId = SOLANA_CONFIG.MOCK_ORACLE_PROGRAM_ID;
      if (oracleId) {
        const oracleIdlWithAddress = { ...MOCK_ORACLE_IDL, address: oracleId };
        this.oracleProgram = new Program(oracleIdlWithAddress, provider);
      }

      // Mock SAS (attestation) program
      const sasId = SOLANA_CONFIG.MOCK_SAS_PROGRAM_ID;
      if (sasId) {
        const sasIdlWithAddress = { ...MOCK_SAS_IDL, address: sasId };
        this.mockSasProgram = new Program(sasIdlWithAddress, provider);
      }

      this.logger.log(
        `Solana connected: ${rpcUrl || 'devnet'}, SVS-11: ${svs11Id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Solana: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProgram(): Program {
    if (!this.svs11Program) {
      throw new Error('SVS-11 Program not initialized');
    }
    return this.svs11Program;
  }

  getOracleProgram(): Program {
    if (!this.oracleProgram) {
      throw new Error('Oracle Program not initialized');
    }
    return this.oracleProgram;
  }

  get accounts(): Svs11Accounts {
    return this.getProgram().account as unknown as Svs11Accounts;
  }

  getOperatorKeypair(): Keypair | null {
    return this.operatorKeypair;
  }

  getUsdcMint(): string {
    return SOLANA_CONFIG.USDC_MINT_DEVNET;
  }

  /** Derive the mock oracle singleton PDA: seeds = ["oracle"] */
  getOraclePda(): string {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('oracle')],
      this.getOracleProgram().programId,
    );
    return pda.toBase58();
  }

  /** Derive a PDA for the SVS-11 program */
  findPda(seeds: (Buffer | Uint8Array)[]): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(seeds, this.getProgram().programId);
  }

  /** Derive CreditVault PDA: ["credit_vault", asset_mint, vault_id_le_bytes] */
  getVaultPda(assetMint: PublicKey, vaultId: bigint | number): PublicKey {
    const [pda] = this.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.CREDIT_VAULT),
      assetMint.toBuffer(),
      vaultIdToBytes(vaultId),
    ]);
    return pda;
  }

  /** Read CreditVault account */
  async fetchVault(
    assetMint: PublicKey,
    vaultId: bigint | number,
  ): Promise<CreditVaultAccount | null> {
    const pda = this.getVaultPda(assetMint, vaultId);
    try {
      return await this.accounts.creditVault.fetch(pda);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('Account does not exist') ||
        message.includes('could not find account')
      ) {
        return null;
      }
      this.logger.warn(`RPC error fetching vault: ${message}`);
      throw err;
    }
  }

  /** Read InvestmentRequest account */
  async fetchInvestmentRequest(
    vaultPda: PublicKey,
    investor: PublicKey,
  ): Promise<InvestmentRequestAccount | null> {
    const [pda] = this.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.INVESTMENT_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    try {
      return await this.accounts.investmentRequest.fetch(pda);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('Account does not exist') ||
        message.includes('could not find account')
      ) {
        return null;
      }
      throw err;
    }
  }

  /** Read RedemptionRequest account */
  async fetchRedemptionRequest(
    vaultPda: PublicKey,
    investor: PublicKey,
  ): Promise<RedemptionRequestAccount | null> {
    const [pda] = this.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.REDEMPTION_REQUEST),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    try {
      return await this.accounts.redemptionRequest.fetch(pda);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('Account does not exist') ||
        message.includes('could not find account')
      ) {
        return null;
      }
      throw err;
    }
  }

  /** Read FrozenAccount state */
  async fetchFrozenAccount(
    vaultPda: PublicKey,
    investor: PublicKey,
  ): Promise<FrozenAccountState | null> {
    const [pda] = this.findPda([
      Buffer.from(SOLANA_CONFIG.SEEDS.FROZEN_ACCOUNT),
      vaultPda.toBuffer(),
      investor.toBuffer(),
    ]);
    try {
      return await this.accounts.frozenAccount.fetch(pda);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('Account does not exist') ||
        message.includes('could not find account')
      ) {
        return null;
      }
      this.logger.warn(`RPC error fetching frozen account: ${message}`);
      throw err;
    }
  }

  /** Read OracleData from mock_oracle program */
  async fetchOracleData(
    oraclePda: PublicKey,
  ): Promise<OracleDataAccount | null> {
    try {
      const accounts = this.getOracleProgram().account as unknown as {
        oracleData: { fetch(address: PublicKey): Promise<OracleDataAccount> };
      };
      return await accounts.oracleData.fetch(oraclePda);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('Account does not exist') ||
        message.includes('could not find account')
      ) {
        return null;
      }
      throw err;
    }
  }

  /** vault_id to LE bytes helper */
  vaultIdToBytes(vaultId: bigint | number): Buffer {
    return vaultIdToBytes(vaultId);
  }

  getMockSasProgram(): Program {
    if (!this.mockSasProgram) {
      throw new Error('Mock SAS Program not initialized');
    }
    return this.mockSasProgram;
  }

  /**
   * Derive attestation PDA matching on-chain seeds:
   * seeds = [b"attestation", subject, issuer, &[attestation_type]]
   *
   * - subject: the investor wallet being attested
   * - issuer: the attester identity pubkey (instruction arg, not necessarily the tx signer)
   * - attestationType: 0 = KYB
   */
  getAttestationPda(
    issuer: PublicKey,
    subject: PublicKey,
    attestationType = 0,
  ): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('attestation'),
        subject.toBuffer(),
        issuer.toBuffer(),
        Buffer.from([attestationType]),
      ],
      this.mockSasProgram.programId,
    );
    return pda;
  }
}
