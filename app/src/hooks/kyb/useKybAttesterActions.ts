"use client";

import { kybService } from "@/services/kybService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to approve a KYB submission
 */
export function useApproveKyb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; data?: Record<string, unknown> }) =>
      kybService.approve(vars.id, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "review", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}

/**
 * Hook to reject a KYB submission
 */
export function useRejectKyb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; data: Record<string, unknown> }) =>
      kybService.reject(vars.id, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "review", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}

/**
 * Hook to request resubmission of a KYB submission
 */
export function useRequestResubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; data: Record<string, unknown> }) =>
      kybService.requestResubmission(vars.id, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "review", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}

/**
 * Hook to revoke a KYB approval
 */
export function useRevokeKyb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; data?: Record<string, unknown> }) =>
      kybService.revoke(vars.id, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "review", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}

/**
 * Hook to confirm an on-chain attestation transaction
 */
export function useConfirmAttestation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; data: Record<string, unknown> }) =>
      kybService.confirmAttestation(vars.id, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "review", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}
