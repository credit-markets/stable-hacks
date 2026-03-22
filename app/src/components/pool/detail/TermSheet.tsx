"use client";

import { cx, styles } from "@/lib/styleClasses";
import type { Pool } from "@/services/api";

interface TermSheetProps {
  pool: Pool;
}

function formatAssetClass(assetClass?: string): string {
  if (!assetClass) return "—";
  return assetClass.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatShareClass(shareClass?: string): string {
  if (!shareClass) return "—";
  return shareClass.charAt(0).toUpperCase() + shareClass.slice(1);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-border-default/30 last:border-b-0">
      <span className={styles.labelSans}>{label}</span>
      <span className={cx(styles.valueXs, "text-right max-w-[60%]")}>
        {value || "—"}
      </span>
    </div>
  );
}

export function TermSheet({ pool }: TermSheetProps) {
  return (
    <section aria-label="Term Sheet">
      <h3 className={cx(styles.headingSm, "mb-4")}>Term Sheet</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        {/* Left column */}
        <div>
          <Row label="Asset Class" value={formatAssetClass(pool.asset_class)} />
          <Row label="Share Class" value={formatShareClass(pool.share_class)} />
          <Row label="Deposit Currency" value="USDC" />
        </div>

        {/* Right column */}
        <div>
          <Row
            label="Lockup Period"
            value={
              pool.lockup_period_days != null
                ? `${pool.lockup_period_days} days`
                : undefined
            }
          />
          <Row
            label="Redemption Notice"
            value={
              pool.redemption_notice_days != null
                ? `${pool.redemption_notice_days} days`
                : undefined
            }
          />
          <Row
            label="Min Investment"
            value={
              pool.minimum_investment != null
                ? `$${pool.minimum_investment.toLocaleString()}`
                : undefined
            }
          />
        </div>
      </div>
    </section>
  );
}
