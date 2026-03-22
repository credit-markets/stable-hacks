"use client";

import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface InvestmentRequest {
  correlationId: string;
  investorAddress: string;
  amount: number;
  latestEvent: string;
  createdAt: string;
}

export function useInvestmentRequests(poolId?: string) {
  const { user } = useDynamicContext();

  return useQuery<InvestmentRequest[]>({
    queryKey: ["investment-requests", poolId],
    queryFn: async () => {
      const endpoint = poolId
        ? `/pools/${poolId}/investment-requests`
        : "/pools/admin/investment-requests";
      const response = await api.get<InvestmentRequest[]>(endpoint);
      return response.data;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}
