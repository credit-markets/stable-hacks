"use client";

import { cx, styles } from "@/lib/styleClasses";
import {
  calculatePoolTvl,
  formatTvlCompact,
  getPoolTokenSymbol,
} from "@/lib/utils/tvl";
import type { Pool } from "@/services/api";

interface PoolInfoStripProps {
  pool: Pool;
}

function MetricItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={styles.terminalStripDarkLabel}>{label}</span>
      <span className={styles.terminalStripDarkValue}>{value}</span>
    </div>
  );
}

export function PoolInfoStrip({ pool }: PoolInfoStripProps) {
  const isWindowOpen = pool.investment_window_open ?? false;
  const tokenSymbol = getPoolTokenSymbol(pool.currency, pool.asset_mint);

  return (
    <div
      className={cx(styles.terminalStripDark, "flex flex-col gap-4")}
      style={{
        background:
          "linear-gradient(135deg, #454545 0%, #393939 50%, #2d2d2d 100%)",
      }}
    >
      {/* Top accent line */}
      <div className={styles.terminalStripDarkAccent} />

      {/* Header: Pool name + Window status */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">{pool.title}</h2>
        <span
          className={cx(
            "inline-flex items-center px-2.5 py-0.5 rounded-sm font-mono text-[10px] font-medium uppercase tracking-wider border",
            isWindowOpen
              ? "border-terminal-green text-terminal-green"
              : "border-white/30 text-white/60",
          )}
        >
          {isWindowOpen ? "Open" : "Closed"}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-6 flex-wrap">
        <MetricItem
          label="TVL"
          value={formatTvlCompact(
            calculatePoolTvl(
              pool.onChainData?.totalShares,
              pool.onChainData?.pricePerShare,
            ),
            tokenSymbol,
          )}
        />
        <span className={styles.terminalStripDarkSeparator}>|</span>
        <MetricItem
          label="NAV Price"
          value={
            pool.onChainData?.pricePerShare != null
              ? `${pool.onChainData.pricePerShare.toFixed(4)} ${tokenSymbol}`
              : "---"
          }
        />
      </div>
    </div>
  );
}
