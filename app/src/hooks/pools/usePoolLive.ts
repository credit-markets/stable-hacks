"use client";

import type { Pool } from "@/services/api";
import { getPool } from "@/services/poolService";
import { useQuery } from "@tanstack/react-query";

/**
 * Hydrates server-fetched pool data into React Query and re-fetches client-side.
 * This allows the pool detail page to update on-chain data (TVL, shares, balances)
 * when mutations invalidate the ["pool", id] query key — without a full page refresh.
 */
export function usePoolLive(serverData: Pool) {
  const id = serverData.id;

  const { data } = useQuery<Pool>({
    queryKey: ["pool", id],
    queryFn: () => getPool(id),
    initialData: serverData,
    staleTime: 30 * 1000,
  });

  return data;
}
