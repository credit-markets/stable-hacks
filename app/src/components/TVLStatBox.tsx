"use client";

import { ContentReveal, Shimmer } from "@/components/ui/skeletons";
import { usePoolsQuery } from "@/hooks/pools/usePoolsQuery";
import { cx, styles } from "@/lib/styleClasses";
import { calculatePoolTvl, formatTvlCompact } from "@/lib/utils/tvl";
import { format } from "date-fns";
import { BarChart3 } from "lucide-react";

export function TVLStatBox() {
  const { data: response, isLoading } = usePoolsQuery();
  const today = format(new Date(), "d MMM, yyyy");

  const totalTvl = (response?.data ?? []).reduce((sum, pool) => {
    const poolTvl = calculatePoolTvl(
      pool.onChainData?.totalShares,
      pool.onChainData?.pricePerShare,
    );
    return sum + (poolTvl ?? 0);
  }, 0);

  return (
    <div
      className={`
        ${styles.card}
        px-5 py-4
        min-w-[200px]
      `}
    >
      {/* Label */}
      <p className={cx(styles.labelPrimary, "mb-1")}>TVL on {today}</p>

      {/* Value */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-dimensional-gray flex-shrink-0" />

        {isLoading ? (
          <Shimmer size="heading" width="w-32" />
        ) : (
          <ContentReveal variant="fade-in" className="flex items-center gap-2">
            <span
              className={cx(styles.valueLg, "font-mono text-dimensional-gray")}
            >
              {formatTvlCompact(totalTvl, "USD")}
            </span>
          </ContentReveal>
        )}
      </div>
    </div>
  );
}
