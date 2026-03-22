"use client";

import { notaFiscalService } from "@/services/notaFiscalService";
import type {
  NotaFiscalAggregates,
  NotaFiscalItemsResponse,
} from "@/types/notaFiscal";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch paginated nota fiscal items for a pool.
 */
export function useNotaFiscalItems(
  poolId: string | undefined,
  page = 1,
  pageSize = 20,
) {
  return useQuery<NotaFiscalItemsResponse>({
    queryKey: ["nota-fiscal-items", poolId, page, pageSize],
    queryFn: () =>
      notaFiscalService.getItems(poolId as string, { page, pageSize }),
    enabled: !!poolId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch aggregated nota fiscal data for a pool.
 */
export function useNotaFiscalAggregates(poolId: string | undefined) {
  return useQuery<NotaFiscalAggregates>({
    queryKey: ["nota-fiscal-aggregates", poolId],
    queryFn: () => notaFiscalService.getAggregates(poolId as string),
    enabled: !!poolId,
    staleTime: 5 * 60 * 1000,
  });
}
