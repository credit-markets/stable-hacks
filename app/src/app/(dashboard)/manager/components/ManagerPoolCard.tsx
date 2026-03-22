"use client";

import { type ChipStatus, StatusChip } from "@/components/StatusChip";
import { STATUS_COLORS, type StatusKey } from "@/constants/statusColors";
import { useRiskScore } from "@/hooks/risk/useRiskData";
import { cx, styles } from "@/lib/styleClasses";
import {
  calculatePoolTvl,
  formatTvlDisplay,
  getPoolTokenSymbol,
} from "@/lib/utils/tvl";
import type { Pool } from "@/services/api";
import type { FidcRiskScore, TidcRiskScore } from "@/types/risk";
import Link from "next/link";
import { memo } from "react";

interface ManagerPoolCardProps {
  pool: Pool;
}

function formatAssetClass(assetClass?: string): string {
  if (!assetClass) return "—";
  return assetClass.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getScoreColor(score: number): string {
  if (score <= 30) return "bg-terminal-green";
  if (score <= 60) return "bg-terminal-amber";
  return "bg-terminal-red";
}

export const ManagerPoolCard = memo(function ManagerPoolCard({
  pool,
}: ManagerPoolCardProps) {
  if (!pool) return null;

  const { data: score } = useRiskScore(pool.pipeline_key);

  const isDeployed = !!pool.on_chain_address;
  const chipStatus: ChipStatus = isDeployed ? "deployed" : "not_deployed";
  const statusConfig = STATUS_COLORS[isDeployed ? "DEPLOYED" : "NOT_DEPLOYED"];

  const isWindowOpen = pool.investment_window_open ?? false;

  const returnValue = score
    ? score.pool_type === "fidc"
      ? ((score as FidcRiskScore).mean_rentab * 12).toFixed(1)
      : ((score as TidcRiskScore).effective_yield ?? 0).toFixed(1)
    : null;

  const creditScore =
    score?.score_risco != null ? Math.round(score.score_risco * 100) : null;

  const tokenSymbol = getPoolTokenSymbol(pool.currency, pool.asset_mint);

  const tvl = formatTvlDisplay(
    calculatePoolTvl(
      pool.onChainData?.totalShares,
      pool.onChainData?.pricePerShare,
    ),
    tokenSymbol,
  );

  return (
    <Link
      href={`/manager/pools/${pool.id}`}
      className={cx(
        styles.card,
        "hover:shadow-card-hover hover:border-border-default transition-all duration-150 cursor-pointer flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-text-primary/20 no-underline",
      )}
    >
      {/* Header: Status chips */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <StatusChip status={chipStatus} label={statusConfig?.label} />
          <span
            className={cx(
              styles.chipBase,
              isWindowOpen ? styles.chipOpen : styles.chipClosed,
            )}
          >
            {isWindowOpen ? "Window Open" : "Window Closed"}
          </span>
        </div>
      </div>

      {/* Title + Subtitle */}
      <div className="px-5 pt-2.5">
        <h3 className={cx(styles.headingSm, "leading-snug line-clamp-2")}>
          {pool.title}
        </h3>
        <p className={cx(styles.bodySm, "mt-0.5")}>
          {formatAssetClass(pool.asset_class)} ·{" "}
          {pool.share_class
            ? pool.share_class.charAt(0).toUpperCase() +
              pool.share_class.slice(1)
            : "Senior"}
        </p>
      </div>

      {/* Hero: Return + Credit Score */}
      <div className="flex items-end justify-between px-5 pt-3.5">
        <div>
          <p className={styles.labelPrimary}>LTM Net Return</p>
          <p className="text-[28px] font-bold tabular-nums tracking-tight leading-tight mt-0.5">
            {returnValue ?? "—"}
            <span className="text-sm font-normal text-text-muted ml-1">
              % p.a.
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className={styles.labelPrimary}>Credit Score</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-[72px] h-1 bg-surface-hover rounded-full overflow-hidden">
              {creditScore != null && (
                <div
                  className={cx(
                    "h-full rounded-full",
                    getScoreColor(creditScore),
                  )}
                  style={{ width: `${Math.max(creditScore, 2)}%` }}
                />
              )}
            </div>
            <span className="text-base font-bold tabular-nums">
              {creditScore ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics 2x2 */}
      <div className="px-5 pt-3.5 pb-5 mt-auto grid grid-cols-2 gap-x-5 gap-y-2.5">
        <div>
          <p className={styles.labelPrimary}>Rating</p>
          <p className={cx(styles.valueSm, "mt-0.5")}>
            {score?.confidence_tier != null
              ? `Tier ${score.confidence_tier}`
              : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className={styles.labelPrimary}>Track Record</p>
          <p className={cx(styles.valueSm, "mt-0.5")}>
            {score?.n_months_total != null ? `${score.n_months_total} mo` : "—"}
          </p>
        </div>
        <div>
          <p className={styles.labelPrimary}>Deposit</p>
          <p
            className={cx(
              styles.valueSm,
              "mt-0.5 inline-flex items-center gap-1.5",
            )}
          >
            {tokenSymbol}
          </p>
        </div>
        <div className="text-right">
          <p className={styles.labelPrimary}>TVL</p>
          <p className={cx(styles.valueSm, "mt-0.5")}>{tvl}</p>
        </div>
      </div>
    </Link>
  );
});
