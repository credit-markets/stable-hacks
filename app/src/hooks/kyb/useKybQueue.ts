"use client";

import { kybService } from "@/services/kybService";
import type { KybQueueResponse } from "@/types/kyb";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get the KYB review queue (attester view)
 */
export function useKybQueue(filters?: Record<string, unknown>) {
  const { user } = useDynamicContext();

  return useQuery<KybQueueResponse>({
    queryKey: ["kyb", "queue", filters],
    queryFn: () => kybService.getQueue(filters),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });
}
