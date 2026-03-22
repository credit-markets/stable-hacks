"use client";

import { kybService } from "@/services/kybService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to create a new KYB draft submission
 */
export function useCreateKybDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => kybService.createDraft(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}
