"use client";

import { getManagerPoolsList } from "@/services/managerService";
import type { PoolsResponse } from "@/types/pools";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get manager pools
 * @param params - Optional query parameters
 */
export function useManagerPools(params?: string) {
  const { user } = useDynamicContext();

  return useQuery<PoolsResponse>({
    queryKey: ["manager-pools", params],
    queryFn: () => getManagerPoolsList(params),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
