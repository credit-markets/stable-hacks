"use client";

import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export interface PoolTransaction {
  id: string;
  eventType: string;
  actor: string;
  tokenSymbol: string;
  amount: number | null;
  shares: number | null;
  chainTxId: string | null;
  createdAt: string;
}

interface PoolTransactionResponse {
  data: PoolTransaction[];
  total: number;
  page: number;
  size: number;
}

export function usePoolTransactions(
  poolId: string,
  page = 1,
  size = 10,
  typeFilter?: string,
) {
  return useQuery<PoolTransactionResponse>({
    queryKey: ["pool-transactions", poolId, page, size, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
      });
      if (typeFilter && typeFilter !== "All Types") {
        const typeMap: Record<string, string> = {
          Investment: "investment",
          Redemption: "withdrawal",
          Borrow: "pool",
          Repay: "pool",
          Window: "pool",
        };
        params.set("type", typeMap[typeFilter] ?? typeFilter);
      }
      const response = await api.get<PoolTransactionResponse>(
        `/pools/${poolId}/transactions?${params}`,
      );
      return response.data;
    },
    enabled: !!poolId,
    staleTime: 30 * 1000,
  });
}
