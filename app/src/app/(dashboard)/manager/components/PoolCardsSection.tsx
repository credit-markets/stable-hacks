"use client";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { cx, styles } from "@/lib/styleClasses";
import type { PoolsResponse } from "@/types/pools";
import { PoolCardsGrid } from "./PoolCardsGrid";

interface PoolCardsSectionProps {
  pools?: PoolsResponse;
  isLoading?: boolean;
  title?: string;
  className?: string;
}

export function PoolCardsSection({
  pools,
  isLoading = false,
  title = "Your Pools",
  className = "",
}: PoolCardsSectionProps) {
  const poolsData = pools?.data || [];

  return (
    <section className={cx("w-full flex flex-col gap-6", className)}>
      <div className="flex justify-between items-center">
        <h2 className={styles.headingMd}>{title}</h2>
      </div>

      {isLoading ? (
        <LoadingOverlay height="md" />
      ) : poolsData.length > 0 ? (
        <PoolCardsGrid pools={poolsData} />
      ) : (
        <div
          className={cx(
            styles.card,
            "text-center py-12 px-6 flex flex-col items-center gap-4",
          )}
        >
          <p className={styles.bodyMd}>No pools found.</p>
          <p className={styles.bodySm}>
            Contact admin to set up your first pool.
          </p>
        </div>
      )}
    </section>
  );
}
