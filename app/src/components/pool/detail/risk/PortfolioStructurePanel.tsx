"use client";

import { MetricLabel } from "@/components/ui/MetricLabel";
import { Shimmer } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";
import type { FidcMonthly } from "@/types/risk";

interface PortfolioStructurePanelProps {
  monthly: FidcMonthly[] | undefined;
}

function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function fmtPct(value: number | null | undefined, decimals = 2): string {
  const n = toNum(value);
  if (n == null) return "Not reported";
  return `${(n * 100).toFixed(decimals)}%`;
}

function fmtMultiple(value: number | null | undefined, decimals = 2): string {
  const n = toNum(value);
  if (n == null) return "Not reported";
  return `${n.toFixed(decimals)}x`;
}

function fmtYears(value: number | null | undefined): string {
  const n = toNum(value);
  if (n == null) return "Not reported";
  return `${n.toFixed(2)} years`;
}

/**
 * Row with tooltip (uses MetricLabel which includes tooltip icon when definition exists).
 */
function MetricRowWithTooltip({
  metricKey,
  fallbackLabel,
  value,
}: {
  metricKey: string;
  fallbackLabel: string;
  value: string;
}) {
  const isNA = value === "Not reported";
  return (
    <div className="flex items-center justify-between py-[7px] border-b border-[#f5f5f5] last:border-b-0">
      <MetricLabel metricKey={metricKey} fallbackLabel={fallbackLabel} />
      <span className={cx(styles.valueXs, isNA && "text-text-muted")}>
        {value}
      </span>
    </div>
  );
}

/**
 * Row without tooltip — plain label text.
 */
function MetricRowPlain({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const isNA = value === "Not reported";
  return (
    <div className="flex items-center justify-between py-[7px] border-b border-[#f5f5f5] last:border-b-0">
      <span className={styles.bodySm}>{label}</span>
      <span className={cx(styles.valueXs, isNA && "text-text-muted")}>
        {value}
      </span>
    </div>
  );
}

export function PortfolioStructurePanel({
  monthly,
}: PortfolioStructurePanelProps) {
  if (!monthly) {
    return (
      <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
        <Shimmer className="h-5 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const latest = monthly[0];

  if (!latest) {
    return (
      <div
        className={cx(
          styles.card,
          styles.cardPadding,
          "flex items-center justify-center py-8",
        )}
      >
        <span className={styles.bodySm}>
          No portfolio structure data available
        </span>
      </div>
    );
  }

  const scrDisplay =
    latest.scr_share_ig != null
      ? `IG: ${(latest.scr_share_ig * 100).toFixed(1)}%`
      : "Not reported";

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <h3 className={cx(styles.headingSm, "mb-3")}>Portfolio Structure</h3>

      {/* Rows with tooltip icons (first 4) */}
      <MetricRowWithTooltip
        metricKey="subordination_ratio"
        fallbackLabel="Subordination"
        value={fmtPct(latest.subordination_ratio)}
      />
      <MetricRowWithTooltip
        metricKey="leverage_ratio"
        fallbackLabel="Leverage Ratio"
        value={fmtMultiple(latest.leverage_ratio)}
      />
      <MetricRowWithTooltip
        metricKey="liquidity_ratio"
        fallbackLabel="Liquidity Buffer"
        value={fmtPct(latest.liquidity_ratio)}
      />
      <MetricRowWithTooltip
        metricKey="recompra_ratio"
        fallbackLabel="Buyback Rate"
        value={fmtPct(latest.recompra_ratio)}
      />

      {/* Rows without tooltip icons */}
      <MetricRowPlain label="WAL" value={fmtYears(latest.wal_years)} />
      <MetricRowPlain label="SCR Rating" value={scrDisplay} />
    </div>
  );
}
