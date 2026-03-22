"use client";

import { api } from "@/services/api";
import type { HoldingsResponse } from "@/types/portfolio";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get manager investments with pagination
 * @param managerAddress - Manager address
 * @param page - Page number (default: 1)
 * @param pageSize - Page size (default: 5)
 */
export function useManagerInvestments(
  managerAddress?: string,
  page = 1,
  pageSize = 5,
) {
  const { user } = useDynamicContext();

  return useQuery<HoldingsResponse, Error, HoldingsResponse>({
    queryKey: ["manager-investments", managerAddress, page, pageSize],
    queryFn: async () => {
      if (!managerAddress) {
        return {
          data: [],
          pagination: {
            total: 0,
            page: 1,
            pageSize: pageSize,
            totalPages: 0,
          },
        };
      }

      const response = await api.get<HoldingsResponse>(
        `/managers/${managerAddress}/investments`,
        {
          params: { page, pageSize },
        },
      );

      return response.data;
    },
    enabled: !!user && !!managerAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
