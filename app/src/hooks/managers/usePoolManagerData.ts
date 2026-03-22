"use client";

import type { Pool } from "@/services/api";
import { getPool } from "@/services/poolService";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch pool details for the manager dashboard.
 * Uses the public getPool endpoint which resolves both IDs and addresses.
 */
export function usePoolManagerData(poolId: string) {
  return useQuery<Pool>({
    queryKey: ["pool-manager", poolId],
    queryFn: () => getPool(poolId),
    enabled: !!poolId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
