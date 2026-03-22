"use client";

import { kybService } from "@/services/kybService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to add a wallet declaration to a KYB submission
 */
export function useAddWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; data: Record<string, unknown> }) =>
      kybService.addWallet(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}

/**
 * Hook to delete a wallet declaration from a KYB submission
 */
export function useDeleteWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; walletId: string }) =>
      kybService.deleteWallet(vars.id, vars.walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}
