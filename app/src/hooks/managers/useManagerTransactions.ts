"use client";

import { api } from "@/services/api";
import type { TransactionsResponse } from "@/types/portfolio";
import { exportTransactionsToCsv } from "@/utils/exportCsv";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get manager transactions with pagination
 * Returns query result with exportTransactions utility function
 * @param managerAddress - Manager address
 * @param page - Page number (default: 1)
 * @param pageSize - Page size (default: 5)
 */
export function useManagerTransactions(
  managerAddress?: string,
  page = 1,
  pageSize = 5,
) {
  const { user } = useDynamicContext();

  const query = useQuery<TransactionsResponse, Error, TransactionsResponse>({
    queryKey: ["manager-transactions", managerAddress, page, pageSize],
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

      const response = await api.get<TransactionsResponse>(
        `/managers/${managerAddress}/transactions`,
        {
          params: { page, pageSize },
        },
      );

      return response.data;
    },
    enabled: !!user && !!managerAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  function exportTransactions() {
    if (!query.data) return;
    exportTransactionsToCsv(query.data.data, "manager-transactions.csv");
  }

  return {
    ...query,
    exportTransactions,
  };
}
