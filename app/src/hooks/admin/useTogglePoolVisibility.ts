"use client";

import { api } from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useTogglePoolVisibility() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { poolId: string; isVisible: boolean }>({
    mutationFn: async ({ poolId, isVisible }) => {
      await api.patch(`/pools/${poolId}/visibility`, {
        is_visible: isVisible,
      });
    },
    onSuccess: () => {
      toast.success("Pool visibility updated");
      queryClient.invalidateQueries({ queryKey: ["adminPools"] });
      queryClient.invalidateQueries({ queryKey: ["pools"] });
      queryClient.invalidateQueries({ queryKey: ["manager-pools"] });
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      toast.error(`Failed to update visibility: ${msg}`);
    },
  });
}
