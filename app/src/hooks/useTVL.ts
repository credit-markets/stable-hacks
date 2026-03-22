"use client";
import { api } from "@/services/api";
import { formatForChart } from "@/utils/dateFormatters";
import { queryConfigs } from "@/utils/queryUtils";
import { useQuery } from "@tanstack/react-query";

interface TVLData {
  totalTVL: string | number;
  tvldayDatas: Array<{
    timestamp: string | number;
    tvl: string | number;
  }>;
}

export function useTVL() {
  return useQuery({
    queryKey: ["tvl"],
    queryFn: async () => {
      const response = await api.get<TVLData>("/marketplace/tvl");

      return {
        total: Number(response.data.totalTVL),
        datapoints: response.data.tvldayDatas.map((data) => ({
          date: formatForChart(Number(data.timestamp)),
          value: Number(data.tvl),
        })),
      };
    },
    ...queryConfigs,
  });
}
