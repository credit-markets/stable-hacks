"use client";

import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface InvestorBalanceStates {
  freeShares: string;
  lockedShares: string;
  claimableUsdc: string;
  usdcBalance: string;
}

export function useInvestorBalanceStates(poolId: string) {
  const { user } = useDynamicContext();

  return useQuery<InvestorBalanceStates>({
    queryKey: ["investor-balance-states", poolId],
    queryFn: async () => {
      const response = await api.get<InvestorBalanceStates>(
        `/pools/${poolId}/investor/balance-states`,
      );
      return response.data;
    },
    enabled: !!user && !!poolId,
    staleTime: 15 * 1000,
  });
}
