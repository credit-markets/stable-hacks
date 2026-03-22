"use client";

import type { InvestmentRequest } from "@/hooks/pools/useInvestmentRequests";
import type { RedemptionRequest } from "@/hooks/useRedemptionRequests";
import { cx, styles } from "@/lib/styleClasses";

interface FlowSummaryProps {
  investmentRequests: InvestmentRequest[];
  redemptionRequests: RedemptionRequest[];
  tokenSymbol?: string;
}

export function FlowSummary({
  investmentRequests,
  redemptionRequests,
  tokenSymbol = "USDC",
}: FlowSummaryProps) {
  const pendingInvestments = investmentRequests.filter(
    (r) => r.latestEvent === "investment.requested",
  );
  const pendingRedemptions = redemptionRequests.filter(
    (r) => r.latestEvent === "withdrawal.requested",
  );

  const totalInflow = pendingInvestments.reduce(
    (sum, req) => sum + req.amount,
    0,
  );
  // Redemption requests don't carry an amount — they're in shares
  // For outflow display, we'd need NAV per share to convert.
  // For now, show share count.
  const totalOutflowShares = pendingRedemptions.reduce(
    (sum, req) => sum + req.shares,
    0,
  );

  return (
    <div className="px-5 py-5 grid grid-cols-2 border-b border-subtle">
      {/* Pending Inflow */}
      <div className="pr-4">
        <span className={cx(styles.labelPrimary, "block mb-1")}>
          PENDING INFLOW
        </span>
        <span className={cx(styles.valueLg, "block text-[#1A1A1A]")}>
          {totalInflow.toLocaleString()} {tokenSymbol}
        </span>
        <span className={cx(styles.bodySm, "text-text-muted block mt-1")}>
          {pendingInvestments.length} request
          {pendingInvestments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Pending Outflow */}
      <div className="pl-4 border-l border-subtle">
        <span className={cx(styles.labelPrimary, "block mb-1")}>
          PENDING OUTFLOW
        </span>
        <span className={cx(styles.valueLg, "block text-[#1A1A1A]")}>
          {totalOutflowShares.toLocaleString()} shares
        </span>
        <span className={cx(styles.bodySm, "text-text-muted block mt-1")}>
          {pendingRedemptions.length} request
          {pendingRedemptions.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
