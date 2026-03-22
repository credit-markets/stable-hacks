"use client";

import { kybService } from "@/services/kybService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to update a KYB submission
 */
export function useUpdateKyb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; data: Record<string, unknown> }) =>
      kybService.updateSubmission(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}
