import { MarketplacePoolCard } from "@/components/pools/MarketplacePoolCard";
import { styles } from "@/lib/styleClasses";
import type { Pool } from "@/services/api";

interface PoolCardsGridProps {
  pools: Pool[];
}

export function PoolCardsGrid({ pools }: PoolCardsGridProps) {
  return (
    <div className={styles.gridPools}>
      {pools.map((pool) => (
        <MarketplacePoolCard key={pool.id} pool={pool} />
      ))}
    </div>
  );
}
