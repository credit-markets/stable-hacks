"use client";

import type { PipelineKey } from "@/services/api";
import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export function usePipelineKeysQuery() {
  const { user } = useDynamicContext();

  return useQuery({
    queryKey: ["pipelineKeys"],
    queryFn: async () => {
      const response = await api.get<{ pipeline_keys: PipelineKey[] }>(
        "/pools/admin/pipeline-keys",
      );
      return response.data.pipeline_keys;
    },
    enabled: !!user,
  });
}
