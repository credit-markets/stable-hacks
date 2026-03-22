"use client";

import { styles } from "@/lib/styleClasses";
import type { KybSubmission } from "@/types/kyb";
import { Chip } from "@nextui-org/chip";
import { useCallback, useState } from "react";

const RISK_FACTORS = [
  { key: "jurisdiction_risk", label: "Jurisdiction" },
  { key: "ownership_complexity", label: "Ownership" },
  { key: "pep_rca_exposure", label: "PEP / RCA" },
  { key: "adverse_media", label: "Adverse Media" },
  { key: "sof_sow_clarity", label: "SoF / SoW" },
  { key: "funding_route", label: "Funding Route" },
  { key: "wallet_risk", label: "Wallet Risk" },
  { key: "profile_fit", label: "Profile Fit" },
] as const;

const SCORE_OPTIONS = [
  { value: 0, label: "Low", color: "text-success" },
  { value: 1, label: "Med", color: "text-warning" },
  { value: 2, label: "High", color: "text-danger" },
] as const;

function computeBand(total: number): string {
  if (total <= 5) return "low";
  if (total <= 10) return "medium";
  return "high";
}

interface RiskScoringFormProps {
  submission: KybSubmission;
  onUpdate: (data: Record<string, unknown>) => void;
}

export default function RiskScoringForm({
  submission,
  onUpdate,
}: RiskScoringFormProps) {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const sub = submission as unknown as Record<string, unknown>;
    for (const factor of RISK_FACTORS) {
      const saved = sub[factor.key];
      initial[factor.key] = typeof saved === "number" ? saved : 0;
    }
    return initial;
  });

  const total = Object.values(scores).reduce((sum, v) => sum + v, 0);
  const band = computeBand(total);

  const handleChange = useCallback(
    (key: string, value: number) => {
      setScores((prev) => {
        const next = { ...prev, [key]: value };
        const newTotal = Object.values(next).reduce((sum, v) => sum + v, 0);
        const newBand = computeBand(newTotal);
        onUpdate({ risk_score: newTotal, risk_band: newBand });
        return next;
      });
    },
    [onUpdate],
  );

  return (
    <div className="space-y-3">
      <span className={styles.labelPrimary}>Risk Scoring</span>

      <div className="space-y-1.5">
        {RISK_FACTORS.map((factor) => (
          <div
            key={factor.key}
            className="flex items-center justify-between py-1 border-b border-subtle last:border-0"
          >
            <span className="text-xs text-text-secondary">{factor.label}</span>
            <div className="flex items-center gap-0.5">
              {SCORE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange(factor.key, opt.value)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    scores[factor.key] === opt.value
                      ? opt.value === 0
                        ? "bg-success/15 text-success"
                        : opt.value === 1
                          ? "bg-warning/15 text-warning"
                          : "bg-danger/15 text-danger"
                      : "text-text-muted hover:bg-surface-hover"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-subtle">
        <span className={styles.labelPrimary}>Total Score</span>
        <div className="flex items-center gap-2">
          <span className={styles.valueMd}>{total}</span>
          <Chip
            size="sm"
            variant="flat"
            color={
              band === "low"
                ? "success"
                : band === "medium"
                  ? "warning"
                  : "danger"
            }
          >
            {band.toUpperCase()}
          </Chip>
        </div>
      </div>
    </div>
  );
}
