"use client";

import { Shimmer } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";
import type { PoolRiskScore } from "@/types/risk";

interface RiskScorePanelProps {
  score: PoolRiskScore | undefined;
}

const FAIXA_COLORS: Record<string, string> = {
  Baixo: "text-terminal-green border-terminal-green bg-terminal-green/5",
  Moderado: "text-terminal-amber border-terminal-amber bg-terminal-amber/5",
  Alto: "text-terminal-red border-terminal-red bg-terminal-red/5",
  Elevado: "text-terminal-red border-terminal-red bg-terminal-red/5",
  Crítico: "text-terminal-red border-terminal-red bg-terminal-red/5",
};

function getBarColor(pct: number): string {
  if (pct <= 30) return "bg-terminal-green";
  if (pct <= 60) return "bg-terminal-amber";
  return "bg-terminal-red";
}

export function RiskScorePanel({ score }: RiskScorePanelProps) {
  if (!score) {
    return (
      <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
        <Shimmer className="h-5 w-40" />
        <Shimmer className="h-5 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Shimmer className="h-8 w-full" />
          <Shimmer className="h-8 w-full" />
          <Shimmer className="h-8 w-full" />
        </div>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, score.score_risco * 100));

  const faixaColor =
    FAIXA_COLORS[score.faixa_risco] ??
    "text-text-secondary border-border-default bg-surface-hover";

  const ratingDisplay = `Tier ${score.confidence_tier} \u2014 ${score.confidence_label}`;
  const trackRecordDisplay = `${score.n_months_total} months`;
  const clusterDisplay =
    score.pool_type === "fidc" ? score.cluster_risk_label : "\u2014";

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <h3 className={cx(styles.headingSm, "mb-3.5")}>Risk Assessment</h3>

      {/* Badge + score bar + value — all on ONE LINE */}
      <div className="flex items-center gap-4 mb-3.5">
        <span
          className={cx(
            "inline-flex items-center px-3 py-1 rounded-sm border text-xs font-semibold uppercase tracking-wide shrink-0",
            faixaColor,
          )}
        >
          {score.faixa_risco}
        </span>
        <div className="flex-1 flex items-center gap-2">
          <div className="h-[5px] flex-1 rounded-full bg-[#f0f0f0] overflow-hidden">
            <div
              className={cx("h-full rounded-full", getBarColor(pct))}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={styles.valueSm}>{pct.toFixed(0)} / 100</span>
        </div>
      </div>

      {/* 3-column detail grid */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#f0f0f0]">
        <div>
          <span className={styles.labelSans}>Rating</span>
          <div className={cx(styles.valueXs, "mt-0.5")}>{ratingDisplay}</div>
        </div>
        <div>
          <span className={styles.labelSans}>Track Record</span>
          <div className={cx(styles.valueXs, "mt-0.5")}>
            {trackRecordDisplay}
          </div>
        </div>
        <div>
          <span className={styles.labelSans}>Cluster</span>
          <div className={cx(styles.valueXs, "mt-0.5")}>{clusterDisplay}</div>
        </div>
      </div>
    </div>
  );
}
