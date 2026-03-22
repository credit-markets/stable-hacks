"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { Shimmer } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";
import { getPoolTokenSymbol } from "@/lib/utils/tvl";
import type { PortfolioAllocation, PortfolioPosition } from "@/types/portfolio";
import type { ReactNode } from "react";

interface PortfolioRiskPanelProps {
  positions: PortfolioPosition[];
  allocation: PortfolioAllocation[];
  weightedCreditScore: number | null;
  totalInvested: number;
  isLoading?: boolean;
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-subtle/30 last:border-b-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-xs font-medium text-text-primary">{value}</span>
    </div>
  );
}

/** Format an asset_class key for display: replace underscores with spaces, title case */
function formatAssetClass(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PortfolioRiskPanel({
  positions,
  allocation,
  weightedCreditScore,
  totalInvested,
  isLoading,
}: PortfolioRiskPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cx(styles.card, styles.cardPadding)}>
          <SectionHeading title="Portfolio Risk" />
          <div className="space-y-3">
            <Shimmer size="textSm" width="w-full" />
            <Shimmer size="textSm" width="w-3/4" />
            <Shimmer size="textSm" width="w-1/2" />
          </div>
        </div>
        <div className={cx(styles.card, styles.cardPadding)}>
          <SectionHeading title="Allocation" />
          <div className="space-y-3">
            <Shimmer size="textSm" width="w-full" />
            <Shimmer size="textSm" width="w-2/3" />
          </div>
        </div>
      </div>
    );
  }
  // Largest position
  let largestPct = 0;
  let largestName = "";
  for (const pos of positions) {
    if (pos.share > largestPct) {
      largestPct = pos.share;
      largestName = pos.poolTitle;
    }
  }

  const positionCount = positions.length;
  const avgCreditScore =
    weightedCreditScore != null ? Math.round(weightedCreditScore) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card 1 - Portfolio Risk */}
      <div className={cx(styles.card, styles.cardPadding)}>
        <SectionHeading title="Portfolio Risk" />
        <MetricRow
          label="Weighted Credit Score"
          value={avgCreditScore != null ? `${avgCreditScore} / 100` : "\u2014"}
        />
        <MetricRow
          label="Largest Position"
          value={
            totalInvested > 0
              ? `${largestPct.toFixed(1)}% (${largestName})`
              : "\u2014"
          }
        />
        <MetricRow label="Positions" value={positionCount} />
      </div>

      {/* Card 2 - Allocation */}
      <div className={cx(styles.card, styles.cardPadding)}>
        <SectionHeading title="Allocation" />
        {allocation.length > 0 ? (
          <div className="space-y-1.5">
            {allocation
              .sort((a, b) => b.percentage - a.percentage)
              .map((item, idx) => (
                <div
                  key={item.assetClass}
                  className="flex items-center gap-2 py-1"
                >
                  <span className="text-[11px] text-text-secondary w-[120px] flex-shrink-0 truncate">
                    {formatAssetClass(item.assetClass)}
                  </span>
                  <div className="flex-1 h-2 bg-[#f0f0f0] rounded overflow-hidden">
                    <div
                      className="h-full rounded bg-text-primary"
                      style={{
                        width: `${item.percentage}%`,
                        opacity: idx === 0 ? 1 : 0.5,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium w-10 text-right flex-shrink-0">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <span className="text-xs text-text-tertiary">No positions</span>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-subtle/30">
          <div className="flex justify-between items-center py-1 mb-1">
            <span className="text-xs text-text-secondary">
              Deposit Currency
            </span>
          </div>
          {(() => {
            if (positions.length === 0) {
              return (
                <div className="py-2 text-center">
                  <span className="text-xs text-text-tertiary">
                    No deposits
                  </span>
                </div>
              );
            }
            const totalInvestedByCurrency = new Map<string, number>();
            for (const pos of positions) {
              const currency = getPoolTokenSymbol(pos.depositCurrency);
              totalInvestedByCurrency.set(
                currency,
                (totalInvestedByCurrency.get(currency) ?? 0) + pos.invested,
              );
            }
            const grandTotal = positions.reduce(
              (sum, p) => sum + p.invested,
              0,
            );
            return [...totalInvestedByCurrency.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([currency, amount]) => (
                <div
                  key={currency}
                  className="flex justify-between items-center py-0.5"
                >
                  <span className="text-[11px] text-text-secondary">
                    {currency}
                  </span>
                  <span className="text-[11px] font-medium text-text-primary">
                    {grandTotal > 0
                      ? ((amount / grandTotal) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </span>
                </div>
              ));
          })()}
        </div>
      </div>
    </div>
  );
}
