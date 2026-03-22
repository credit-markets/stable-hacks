"use client";

import { MetricLabel } from "@/components/ui/MetricLabel";
import { Shimmer } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";
import type { TidcMonthly, TidcRiskScore } from "@/types/risk";

interface ConcentrationPanelProps {
  score: TidcRiskScore | undefined;
  monthly: TidcMonthly[] | undefined;
}

type AlertLevel = "green" | "amber" | "red" | "neutral";

const ALERT_COLORS: Record<AlertLevel, string> = {
  green: "text-terminal-green",
  amber: "text-terminal-amber",
  red: "text-terminal-red",
  neutral: "",
};

function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "\u2014";
  return `${(value * 100).toFixed(decimals)}%`;
}

function fmtNum(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "\u2014";
  return value.toFixed(decimals);
}

function fmtDays(value: number | null | undefined): string {
  if (value == null) return "\u2014";
  return `${Math.round(value)} days`;
}

// Top 5%: <40% green, 40-60% amber, >60% red
function getTop5Level(value: number | null | undefined): AlertLevel {
  if (value == null) return "neutral";
  const pct = value * 100;
  if (pct < 40) return "green";
  if (pct <= 60) return "amber";
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

export function ConcentrationPanel({
  score,
  monthly,
}: ConcentrationPanelProps) {
  if (!score) {
    return (
      <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
        <Shimmer className="h-5 w-56" />
        <Shimmer className="h-4 w-36 mt-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-4 w-16" />
          </div>
        ))}
        <Shimmer className="h-px w-full" />
        <Shimmer className="h-4 w-36" />
        <div className="flex items-center justify-between py-1.5">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-4 w-16" />
        </div>
      </div>
    );
  }

  const latest = monthly?.[0];

  // Prefer score-level values, fall back to latest monthly
  const sacadoEffN = latest?.sacado_effective_n ?? null;
  const cedenteEffN = latest?.cedente_effective_n ?? null;
  const sacadoTop5 = score.sacado_top5_pct ?? latest?.sacado_top5_pct ?? null;
  const cedenteTop5 =
    score.cedente_top5_pct ?? latest?.cedente_top5_pct ?? null;
  const walDays = latest?.wal_days ?? null;

  return (
    <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
      <h3 className={styles.headingSm}>Concentration & Maturity</h3>

      {/* Section 1 — Concentration */}
      <div className="space-y-1">
        <span className={styles.labelSans}>Concentration</span>
        <MetricRow
          metricKey="sacado_effective_n"
          fallbackLabel="Sacado Effective N"
          value={fmtNum(sacadoEffN)}
        />
        <MetricRow
          metricKey="sacado_top5_pct"
          fallbackLabel="Sacado Top 5%"
          value={fmtPct(sacadoTop5)}
          level={getTop5Level(sacadoTop5)}
        />
        <MetricRow
          metricKey="cedente_effective_n"
          fallbackLabel="Cedente Effective N"
          value={fmtNum(cedenteEffN)}
        />
        <MetricRow
          metricKey="cedente_top5_pct"
          fallbackLabel="Cedente Top 5%"
          value={fmtPct(cedenteTop5)}
          level={getTop5Level(cedenteTop5)}
        />
      </div>

      <div className="h-px bg-border-default/30 my-3" />

      {/* Section 2 — Maturity */}
      <div className="space-y-1">
        <span className={styles.labelSans}>Maturity</span>
        <MetricRow
          metricKey="wal_days"
          fallbackLabel="Avg Remaining Days"
          value={fmtDays(walDays)}
        />
      </div>
    </div>
  );
}
