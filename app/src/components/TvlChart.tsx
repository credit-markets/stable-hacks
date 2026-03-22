"use client";

import { CHART_BLUE } from "@/constants/chartColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTVL } from "@/hooks/useTVL";
import { formatDate } from "@/utils/formatDate";
import { formatPrice } from "@/utils/formatPrice";
import { Card, CardBody } from "@nextui-org/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

const CustomTooltip = ({
  active,
  payload,
}: TooltipProps<string, string | number>) => {
  if (!active || !payload) return null;

  return (
    <div className="rounded bg-neutral-medium-white p-2 text-xs">
      <p className="label">Date</p>
      {payload.map((entry, index: number) => (
        <p
          key={`item-${index}`}
        >{`${formatDate(entry?.payload.date as string)}: ${formatPrice(
          Number(entry.value),
        )}`}</p>
      ))}
    </div>
  );
};

export function TvlChart() {
  const prefersReducedMotion = useReducedMotion();
  const { data } = useTVL();

  return (
    <Card
      shadow="sm"
      className="max-w-[747px] rounded-lg border border-subtle bg-surface-card shadow-card"
    >
      <CardBody className="flex-col justify-between gap-4 p-4 sm:p-6 md:flex-row md:items-end">
        <div className="flex flex-col gap-4">
          <p className="font-medium leading-5 text-primary">
            Total value locked (TVL)
          </p>
          <p className="font-bold text-lg text-primary">
            {`${formatPrice(Number(data?.total ?? 0), undefined, {
              style: "decimal",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })} USD`}
          </p>
        </div>

        <div className="h-[64px] w-full max-w-[386px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              width={385}
              height={64}
              data={data?.datapoints}
              margin={{
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={CHART_BLUE[300]}
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="80%"
                    stopColor={CHART_BLUE[300]}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_BLUE[500]}
                fill="url(#colorGradient)"
                isAnimationActive={!prefersReducedMotion}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
