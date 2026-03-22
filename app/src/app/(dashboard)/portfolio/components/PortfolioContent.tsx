"use client";

import { PendingRequestsCard } from "@/components/portfolio/PendingRequestsCard";
import { PortfolioRiskPanel } from "@/components/portfolio/PortfolioRiskPanel";
import { PositionsTable } from "@/components/portfolio/PositionsTable";
import { TransactionHistoryCard } from "@/components/portfolio/TransactionHistoryCard";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ContentReveal } from "@/components/ui/skeletons";
import { usePortfolioSummary } from "@/hooks/usePortfolio";
import { cx, styles } from "@/lib/styleClasses";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

// ─────────────────────────────────────────────────────────────────────────────
// Dark Strip metric item
// ─────────────────────────────────────────────────────────────────────────────

function StripMetric({
  label,
  value,
  isHero,
}: {
  label: string;
  value: string;
  isHero?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={styles.terminalStripDarkLabel}>{label}</span>
      <span
        className={
          isHero
            ? "text-[22px] font-bold text-white tabular-nums"
            : "text-sm font-semibold text-white tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function PortfolioContent() {
  const { user } = useDynamicContext();
  const { data: summary, isLoading } = usePortfolioSummary();

  // Show spinner while wallet is connecting or portfolio data is loading
  if (!user || isLoading) {
    return <LoadingOverlay height="lg" />;
  }

  // ── Format values ───────────────────────────────────────────────────────

  const totalInvested = summary?.totalInvested ?? 0;
  const currentValue = summary?.currentValue ?? 0;
  const unrealizedPnL = summary?.unrealizedPnl ?? 0;
  const weightedAvgReturn = summary?.weightedAvgReturn ?? 0;
  const weightedCreditScore = summary?.weightedCreditScore ?? null;

  const fmtCompact = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
    return `${sign}${abs.toFixed(2)}`;
  };
  const fmtTotalInvested = fmtCompact(totalInvested);
  const fmtCurrentValue = fmtCompact(currentValue);
  const fmtPnL = fmtCompact(unrealizedPnL);

  const fmtAvgReturn = `${weightedAvgReturn.toFixed(1)}% p.a.`;

  const fmtCreditScore =
    weightedCreditScore != null
      ? `${Math.round(weightedCreditScore)} / 100`
      : "\u2014";

  return (
    <div className={styles.sectionGap}>
      {/* ══════════════ Dark Strip — 5 metrics ══════════════ */}
      <ContentReveal variant="fade-up">
        <div
          className={cx(styles.terminalStripDark, styles.terminalStripDarkBg)}
        >
          <div className={styles.terminalStripDarkAccent} />

          {/* Mobile layout */}
          <div className="sm:hidden space-y-3">
            <StripMetric label="Current Value" value={fmtCurrentValue} isHero />
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <StripMetric label="Total Invested" value={fmtTotalInvested} />
              <StripMetric label="Unrealized P&L" value={fmtPnL} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <StripMetric label="Wtd. Avg Return" value={fmtAvgReturn} />
              <StripMetric label="Wtd. Credit Score" value={fmtCreditScore} />
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden sm:flex sm:items-center sm:gap-0 sm:flex-wrap">
            <div className="flex flex-col gap-0.5 pr-8">
              <span className={styles.terminalStripDarkLabel}>
                Current Value
              </span>
              <span className="text-[22px] font-bold text-white tabular-nums">
                {fmtCurrentValue}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 px-8 border-l border-white/12">
              <span className={styles.terminalStripDarkLabel}>
                Total Invested
              </span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {fmtTotalInvested}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 px-8 border-l border-white/12">
              <span className={styles.terminalStripDarkLabel}>
                Unrealized P&L
              </span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {fmtPnL}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 px-8 border-l border-white/12">
              <span className={styles.terminalStripDarkLabel}>
                Wtd. Avg Return
              </span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {fmtAvgReturn}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 pl-8 border-l border-white/12">
              <span className={styles.terminalStripDarkLabel}>
                Wtd. Credit Score
              </span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {fmtCreditScore}
              </span>
            </div>
          </div>
        </div>
      </ContentReveal>

      {/* ══════════════ Analytics Row — 2 cards ══════════════ */}
      <ContentReveal variant="fade-up">
        <PortfolioRiskPanel
          positions={summary?.positions ?? []}
          allocation={summary?.allocation ?? []}
          weightedCreditScore={weightedCreditScore}
          totalInvested={totalInvested}
          isLoading={isLoading}
        />
      </ContentReveal>

      {/* ══════════════ Holdings Table ══════════════ */}
      <ContentReveal variant="fade-up">
        <PositionsTable
          positions={summary?.positions ?? []}
          isLoading={isLoading}
        />
      </ContentReveal>

      {/* ══════════════ Pending Requests (hidden when empty) ══════════════ */}
      <ContentReveal variant="fade-up">
        <PendingRequestsCard />
      </ContentReveal>

      {/* ══════════════ Transaction History ══════════════ */}
      <ContentReveal variant="fade-up">
        <TransactionHistoryCard />
      </ContentReveal>
    </div>
  );
}
