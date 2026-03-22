import { API_URL } from "@/constants/api";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";
import axios from "axios";

export const api = axios.create({
  baseURL: API_URL,
  // Send cookies automatically on same-site requests.
  // In production (cookie auth), the httpOnly DYNAMIC_JWT_TOKEN cookie
  // is sent by the browser — no JS access needed.
  withCredentials: true,
});

// Inject Authorization header from Dynamic Labs SDK.
// - In-app storage (Sandbox/dev): getAuthToken() reads JWT from localStorage
// - Cookie storage (production): getAuthToken() returns the token if available,
//   otherwise withCredentials sends the httpOnly cookie automatically
// Per Dynamic docs: use getAuthToken() for explicit header injection,
// rely on withCredentials for cookie-based auth.
if (typeof window !== "undefined") {
  api.interceptors.request.use((config) => {
    if (!config.headers.Authorization) {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
}

// Document type
export interface Doc {
  title: string;
  path: string;
}

// Flat pool type matching Supabase schema
export interface Pool {
  id: string;
  pipeline_key?: string;
  fund_id?: string;
  on_chain_address?: string;
  version: number;

  // Term Sheet
  title: string;
  description?: string;
  logo_path?: string;
  asset_class: string;
  asset_class_detail?: string;

  share_class: "senior" | "junior" | "mezzanine";
  share_class_description?: string;

  currency: "usd_hedged" | "brl" | "usdc";
  currency_description?: string;

  target_return_rate?: number;
  target_return_unit?: string;
  target_return_net_of_fees?: boolean;
  target_return_description?: string;

  management_fee_rate?: number;
  management_fee_unit?: string;

  investment_horizon_value?: number;
  investment_horizon_unit?: "months" | "years";

  redemption_notice_days?: number;
  redemption_format?: string;
  lockup_period_days?: number;

  subordination_level?: number;
  subordination_description?: string;

  min_rating?: string;
  max_concentration_per_debtor?: number;
  eligibility_other?: string[];

  registrar?: "cerc" | "cip" | "b3";
  registrar_detail?: string;

  minimum_investment?: number;
  fund_size?: number;

  // Investment Window
  start_time?: string;
  investment_window_open?: boolean;
  // Manager
  manager_id?: string;
  manager_address?: string;
  authority_address?: string;
  attester_address?: string;

  // Documents & Waterfall
  documents?: Doc[];
  payment_waterfall?: unknown[];

  // FX Hedge
  hedge_mechanism?: "ndf" | "b3_futures" | "options" | "none";
  hedge_description?: string;
  hedge_coverage?: number;
  hedge_counterparty?: string;
  hedge_cost_bps?: number;
  hedge_roll_frequency?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  deployed_at?: string;
  funded_at?: string;
  matured_at?: string;

  // Rejection
  rejection_reason?: string;
  rejected_by?: string;

  // Pool type & visibility
  pool_type: string;
  is_visible: boolean;
  fund_cnpj_display?: string;

  // SVS-11 on-chain
  vault_id?: number;
  asset_mint?: string;
  target_raise_amount?: number;

  // NAV oracle
  price_per_share?: number;
  nav_oracle_address?: string;

  // Responsibility chain (joined from pool_responsibilities + actors)
  pool_responsibilities?: Array<{
    id: string;
    role: string;
    actors?: { id: string; name: string; type: string };
  }>;

  // Manager info
  manager_name?: string;

  // On-chain data (populated by backend from Solana reads)
  onChainData?: {
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
  totalBorrowed?: string;
  totalRepaid?: string;
}

export interface Approval {
  status: string;
  rejectionReason?: string;
  submittedAt?: string;
  approved?: boolean;
}

// Section types for pool content
export interface TextSection {
  title: string;
  type: "text";
  content: string;
}

// Generic pool section (matches sections JSONB array elements)
export type PoolSection = {
  title: string;
  type: string;
  content?: string;
  fields?: Array<{ title: string; value: string; type: string }>;
  cards?: Array<{ title: string; description: string }>;
};

// User types (flat, matches Supabase)
export interface User {
  id: string;
  account: string;
  kyc_id?: number;
  kyc_attestation?: string;
  referral_id: string;
  referred_by?: string;
  notifications: {
    transactions: boolean;
    opportunities: boolean;
    news: boolean;
  };
  dynamic_identifier?: string | null;
  investor_classification?: string | null;
  type?: string | null;
  provider_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Manager (flat, matches Supabase)
export interface Manager {
  id: string;
  actor_id?: string;
  company_name: string;
  overview?: string;
  logo_path?: string;
  website?: string | null;
  owner_address: string;
  created_at: string;
  updated_at: string;
}

// Token
export interface Token {
  id: string;
  symbol: string;
  decimals: number;
  address: string;
  icon?: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Execution events (audit trail)
export type ActorType = "investor" | "manager" | "admin" | "system" | "partner";

export interface ExecutionEvent {
  id: string;
  event_type: string;
  correlation_id?: string;
  actor_id: string;
  actor_type: ActorType;
  target_type: string;
  target_id: string;
  payload?: Record<string, unknown>;
  chain_tx_id?: string;
  chain_confirmed: boolean;
  created_at: string;
}

// KYB summary and enriched user types
export interface KybSummary {
  legal_name: string;
  status: string;
  risk_score?: number;
  risk_band?: string;
}

export interface EnrichedUser extends User {
  kyb: KybSummary | null;
}

export interface PipelineKey {
  key: string;
  pool_type: "fidc" | "tidc";
}
