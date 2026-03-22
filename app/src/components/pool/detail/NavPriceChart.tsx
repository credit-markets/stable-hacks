"use client";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { getChartBlue } from "@/constants/chartColors";
import { useNavHistory } from "@/hooks/pools/useNavHistory";
import { cx, styles } from "@/lib/styleClasses";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatPrice(value: number, symbol: string): string {
  // Backend already normalizes prices by dividing by ORACLE_PRICE_DECIMALS (1e8).
  // Values arrive as human-readable decimals (e.g. 1.0 = $1.00 per share).
  return `${value.toFixed(4)} ${symbol}`;
}

interface NavPriceChartProps {
  poolId: string;
  /** Token symbol to display alongside price values. Defaults to "USDC". */
  symbol?: string;
}

export function NavPriceChart({ poolId, symbol = "USDC" }: NavPriceChartProps) {
  const { data, isLoading } = useNavHistory(poolId);
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);

  if (isLoading) {
    return <LoadingOverlay height="md" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <p className={styles.bodySm}>No NAV price data available yet.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.recorded_at,
    price: d.price,
  }));

  const latestPrice = chartData[chartData.length - 1].price;
  const displayPrice = hoveredPrice ?? latestPrice;

  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.02;
  // Round to 4 decimal places for normalized price values (e.g. 1.0000)
  const yMin = Math.floor((minPrice - padding) * 10000) / 10000;
  const yMax = Math.ceil((maxPrice + padding) * 10000) / 10000;

  const blue500 = getChartBlue(500);
  const gradientId = `nav-${poolId}`;

  return (
    <div>
      {/* Big number — shows hovered value or latest */}
      <div className="mb-4">
        <span className={styles.labelPrimary}>Price Per Share</span>
        <div className={cx(styles.valueLg, "mt-1")}>
          {formatPrice(displayPrice, symbol)}
        </div>
      </div>

      <div className="w-full">
        <AreaChart
          width={700}
          height={220}
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
          style={{ width: "100%", height: "auto" }}
          onMouseMove={(e) => {
            if (e?.activePayload?.[0]?.value) {
              setHoveredPrice(e.activePayload[0].value as number);
            }
          }}
          onMouseLeave={() => setHoveredPrice(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={blue500} stopOpacity={0.15} />
              <stop offset="95%" stopColor={blue500} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e5e5"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(d).toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              })
            }
            tick={{ fill: "#999", fontSize: 10 }}
            axisLine={{ stroke: "#e5e5e5" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatPrice(v, symbol)}
            tick={{ fill: "#999", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={65}
            domain={[yMin, yMax]}
          />
          <Tooltip
            formatter={(value: number) => [formatPrice(value, symbol), "NAV"]}
            labelFormatter={(label: string) =>
              new Date(label).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
            contentStyle={{
              fontSize: 12,
              border: "1px solid #e5e5e5",
              borderRadius: 6,
              background: "#fff",
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={blue500}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            strokeWidth={2}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </div>
    </div>
  );
}
