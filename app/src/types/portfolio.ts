// ── Portfolio Summary (GET /portfolio/summary) ──────────────────────────

export interface PortfolioPosition {
  poolId: string;
  poolTitle: string;
  logoPath: string | null;
  pipelineKey: string;
  assetClass: string;
  poolType: string;
  invested: number;
  pricePerShare: number | null;
  currentValue: number;
  share: number;
  ltmReturn: number | null;
  creditScore: number | null;
  ratingTier: number | null;
  depositCurrency: string;
}

export interface PortfolioAllocation {
  assetClass: string;
  percentage: number;
  amount: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  unrealizedPnl: number;
  weightedAvgReturn: number;
  weightedCreditScore: number | null;
  positions: PortfolioPosition[];
  allocation: PortfolioAllocation[];
}
// ── Legacy types preserved for manager hooks ────────────────────────────
// These are still imported by:
//   - app/src/hooks/managers/useManagerTransactions.ts (TransactionsResponse)
//   - app/src/hooks/managers/useManagerInvestments.ts (HoldingsResponse)
//   - app/src/hooks/managers/useManagerHoldings.ts (HoldingsResponse)

import type { PaginationInfo } from "./pagination";

export interface TokenAmount {
  amount: string;
  decimals: number;
  symbol: string;
}

export interface Transaction {
  id: string;
  tag: string;
  timestamp: number;
  from: string;
  to: string;
  amount: string;
  token: TokenAmount;
}

export interface TransactionsResponse {
  data: Transaction[];
  pagination: PaginationInfo;
}

export interface Holding {
  id: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  tokenAddress: string;
  valueUSD: number;
}

export interface HoldingsResponse {
  data: Holding[];
  pagination: PaginationInfo;
}
