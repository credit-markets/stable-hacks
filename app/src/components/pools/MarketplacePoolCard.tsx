"use client";

import { PoolLogo } from "@/components/PoolLogo";
import { StatusChip } from "@/components/StatusChip";
import { useRiskScore } from "@/hooks/risk/useRiskData";
import { cx, styles } from "@/lib/styleClasses";
import { calculatePoolTvl, formatTvlCompact } from "@/lib/utils/tvl";
import type { Pool } from "@/services/api";
import type { FidcRiskScore, TidcRiskScore } from "@/types/risk";
import { formatAddress } from "@/utils/formatAddress";
import PAGES from "@/utils/pages";
import Link from "next/link";
import { memo } from "react";

interface MarketplacePoolCardProps {
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

export const MarketplacePoolCard = memo(function MarketplacePoolCard({
  pool,
}: MarketplacePoolCardProps) {
  const { data: score } = useRiskScore(pool.pipeline_key);

  const isDeployed = !!pool.on_chain_address;
  const chipStatus = isDeployed
    ? pool.investment_window_open
      ? "open"
      : "closed"
    : "not_deployed";

  const returnValue = score
    ? score.pool_type === "fidc"
      ? ((score as FidcRiskScore).mean_rentab * 12).toFixed(1)
      : ((score as TidcRiskScore).effective_yield ?? 0).toFixed(1)
    : null;

  const creditScore =
    score?.score_risco != null ? Math.round(score.score_risco * 100) : null;

  const tvl = formatTvlCompact(
    calculatePoolTvl(
      pool.onChainData?.totalShares,
      pool.onChainData?.pricePerShare,
    ),
    "",
  );

  return (
    <Link
      href={PAGES.POOL.DETAILS(pool.id)}
      className={cx(
        styles.card,
        "hover:shadow-card-hover hover:border-border-default transition-all duration-150 cursor-pointer flex flex-col focus:outline-none focus:ring-2 focus:ring-text-primary/20",
      )}
    >
      {/* Header: Logo + Status */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <PoolLogo src={pool.logo_path} name={pool.title} size="sm" />
        <StatusChip status={chipStatus} />
      </div>

      {/* Title + Subtitle */}
      <div className="px-5 pb-4">
        <h3 className={cx(styles.headingSm, "leading-snug truncate mb-1")}>
          {pool.title}
        </h3>
        <p className={styles.labelSecondary}>
          {formatAssetClass(pool.asset_class)} ·{" "}
          {pool.share_class
            ? pool.share_class.charAt(0).toUpperCase() +
              pool.share_class.slice(1)
            : "Senior"}
        </p>
      </div>

      {/* Key Metrics — 2x3 grid */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className={cx(styles.labelPrimary, "mb-0.5")}>LTM Net Return</p>
          <p className={styles.valueMd}>
            {returnValue ? `${returnValue}% p.a.` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className={cx(styles.labelPrimary, "mb-0.5")}>TVL</p>
          <p className={styles.valueSm}>{tvl}</p>
        </div>

        <div>
          <p className={cx(styles.labelPrimary, "mb-0.5")}>Rating</p>
          <p className={styles.valueXs}>
            {score?.confidence_tier != null
              ? `Tier ${score.confidence_tier} — ${score.confidence_tier === 1 ? "High" : score.confidence_tier === 2 ? "Medium" : "Lower"}`
              : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className={cx(styles.labelPrimary, "mb-0.5")}>Track Record</p>
          <p className={styles.valueXs}>
            {score?.n_months_total != null
              ? `${score.n_months_total} months`
              : "—"}
          </p>
        </div>

        <div>
          <p className={cx(styles.labelPrimary, "mb-0.5")}>Deposit</p>
          <p className={styles.valueXs}>USDC</p>
        </div>
        <div className="text-right">
          <p className={cx(styles.labelPrimary, "mb-0.5")}>Credit Score</p>
          <div className="flex items-center gap-2 justify-end">
            <div className="w-16 h-1 bg-surface-hover rounded-full overflow-hidden">
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
            <span className={styles.valueXs}>{creditScore ?? "—"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
});
