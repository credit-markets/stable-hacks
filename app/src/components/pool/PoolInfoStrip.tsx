"use client";

import { cx, styles } from "@/lib/styleClasses";
import type { Pool } from "@/services/api";
import { formatPrice } from "@/utils/formatPrice";

interface PoolInfoStripProps {
  data: Pool;
}

// Dark terminal style constants (matching Portfolio TerminalDataStrip)
const LABEL_CLASSES = styles.terminalStripDarkLabel;
const VALUE_CLASSES = styles.terminalStripDarkValue;

function formatHorizon(value?: number, unit?: "months" | "years"): string {
  if (!value) return "—";
  if (unit === "years") return `${value} year${value !== 1 ? "s" : ""}`;
  return `${value} month${value !== 1 ? "s" : ""}`;
}

export function PoolInfoStrip({ data }: PoolInfoStripProps) {
  const fundSize = Number(data.fund_size || 0);
  const currency = data.currency === "brl" ? "BRL" : "USDC";

  return (
    <div
      className={cx(
        styles.terminalStripDark,
        "grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between sm:gap-4",
      )}
      style={{
        background:
          "linear-gradient(135deg, #454545 0%, #393939 50%, #2d2d2d 100%)",
      }}
    >
      {/* Top accent line */}
      <div className={styles.terminalStripDarkAccent} />

      {/* Pool Size */}
      <div className="flex flex-col gap-0.5">
        <span className={LABEL_CLASSES}>Pool Size</span>
        <span className={VALUE_CLASSES}>
          {formatPrice(fundSize, undefined, {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{" "}
          {currency}
        </span>
      </div>

      {/* Target Return */}
      <div className="flex flex-col gap-0.5">
        <span className={LABEL_CLASSES}>Target Return</span>
        <span className={VALUE_CLASSES}>
          {data.target_return_rate ? `${data.target_return_rate}% p.a.` : "—"}
        </span>
      </div>

      {/* Investment Horizon */}
      <div className="flex flex-col gap-0.5">
        <span className={LABEL_CLASSES}>Horizon</span>
        <span className={VALUE_CLASSES}>
          {formatHorizon(
            data.investment_horizon_value,
            data.investment_horizon_unit,
          )}
        </span>
      </div>

      {/* Lockup */}
      <div className="flex flex-col gap-0.5">
        <span className={LABEL_CLASSES}>Lockup</span>
        <span className={VALUE_CLASSES}>
          {data.lockup_period_days ? `${data.lockup_period_days} days` : "None"}
        </span>
      </div>
    </div>
  );
}
