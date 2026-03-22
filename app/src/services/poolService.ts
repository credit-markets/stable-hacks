import type { PoolsResponse } from "@/types/pools";
import { type Pool, api } from "./api";

export const getPool = async (poolIdOrAddress: string): Promise<Pool> => {
  // Check if it's a blockchain address (Solana base58: 32-44 chars, no 0x prefix)
  const isBlockchainAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(
    poolIdOrAddress,
  );

  const endpoint = isBlockchainAddress
    ? `/pools/by-address/${poolIdOrAddress}`
    : `/pools/by-id/${poolIdOrAddress}`;

  const response = await api.get<Pool>(endpoint);
  return response.data;
};

export const getPoolById = async (poolId: string): Promise<Pool> => {
  return getPool(poolId);
};

export const getPoolByAddress = async (address: string): Promise<Pool> => {
  const response = await api.get<Pool>(`/pools/by-address/${address}`);
  return response.data;
};

export const getPools = async (params?: string): Promise<PoolsResponse> => {
  let url = "/pools";
  if (params) {
    const paramsFormatted = params.replace("size=", "pageSize=");
    url += `?${paramsFormatted}`;
  }

  const response = await api.get<PoolsResponse>(url);
  return response.data;
};

export const deletePool = async (poolId: string): Promise<void> => {
  await api.delete(`/pools/${poolId}`);
};

export const getManagerPools = async (): Promise<PoolsResponse> => {
  const response = await api.get<PoolsResponse>("/pools/manager");
  return response.data;
};

export interface NavPricePoint {
  price: number;
  recorded_at: string;
}

export const getNavHistory = async (
  poolId: string,
  options?: { from?: string; to?: string },
): Promise<NavPricePoint[]> => {
  const params = new URLSearchParams();
  if (options?.from) params.append("from", options.from);
  if (options?.to) params.append("to", options.to);

  const response = await api.get<NavPricePoint[]>(
    `/pools/${poolId}/nav-history?${params.toString()}`,
  );
  return response.data;
};

// Backward compatibility: namespace object
export const poolService = {
  getPool,
  getPoolById,
  getPoolByAddress,
  getPools,
  deletePool,
  getManagerPools,
};
