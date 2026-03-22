import type { Pool } from "@/services/api";
import type { DBUserData } from "@/types/auth";

/**
 * Mock blockchain addresses for testing.
 * All addresses are valid Solana base58 format (mock values).
 */
export const MOCK_ADDRESSES = {
  USER: "User1111111111111111111111111111111111111111",
  ACCOUNT: "SmartAcct11111111111111111111111111111111111",
  POOL: "Pool1111111111111111111111111111111111111111",
  TOKEN_USDC: "UsdcMint1111111111111111111111111111111111111",
  KYC_CONTRACT: "KycContract111111111111111111111111111111111",
  MANAGER: "Manager11111111111111111111111111111111111111",
  REGISTRY: "Registry11111111111111111111111111111111111111",
} as const;

/**
 * Mock USDC token configuration.
 */
export const MOCK_TOKEN = {
  name: "USD Coin",
  symbol: "USDC",
  address: MOCK_ADDRESSES.TOKEN_USDC,
  decimals: 6,
  logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
};

/**
 * Mock user data matching DBUserData type.
 * Represents a fully authenticated individual user.
 */
export const MOCK_USER: DBUserData = {
  id: "user-123",
  account: MOCK_ADDRESSES.ACCOUNT,
  referral_id: "ref-123",
  notifications: {
    transactions: true,
    opportunities: true,
    news: false,
  },
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

/**
 * Mock pool data matching Pool type (flat Supabase schema).
 * Represents a pool in "approved" state ready for deployment.
 */
export const MOCK_POOL: Pool = {
  id: "pool-123",
  on_chain_address: MOCK_ADDRESSES.POOL,
  version: 1,

  // Term Sheet (flat)
  title: "Test Credit Pool",
  logo_path: "/logos/test-pool.png",
  asset_class: "DeFi Credit",
  share_class: "senior",
  currency: "usdc",
  documents: [
    {
      title: "Prospectus",
      path: "/docs/test-prospectus.pdf",
    },
  ],
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",

  // Manager
  manager_address: MOCK_ADDRESSES.MANAGER,

  // Pool type & visibility
  pool_type: "fidc",
  is_visible: true,

  // Pool parameters
  fund_size: 1000000000000,
  target_return_rate: 850,
  minimum_investment: 100000000000,
  investment_horizon_value: 7776000,
  investment_horizon_unit: "months" as const,
  start_time: new Date(Math.floor(Date.now() / 1000) * 1000).toISOString(),

  management_fee_rate: 100,
};

/**
 * Creates a mock pool with custom overrides.
 */
export function createMockPool(overrides: Partial<Pool> = {}): Pool {
  return {
    ...MOCK_POOL,
    ...overrides,
  };
}

/**
 * Creates a mock user with custom overrides.
 */
export function createMockUser(
  overrides: Partial<DBUserData> = {},
): DBUserData {
  return {
    ...MOCK_USER,
    ...overrides,
    notifications: overrides.notifications ?? MOCK_USER.notifications,
  };
}
