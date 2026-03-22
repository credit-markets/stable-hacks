"use client";

import { Shimmer } from "@/components/ui/skeletons";
import { getChartBlue } from "@/constants/chartColors";
import { cx, styles } from "@/lib/styleClasses";
import type {
  FidcMonthly,
  FidcRiskScore,
  PoolRiskScore,
  TidcMonthly,
  TidcRiskScore,
} from "@/types/risk";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PerformancePanelProps {
  score: PoolRiskScore | undefined;
  monthly: (FidcMonthly | TidcMonthly)[] | undefined;
  poolType: "fidc" | "tidc";
}

interface CumulativePoint {
  month: string;
  cumulative: number;
}

const CHART_HEIGHT = 224;

export function PerformancePanel({
  score,
  monthly,
  poolType,
}: PerformancePanelProps) {
  const isLoading = !score && !monthly;

  // Compute headline metric
  // FIDC: mean_rentab is already a percentage number (1.22 = 1.22%).
  //   Annualize by multiplying by 12: 1.22 * 12 = 14.7% p.a.
  // TIDC: effective_yield is already a percentage (5.5 = 5.5%)
  const headlineValue = useMemo(() => {
    if (!score) return null;
    if (poolType === "fidc") {
      const fidcScore = score as FidcRiskScore;
      return fidcScore.mean_rentab != null ? fidcScore.mean_rentab * 12 : null;
    }
    const tidcScore = score as TidcRiskScore;
    return tidcScore.effective_yield ?? null;
  }, [score, poolType]);

  // Compute cumulative return chart data
  const cumulativeData = useMemo<CumulativePoint[]>(() => {
    if (!monthly || monthly.length === 0) return [];

    const sorted = [...monthly].sort((a, b) =>
      a.reference_month.localeCompare(b.reference_month),
    );

    return sorted.reduce<CumulativePoint[]>((acc, row, i) => {
      const ret =
        poolType === "fidc"
          ? (row as FidcMonthly).senior_return_mes
          : ((row as TidcMonthly).effective_yield ?? 0) / 100;
      const prev = i > 0 ? acc[i - 1].cumulative : 0;
      acc.push({
        month: row.reference_month,
        cumulative: prev + (ret ?? 0),
      });
      return acc;
    }, []);
  }, [monthly, poolType]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cx(styles.card, styles.cardPadding, "space-y-6")}>
        <Shimmer className="h-5 w-36" />
        <Shimmer className="h-8 w-32" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-5 w-16" />
            </div>
          ))}
        </div>
        <Shimmer className="h-48 w-full" />
      </div>
    );
  }

  const blue500 = getChartBlue(500);
  const blue300 = getChartBlue(300);

  const fidcScore =
    poolType === "fidc" ? (score as FidcRiskScore | undefined) : undefined;
  const tidcScore =
    poolType === "tidc" ? (score as TidcRiskScore | undefined) : undefined;

  // Format headline: value is already a percentage number, just format it
  const headlineDisplay =
    headlineValue != null ? headlineValue.toFixed(1) : "\u2014";

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <h3 className={cx(styles.headingSm, "mb-3")}>Performance</h3>

      {/* Headline return metric — black, not green */}
      <div className="mb-3.5">
        <span className={styles.labelSans}>
          {poolType === "fidc" ? "LTM Net Return" : "Effective Yield (Ann.)"}
        </span>
        <div className="mt-0.5">
          <span className="text-[28px] font-bold tabular-nums tracking-tight text-text-primary leading-none">
            {headlineDisplay}
          </span>
          <span className="text-sm font-normal text-text-muted ml-1">
            % p.a.
          </span>
        </div>
      </div>

      {/* 4-column stats grid */}
      <div className="grid grid-cols-4 gap-3 mb-3.5 pb-3.5 border-b border-[#f0f0f0]">
        {poolType === "fidc" && fidcScore && (
          <>
            <div>
              <span className={styles.labelSans}>Monthly Avg</span>
              <div className={cx(styles.valueXs, "mt-0.5")}>
                {fidcScore.mean_rentab != null
                  ? `${fidcScore.mean_rentab.toFixed(2)}%`
                  : "\u2014"}
              </div>
            </div>
            <div>
              <span className={styles.labelSans}>Volatility</span>
              <div className={cx(styles.valueXs, "mt-0.5")}>
                {fidcScore.std_rentab != null
                  ? `${fidcScore.std_rentab.toFixed(2)}%`
                  : "\u2014"}
              </div>
            </div>
            <div>
              <span className={styles.labelSans}>Sharpe</span>
              <div className={cx(styles.valueXs, "mt-0.5")}>
                {fidcScore.sharpe_ratio != null
                  ? fidcScore.sharpe_ratio.toFixed(2)
                  : "\u2014"}
              </div>
            </div>
            <div>
              <span className={styles.labelSans}>Max Drawdown</span>
              <div className={cx(styles.valueXs, "mt-0.5")}>
                {fidcScore.max_drawdown != null
                  ? `-${fidcScore.max_drawdown.toFixed(2)}%`
                  : "\u2014"}
              </div>
            </div>
          </>
        )}
        {poolType === "tidc" && tidcScore && (
          <>
            <div>
              <span className={styles.labelSans}>Monthly Avg</span>
              <div className={cx(styles.valueXs, "mt-0.5")}>
                {tidcScore.mean_monthly_yield != null
                  ? `${tidcScore.mean_monthly_yield.toFixed(2)}%`
                  : "\u2014"}
              </div>
            </div>
            <div>
              <span className={styles.labelSans}>Collection Rate</span>
              <div className={cx(styles.valueXs, "mt-0.5")}>
                {tidcScore.collection_rate != null
                  ? `${(tidcScore.collection_rate * 100).toFixed(1)}%`
                  : "\u2014"}
              </div>
            </div>
            <div>
              <span className={styles.labelSans}>Distance to Loss</span>
              <div className={cx(styles.valueXs, "mt-0.5")}>
                {tidcScore.distance_to_loss != null
                  ? `${(tidcScore.distance_to_loss * 100).toFixed(1)}%`
                  : "\u2014"}
              </div>
            </div>
            <div>
              <span className={styles.labelSans}>Expected Loss</span>
              <div className={cx(styles.valueXs, "mt-0.5")}>
                {tidcScore.expected_loss_proxy != null
                  ? `${(tidcScore.expected_loss_proxy * 100).toFixed(2)}%`
                  : "\u2014"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cumulative return area chart */}
      {cumulativeData.length > 0 ? (
        <div>
          <span className={cx(styles.labelSans, "block mb-2")}>
            Cumulative Return
          </span>
          <div className="w-full">
            <AreaChart
              width={700}
              height={CHART_HEIGHT}
              data={cumulativeData}
              margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
              style={{ width: "100%", height: "auto" }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e5e5"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#999" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#999" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
              />
              <Tooltip
                formatter={(value: number) => [
                  `${(value * 100).toFixed(2)}%`,
                  "Cumulative Return",
                ]}
                labelFormatter={(label: string) => `Month: ${label}`}
                contentStyle={{
                  fontSize: 12,
                  border: "1px solid #e5e5e5",
                  borderRadius: 6,
                  background: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={blue500}
                fill={blue300}
                fillOpacity={0.3}
                strokeWidth={2}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <span className={styles.bodySm}>
            No monthly performance data available.
          </span>
        </div>
      )}
    </div>
  );
}
