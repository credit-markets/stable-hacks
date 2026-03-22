"use client";

import { kybService } from "@/services/kybService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to submit a KYB submission for review
 */
export function useSubmitKyb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kybService.submitForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}
