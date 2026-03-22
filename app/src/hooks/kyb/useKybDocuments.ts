"use client";

import { kybService } from "@/services/kybService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to upload a document to a KYB submission
 */
export function useUploadKybDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; formData: FormData }) =>
      kybService.uploadDocument(vars.id, vars.formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}

/**
 * Hook to delete a document from a KYB submission
 */
export function useDeleteKybDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; docId: string }) =>
      kybService.deleteDocument(vars.id, vars.docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyb", "me"] });
    },
  });
}
