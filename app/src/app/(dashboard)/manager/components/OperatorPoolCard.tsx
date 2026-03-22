"use client";

import { ProfileLogo } from "@/components/ProfileLogo";
import { useInvestmentRequests } from "@/hooks/pools/useInvestmentRequests";
import { useRedemptionRequests } from "@/hooks/useRedemptionRequests";
import { cx, styles } from "@/lib/styleClasses";
import { calculatePoolTvl, getPoolTokenSymbol } from "@/lib/utils/tvl";
import type { Pool } from "@/services/api";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface OperatorPoolCardProps {
  pool: Pool;
}

function formatTokenAmount(value: number, symbol: string): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M ${symbol}`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K ${symbol}`;
  }
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}

export function OperatorPoolCard({ pool }: OperatorPoolCardProps) {
  const tokenSymbol = getPoolTokenSymbol(pool.currency, pool.asset_mint);
  const poolTvl = calculatePoolTvl(
    pool.onChainData?.totalShares,
    pool.onChainData?.pricePerShare,
  );
  const hasTvl = poolTvl != null && poolTvl > 0;

  const pricePerShare = pool.onChainData?.pricePerShare;
  const navDisplay =
    pricePerShare != null
      ? `${Number(pricePerShare).toFixed(4)} ${tokenSymbol}`
      : "---";

  // Utilization = net outstanding / (vault balance + net outstanding)
  const netBorrowed =
    Number(pool.totalBorrowed ?? 0) - Number(pool.totalRepaid ?? 0);
  const vaultBal = Number(pool.onChainData?.depositVaultBalance ?? 0);
  const totalCapital = vaultBal + netBorrowed;
  const utilizationDisplay =
    totalCapital > 0
      ? `${((netBorrowed / totalCapital) * 100).toFixed(1)}%`
      : "---";

  const isWindowOpen =
    pool.onChainData?.investmentWindowOpen ??
    pool.investment_window_open ??
    false;

  const { data: investmentRequests } = useInvestmentRequests(pool.id);
  const { data: redemptionRequests } = useRedemptionRequests(pool.id);

  const pendingInvestments =
    investmentRequests?.filter((r) => r.latestEvent === "investment.requested")
      .length ?? 0;
  const pendingRedemptions = redemptionRequests?.length ?? 0;
  const hasPending = pendingInvestments > 0 || pendingRedemptions > 0;

  return (
    <Link href={`/manager/pools/${pool.id}`}>
      <div className={cx(styles.cardInteractive, "overflow-hidden")}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileLogo
              imageUrl={pool.logo_path ?? undefined}
              name={pool.title}
              size="sm"
              className="rounded-md"
            />
            <span className={styles.headingSm}>{pool.title}</span>
          </div>
          <span
            className={cx(
              styles.chipBase,
              isWindowOpen
                ? "border border-terminal-green text-terminal-green"
                : "border border-terminal-gray text-terminal-gray",
            )}
          >
            {isWindowOpen ? "Open" : "Closed"}
          </span>
        </div>

        {/* Metrics -- 3 columns */}
        <div className="px-5 py-4 grid grid-cols-3 gap-3">
          <div>
            <div className={styles.labelPrimary}>TVL</div>
            <div className={styles.valueMd}>
              {poolTvl != null
                ? formatTokenAmount(poolTvl, tokenSymbol)
                : "---"}
            </div>
          </div>
          <div>
            <div className={styles.labelPrimary}>NAV Price</div>
            <div className={styles.valueMd}>{navDisplay}</div>
          </div>
          <div>
            <div className={styles.labelPrimary}>Utilization</div>
            <div className={styles.valueMd}>{utilizationDisplay}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-hover border-t border-subtle flex items-center justify-between">
          <div className="flex gap-4">
            {hasPending ? (
              <>
                {pendingInvestments > 0 && (
                  <span className={styles.bodySm}>
                    <span className="font-semibold text-text-primary">
                      {pendingInvestments}
                    </span>{" "}
                    <span className="text-text-muted">
                      {pendingInvestments === 1 ? "investment" : "investments"}{" "}
                      pending
                    </span>
                  </span>
                )}
                {pendingRedemptions > 0 && (
                  <span className={styles.bodySm}>
                    <span className="font-semibold text-text-primary">
                      {pendingRedemptions}
                    </span>{" "}
                    <span className="text-text-muted">
                      {pendingRedemptions === 1 ? "redemption" : "redemptions"}{" "}
                      pending
                    </span>
                  </span>
                )}
              </>
            ) : (
              <span className={cx(styles.bodySm, "text-text-muted")}>
                No pending actions
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </div>
      </div>
    </Link>
  );
}
