"use client";

import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface MyInvestmentRequest {
  correlationId: string;
  poolId: string;
  poolTitle: string;
  amount: number;
  latestEvent: string;
  createdAt: string;
}

export function useMyInvestmentRequests() {
  const { user } = useDynamicContext();

  return useQuery<MyInvestmentRequest[]>({
    queryKey: ["my-investment-requests"],
    queryFn: async () => {
      const response = await api.get<MyInvestmentRequest[]>(
        "/portfolio/investment-requests",
      );
      return response.data;
    },
    enabled: !!user,
    staleTime: 15 * 1000,
  });
}
