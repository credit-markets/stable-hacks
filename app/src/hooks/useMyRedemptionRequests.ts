"use client";

import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface MyRedemptionRequest {
  correlationId: string;
  poolId: string;
  poolTitle: string;
  shares: number;
  latestEvent: string;
  createdAt: string;
  tokenSymbol: string;
}

export function useMyRedemptionRequests() {
  const { user } = useDynamicContext();

  return useQuery<MyRedemptionRequest[]>({
    queryKey: ["my-redemption-requests"],
    queryFn: async () => {
      const response = await api.get<MyRedemptionRequest[]>(
        "/portfolio/redemption-requests",
      );
      return response.data;
    },
    enabled: !!user,
    staleTime: 15 * 1000,
  });
}
