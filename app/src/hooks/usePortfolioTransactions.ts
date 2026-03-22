"use client";

import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface PortfolioTransaction {
  id: string;
  eventType: string;
  poolId: string;
  poolTitle: string;
  tokenSymbol: string;
  amount: number | null;
  shares: number | null;
  chainTxId: string | null;
  createdAt: string;
}

interface TransactionResponse {
  data: PortfolioTransaction[];
  total: number;
  page: number;
  size: number;
}

export function usePortfolioTransactions(page: number, size = 10) {
  const { user } = useDynamicContext();

  return useQuery<TransactionResponse>({
    queryKey: ["portfolio-transactions", page, size],
    queryFn: async () => {
      const response = await api.get<TransactionResponse>(
        `/portfolio/transactions?page=${page}&size=${size}`,
      );
      return response.data;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}
