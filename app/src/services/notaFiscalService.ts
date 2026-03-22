import { api } from "@/services/api";
import type {
  NotaFiscalAggregates,
  NotaFiscalItemsResponse,
} from "@/types/notaFiscal";

export const notaFiscalService = {
  async getItems(
    poolId: string,
    params?: { page?: number; pageSize?: number },
  ): Promise<NotaFiscalItemsResponse> {
    const urlParams = new URLSearchParams();
    if (params?.page) urlParams.append("page", String(params.page));
    if (params?.pageSize) urlParams.append("pageSize", String(params.pageSize));

    const queryString = urlParams.toString();
    const url = queryString
      ? `/nota-fiscal-items/pool/${encodeURIComponent(poolId)}?${queryString}`
      : `/nota-fiscal-items/pool/${encodeURIComponent(poolId)}`;

    const response = await api.get<NotaFiscalItemsResponse>(url);
    return response.data;
  },

  async getAggregates(poolId: string): Promise<NotaFiscalAggregates> {
    const response = await api.get<NotaFiscalAggregates>(
      `/nota-fiscal-items/pool/${encodeURIComponent(poolId)}/aggregates`,
    );
    return response.data;
  },
};
