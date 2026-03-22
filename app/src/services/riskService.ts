import { api } from "@/services/api";
import type {
  FidcMonthly,
  MetricDefinitions,
  PoolRiskScore,
  TidcMonthly,
} from "@/types/risk";

export const riskService = {
  async getScore(pipelineKey: string): Promise<PoolRiskScore> {
    const response = await api.get<PoolRiskScore>(
      `/risk/${encodeURIComponent(pipelineKey)}/score`,
    );
    return response.data;
  },

  async getMonthly(
    pipelineKey: string,
    limit = 60,
  ): Promise<(FidcMonthly | TidcMonthly)[]> {
    const response = await api.get<(FidcMonthly | TidcMonthly)[]>(
      `/risk/${encodeURIComponent(pipelineKey)}/monthly?limit=${limit}`,
    );
    return response.data;
  },

  async getDefinitions(): Promise<MetricDefinitions> {
    const response = await api.get<MetricDefinitions>("/risk/definitions");
    return response.data;
  },
};
