"use client";

import { kybService } from "@/services/kybService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to add a UBO to a KYB submission
 */
export function useAddUbo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; data: Record<string, unknown> }) =>
      kybService.addUbo(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}

/**
 * Hook to update a UBO on a KYB submission
 */
export function useUpdateUbo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      id: string;
      uboId: string;
      data: Record<string, unknown>;
    }) => kybService.updateUbo(vars.id, vars.uboId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}

/**
 * Hook to delete a UBO from a KYB submission
 */
export function useDeleteUbo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; uboId: string }) =>
      kybService.deleteUbo(vars.id, vars.uboId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}
