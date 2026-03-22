"use client";

import { Shimmer } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";
import type { FidcRiskScore } from "@/types/risk";

interface PddForecastPanelProps {
  score: FidcRiskScore | undefined;
}

function fmtPct(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "\u2014";
  return `${(value * 100).toFixed(decimals)}%`;
}

function getDeltaDisplay(delta: number | null | undefined): string {
  if (delta == null) return "\u2014";
  const sign = delta > 0 ? "+" : "";
  return `\u2192 ${sign}${(delta * 100).toFixed(2)}%`;
}

/**
 * Horizontal bar for factor values, centered at 0.
 * Range is clamped to [-10, 10] for display.
 */
function FactorBar({ value, label }: { value: number; label: string }) {
  const maxRange = 10;
  const clamped = Math.max(-maxRange, Math.min(maxRange, value));
  const pct = (Math.abs(clamped) / maxRange) * 50;
  const barColor =
    clamped > 1
      ? "bg-terminal-red"
      : clamped < -1
        ? "bg-terminal-green"
        : "bg-terminal-amber";

  const sign = value >= 0 ? "+" : "";

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className={styles.bodySm}>{label}</span>
        <span className={styles.valueXs}>
          {sign}
          {value.toFixed(2)}
        </span>
      </div>
      <div className="relative h-[5px] w-full rounded-[3px] bg-[#f0f0f0] overflow-hidden">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-border-default" />
        {/* Factor bar */}
        {clamped >= 0 ? (
          <div
            className={cx("absolute top-0 h-full rounded-[3px]", barColor)}
            style={{ left: "50%", width: `${pct}%` }}
          />
        ) : (
          <div
            className={cx("absolute top-0 h-full rounded-[3px]", barColor)}
            style={{ left: `${50 - pct}%`, width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function PddForecastPanel({ score }: PddForecastPanelProps) {
  if (!score) {
    return (
      <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
        <Shimmer className="h-5 w-40" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-5 w-48 mt-2" />
        <Shimmer className="h-2 w-full" />
        <Shimmer className="h-2 w-full" />
        <Shimmer className="h-2 w-full" />
      </div>
    );
  }

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <h3 className={cx(styles.headingSm, "mb-3")}>PDD Forecast</h3>

      {/* PDD metrics */}
      <div className="flex items-center justify-between py-[7px] border-b border-[#f5f5f5]">
        <span className={styles.bodySm}>Current PDD</span>
        <span className={styles.valueXs}>{fmtPct(score.pdd_ratio)}</span>
      </div>
      <div className="flex items-center justify-between py-[7px] border-b border-[#f5f5f5]">
        <span className={styles.bodySm}>Predicted PDD</span>
        <span className={styles.valueXs}>
          {fmtPct(score.pdd_prevista_ensemble)}
        </span>
      </div>
      <div className="flex items-center justify-between py-[7px]">
        <span className={styles.bodySm}>Delta ({"\u0394"})</span>
        <span className={styles.valueXs}>
          {getDeltaDisplay(score.delta_pdd)}
        </span>
      </div>

      <div className={cx(styles.divider, "my-3")} />

      {/* Factor Profile */}
      <span className={cx(styles.labelSans, "block mb-2.5")}>
        Factor Profile
      </span>
      <div className="flex flex-col gap-2.5">
        <FactorBar value={score.f1} label="F1 \u2014 Credit Stress" />
        <FactorBar value={score.f2} label="F2 \u2014 Structural Health" />
        <FactorBar value={score.f3} label="F3 \u2014 Macro Sensitivity" />
      </div>
    </div>
  );
}
