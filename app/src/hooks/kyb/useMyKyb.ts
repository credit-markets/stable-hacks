"use client";

import { kybService } from "@/services/kybService";
import type { KybSubmission } from "@/types/kyb";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get the current user's KYB submission
 */
export function useMyKyb() {
  const { user } = useDynamicContext();

  return useQuery<KybSubmission>({
    queryKey: ["kyb", "me"],
    queryFn: () => kybService.getMySubmission(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
