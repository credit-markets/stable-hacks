"use client";

import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface RedemptionRequest {
  correlationId: string;
  investorAddress: string;
  shares: number;
  latestEvent: string;
  createdAt: string;
}

export function useRedemptionRequests(poolId?: string) {
  const { user } = useDynamicContext();

  return useQuery<RedemptionRequest[]>({
    queryKey: ["redemption-requests", poolId],
    queryFn: async () => {
      const endpoint = poolId
        ? `/pools/${poolId}/redemption-requests`
        : "/pools/admin/redemption-requests";
      const response = await api.get<RedemptionRequest[]>(endpoint);
      return response.data;
    },
    enabled: !!user,
    staleTime: 15 * 1000,
  });
}
