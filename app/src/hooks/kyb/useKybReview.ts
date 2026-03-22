"use client";

import { kybService } from "@/services/kybService";
import type { KybSubmission } from "@/types/kyb";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get a KYB submission for review (attester view)
 */
export function useKybReview(id: string) {
  const { user } = useDynamicContext();

  return useQuery<KybSubmission>({
    queryKey: ["kyb", "review", id],
    queryFn: () => kybService.getReview(id),
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
