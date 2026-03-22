"use client";
import { api } from "@/services/api";
import type { PortfolioSummary } from "@/types/portfolio";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Fetches the pre-computed portfolio summary from the backend.
 * Single query replaces the old N+1 pattern (investments + pool details + risk scores).
 */
export function usePortfolioSummary() {
  const { user } = useDynamicContext();

  return useQuery<PortfolioSummary>({
    queryKey: ["portfolio-summary"],
    queryFn: async () => {
      const response = await api.get<PortfolioSummary>("/portfolio/summary");
      return response.data;
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
