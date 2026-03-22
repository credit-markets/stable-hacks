"use client";

import { cx, styles } from "@/lib/styleClasses";
import type { Pool } from "@/services/api";

interface HedgeInfoProps {
  pool: Pool;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-border-default/30 last:border-b-0">
      <span className={styles.labelPrimary}>{label}</span>
      <span className={styles.valueXs}>{value || "—"}</span>
    </div>
  );
}

function formatMechanism(mechanism?: string): string {
  if (!mechanism) return "—";
  const labels: Record<string, string> = {
    ndf: "NDF (Non-Deliverable Forward)",
    b3_futures: "B3 Futures",
    options: "Options",
    none: "None",
  };
  return labels[mechanism] || mechanism;
}

export function HedgeInfo({ pool }: HedgeInfoProps) {
  const hasHedgeData =
    pool.hedge_mechanism ||
    pool.hedge_coverage != null ||
    pool.hedge_counterparty ||
    pool.hedge_cost_bps != null ||
    pool.hedge_roll_frequency ||
    pool.hedge_description;

  if (!hasHedgeData) {
    return (
      <section aria-label="FX Hedge">
        <h3 className={cx(styles.headingSm, "mb-4")}>FX Hedge</h3>
        <p className={styles.bodyMd}>No hedge data available</p>
      </section>
    );
  }

  return (
    <section aria-label="FX Hedge">
      <h3 className={cx(styles.headingSm, "mb-4")}>FX Hedge</h3>
      <div className="max-w-md">
        <Row label="Mechanism" value={formatMechanism(pool.hedge_mechanism)} />
        <Row
          label="Coverage"
          value={
            pool.hedge_coverage != null
              ? `${(pool.hedge_coverage * 100).toFixed(0)}%`
              : undefined
          }
        />
        <Row label="Counterparty" value={pool.hedge_counterparty} />
        <Row
          label="Cost"
          value={
            pool.hedge_cost_bps != null
              ? `${pool.hedge_cost_bps} bps`
              : undefined
          }
        />
        <Row label="Roll Frequency" value={pool.hedge_roll_frequency} />
        <Row label="Description" value={pool.hedge_description} />
      </div>
    </section>
  );
}
