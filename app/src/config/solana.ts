import { clusterApiUrl } from "@solana/web3.js";

export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") ||
  "devnet";
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

/**
 * On-chain constants — must match backend/src/blockchain/solana-config/index.ts
 */
export const SOLANA_CONFIG = {
  SVS11_PROGRAM_ID: "Bf17gDR2JdKTWdoTWK3Va9YQtkpePRAAVxMCaokj8ZFW",

  USDC_MINT: {
    devnet: "GAN8FMweFeu2LFNFarggHifiUW8muyGJK8S2dGc6vCTP",
    "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
} as const;

/** Get the USDC mint address for the current network */
export function getUsdcMint(): string {
  return SOLANA_CONFIG.USDC_MINT[SOLANA_NETWORK];
}

/** Token metadata keyed by mint address */
export interface TokenMeta {
  symbol: string;
  decimals: number;
}

const TOKEN_REGISTRY: Record<string, TokenMeta> = {
  [SOLANA_CONFIG.USDC_MINT.devnet]: { symbol: "USDC", decimals: 6 },
  [SOLANA_CONFIG.USDC_MINT["mainnet-beta"]]: { symbol: "USDC", decimals: 6 },
};

/** Look up token metadata by mint address */
export function getTokenMeta(mint: string): TokenMeta {
  return TOKEN_REGISTRY[mint] ?? { symbol: "TOKEN", decimals: 6 };
}

/** Share token decimals (Token-2022 shares always use 6 decimals) */
export const SHARE_DECIMALS = 6;
