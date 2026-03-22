/**
 * Wallet-related constants for credential mapping
 * Used when converting database authorized credentials to JWT credential format
 */

/**
 * Default chain identifier for credentials
 */
export const DEFAULT_CHAIN = 'solana';

/**
 * Wallet name mappings based on wallet type
 */
export const WALLET_NAMES = {
  EOA: 'External Wallet',
  EMAIL: 'Email',
} as const;

/**
 * Wallet provider mappings based on wallet type
 */
export const WALLET_PROVIDERS = {
  EOA: 'phantom',
  EMAIL: 'dynamic',
} as const;

export type WalletName = (typeof WALLET_NAMES)[keyof typeof WALLET_NAMES];
export type WalletProvider =
  (typeof WALLET_PROVIDERS)[keyof typeof WALLET_PROVIDERS];
