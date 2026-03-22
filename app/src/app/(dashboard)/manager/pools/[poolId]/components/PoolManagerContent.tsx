"use client";

import { ContentWrapper } from "@/components/HeroSection";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { usePoolManagerData } from "@/hooks/managers/usePoolManagerData";
import { useInvestmentRequests } from "@/hooks/pools/useInvestmentRequests";
import { useRedemptionRequests } from "@/hooks/useRedemptionRequests";
import { cx, styles } from "@/lib/styleClasses";
import { getPoolTokenSymbol } from "@/lib/utils/tvl";
import { useState } from "react";
import { ActionsBar } from "./ActionsBar";
import { FlowSummary } from "./FlowSummary";
import { InvestmentQueueTab } from "./InvestmentQueueTab";
import { LiquidityCard } from "./LiquidityCard";
import { PoolInfoStrip } from "./PoolInfoStrip";
import { RedemptionQueueTab } from "./RedemptionQueueTab";
import { TransactionHistoryCard } from "./TransactionHistoryCard";

interface PoolManagerContentProps {
  poolId: string;
}

export function PoolManagerContent({ poolId }: PoolManagerContentProps) {
  const [activeQueueTab, setActiveQueueTab] = useState<
    "investments" | "redemptions"
  >("investments");
  const { data: pool, isLoading, isError } = usePoolManagerData(poolId);
  const { data: investmentRequests } = useInvestmentRequests(poolId);
  const { data: redemptionRequests } = useRedemptionRequests(poolId);

  if (isLoading) {
    return <LoadingOverlay height="lg" />;
  }

  if (isError || !pool) {
    return (
      <ContentWrapper className="py-6">
        <div className={styles.sectionGap}>
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Manager", href: "/manager" },
              { label: "Pool" },
            ]}
          />
          <div className={cx(styles.card, "p-8 text-center")}>
            <p className={styles.bodyMd}>
              {isError ? "Failed to load pool data." : "Pool not found."}
            </p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper className="py-6">
      <div className={styles.sectionGap}>
        {/* Back Navigation */}
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Manager", href: "/manager" },
            { label: pool.title },
          ]}
        />

        {/* Pool Info Strip */}
        <PoolInfoStrip pool={pool} />

        {/* Liquidity Card */}
        <LiquidityCard pool={pool} />

        {/* Actions Bar */}
        <ActionsBar pool={pool} poolId={poolId} />

        {/* Queue Card */}
        <div className={cx(styles.card, "overflow-hidden")}>
          {/* Flow summaries - always visible */}
          <FlowSummary
            investmentRequests={investmentRequests || []}
            redemptionRequests={redemptionRequests || []}
            tokenSymbol={getPoolTokenSymbol(pool.currency, pool.asset_mint)}
          />

          {/* Tab navigation */}
          <div className="flex gap-6 px-6 pt-4">
            <button
              type="button"
              className={cx(
                styles.navTab,
                activeQueueTab === "investments"
                  ? styles.navTabActive
                  : styles.navTabInactive,
              )}
              onClick={() => setActiveQueueTab("investments")}
            >
              INVESTMENTS
            </button>
            <button
              type="button"
              className={cx(
                styles.navTab,
                activeQueueTab === "redemptions"
                  ? styles.navTabActive
                  : styles.navTabInactive,
              )}
              onClick={() => setActiveQueueTab("redemptions")}
            >
              REDEMPTIONS
            </button>
          </div>

          {/* Gradient separator */}
          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-border-default to-transparent mt-2" />

          {/* Tab content */}
          <div className="p-3 sm:p-5">
            {activeQueueTab === "investments" && (
              <InvestmentQueueTab
                poolId={poolId}
                tokenSymbol={getPoolTokenSymbol(pool.currency, pool.asset_mint)}
              />
            )}
            {activeQueueTab === "redemptions" && (
              <RedemptionQueueTab poolId={poolId} />
            )}
          </div>
        </div>

        {/* Transaction History */}
        <TransactionHistoryCard poolId={poolId} />
      </div>
    </ContentWrapper>
  );
}
