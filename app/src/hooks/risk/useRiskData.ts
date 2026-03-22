"use client";

import { riskService } from "@/services/riskService";
import type {
  FidcMonthly,
  MetricDefinitions,
  PoolRiskScore,
  TidcMonthly,
} from "@/types/risk";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export function useRiskScore(pipelineKey: string | undefined) {
  const { user } = useDynamicContext();
  return useQuery<PoolRiskScore>({
    queryKey: ["risk", "score", pipelineKey],
    queryFn: () => riskService.getScore(pipelineKey as string),
    enabled: !!pipelineKey && !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRiskMonthly(pipelineKey: string | undefined, limit = 60) {
  const { user } = useDynamicContext();
  return useQuery<(FidcMonthly | TidcMonthly)[]>({
    queryKey: ["risk", "monthly", pipelineKey, limit],
    queryFn: () => riskService.getMonthly(pipelineKey as string, limit),
    enabled: !!pipelineKey && !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRiskDefinitions() {
  const { user } = useDynamicContext();
  return useQuery<MetricDefinitions>({
    queryKey: ["risk", "definitions"],
    queryFn: () => riskService.getDefinitions(),
    enabled: !!user,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
