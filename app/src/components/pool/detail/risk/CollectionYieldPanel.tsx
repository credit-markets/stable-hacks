"use client";

import { MetricLabel } from "@/components/ui/MetricLabel";
import { Shimmer } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";
import type { TidcRiskScore } from "@/types/risk";

interface CollectionYieldPanelProps {
  score: TidcRiskScore | undefined;
}

type AlertLevel = "green" | "amber" | "red" | "neutral";

const ALERT_COLORS: Record<AlertLevel, string> = {
  green: "text-terminal-green",
  amber: "text-terminal-amber",
  red: "text-terminal-red",
  neutral: "",
};

function fmtPct(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "\u2014";
  return `${(value * 100).toFixed(decimals)}%`;
}

function fmtDecimal(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "\u2014";
  return value.toFixed(decimals);
}

// Collection Rate / On-Time Payment: >90% green, 85-90% amber, <85% red
function getHighIsGoodLevel(
  value: number | null | undefined,
  greenThreshold: number,
  amberThreshold: number,
): AlertLevel {
  if (value == null) return "neutral";
  const pct = value * 100;
  if (pct > greenThreshold) return "green";
  if (pct >= amberThreshold) return "amber";
  return "red";
}

// Overdue / Default / Expected Loss: lower is better
function getLowIsGoodLevel(
  value: number | null | undefined,
  greenThreshold: number,
  amberThreshold: number,
): AlertLevel {
  if (value == null) return "neutral";
  const pct = value * 100;
  if (pct < greenThreshold) return "green";
  if (pct <= amberThreshold) return "amber";
  return "red";
}

function MetricRow({
  metricKey,
  fallbackLabel,
  value,
  level = "neutral",
}: {
  metricKey: string;
  fallbackLabel: string;
  value: string;
  level?: AlertLevel;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-default/30 last:border-b-0">
      <MetricLabel metricKey={metricKey} fallbackLabel={fallbackLabel} />
      <span className={cx(styles.valueSm, ALERT_COLORS[level])}>{value}</span>
    </div>
  );
}

export function CollectionYieldPanel({ score }: CollectionYieldPanelProps) {
  if (!score) {
    return (
      <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
        <Shimmer className="h-5 w-48" />
        <Shimmer className="h-4 w-36 mt-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-4 w-16" />
          </div>
        ))}
        <Shimmer className="h-px w-full" />
        <Shimmer className="h-4 w-24" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
      <h3 className={styles.headingSm}>Collection & Yield</h3>

      {/* Section 1 — Collection Performance */}
      <div className="space-y-1">
        <span className={styles.labelSans}>Collection Performance</span>
        <MetricRow
          metricKey="collection_rate"
          fallbackLabel="Collection Rate"
          value={fmtPct(score.collection_rate)}
          level={getHighIsGoodLevel(score.collection_rate, 90, 85)}
        />
        <MetricRow
          metricKey="on_time_payment_ratio"
          fallbackLabel="On-Time Payment"
          value={fmtPct(score.on_time_payment_ratio)}
          level={getHighIsGoodLevel(score.on_time_payment_ratio, 90, 85)}
        />
        <MetricRow
          metricKey="overdue_ratio"
          fallbackLabel="Overdue Ratio"
          value={fmtPct(score.overdue_ratio)}
          level={getLowIsGoodLevel(score.overdue_ratio, 5, 10)}
        />
        <MetricRow
          metricKey="default_ratio"
          fallbackLabel="Default Ratio"
          value={fmtPct(score.default_ratio)}
          level={getLowIsGoodLevel(score.default_ratio, 2, 5)}
        />
        <MetricRow
          metricKey="expected_loss_proxy"
          fallbackLabel="Expected Loss"
          value={fmtPct(score.expected_loss_proxy)}
          level={getLowIsGoodLevel(score.expected_loss_proxy, 2, 5)}
        />
        <MetricRow
          metricKey="distance_to_loss"
          fallbackLabel="Distance to Loss"
          value={fmtDecimal(score.distance_to_loss)}
        />
      </div>

      <div className="h-px bg-border-default/30 my-3" />

      {/* Section 2 — Yield */}
      <div className="space-y-1">
        <span className={styles.labelSans}>Yield</span>
        <MetricRow
          metricKey="effective_yield"
          fallbackLabel="Effective Yield"
          value={
            score.effective_yield != null
              ? `${score.effective_yield.toFixed(2)}%`
              : "\u2014"
          }
        />
        <MetricRow
          metricKey="mean_monthly_yield"
          fallbackLabel="Monthly Avg Yield"
          value={
            score.mean_monthly_yield != null
              ? `${score.mean_monthly_yield.toFixed(2)}%`
              : "\u2014"
          }
        />
      </div>
    </div>
  );
}
