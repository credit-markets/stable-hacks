"use client";

import type { Pool } from "@/services/api";
import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface UseAdminPoolsOptions {
  poolType?: string;
  deployed?: boolean;
}

export function useAdminPoolsQuery(options: UseAdminPoolsOptions = {}) {
  const { user } = useDynamicContext();
  const { poolType, deployed } = options;

  return useQuery({
    queryKey: ["adminPools", poolType, deployed],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (poolType) params.append("pool_type", poolType);
      if (deployed !== undefined) params.append("deployed", String(deployed));

      const response = await api.get<Pool[]>(
        `/pools/admin/all?${params.toString()}`,
      );
      return response.data;
    },
    enabled: !!user,
  });
}
