/**
 * Single source of truth for all on-chain program addresses and constants.
 * Update here when redeploying programs — also update the Helius webhook
 * address list and frontend NEXT_PUBLIC_VAULT_PROGRAM_ID to match.
 */
export const SOLANA_CONFIG = {
  // ─── On-chain program addresses ────────────────────────────────
  SVS11_PROGRAM_ID: 'Bf17gDR2JdKTWdoTWK3Va9YQtkpePRAAVxMCaokj8ZFW',
  MOCK_ORACLE_PROGRAM_ID: 'EbFcZZApkGcX6LqRmzSWVLasnDM457wY4WvhJRnVjdZF',
  MOCK_SAS_PROGRAM_ID: '4azCqYgLHDRmsiR6kmYu6v5qvzamaYGqZcmx8MrnrKMc',

  // ─── Token mints ───────────────────────────────────────────────
  USDC_MINT_MAINNET: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDC_MINT_DEVNET: 'GAN8FMweFeu2LFNFarggHifiUW8muyGJK8S2dGc6vCTP',

  // ─── PDA seeds (must match on-chain program seeds exactly) ─────
  SEEDS: {
    CREDIT_VAULT: 'credit_vault',
    SHARES_MINT: 'shares',
    DEPOSIT_VAULT: 'deposit_vault',
    INVESTMENT_REQUEST: 'investment_request',
    REDEMPTION_REQUEST: 'redemption_request',
    REDEMPTION_ESCROW: 'redemption_escrow',
    FROZEN_ACCOUNT: 'frozen_account',
  },

  // ─── Solana system programs ───────────────────────────────────
  TOKEN_2022_PROGRAM_ID: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',

  // ─── Share token decimals ─────────────────────────────────────
  SHARE_DECIMALS: 6,

  // ─── Oracle configuration ──────────────────────────────────────
  ORACLE_PRICE_DECIMALS: 8,
} as const;

/** Token metadata keyed by mint address */
export interface TokenMeta {
  symbol: string;
  decimals: number;
}

export const TOKEN_REGISTRY: Record<string, TokenMeta> = {
  // USDC devnet
  [SOLANA_CONFIG.USDC_MINT_DEVNET]: { symbol: 'USDC', decimals: 6 },
  // USDC mainnet
  [SOLANA_CONFIG.USDC_MINT_MAINNET]: { symbol: 'USDC', decimals: 6 },
};

/** Look up token metadata by mint address, falling back to defaults */
export function getTokenMeta(mint: string): TokenMeta {
  return TOKEN_REGISTRY[mint] ?? { symbol: 'TOKEN', decimals: 6 };
}

/**
 * Convert a vault_id (u64) to little-endian bytes for PDA derivation.
 * SVS-11 uses vault_id: u64 instead of the old pool_id: [u8; 32].
 */
export function vaultIdToBytes(vaultId: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(vaultId));
  return buf;
}
