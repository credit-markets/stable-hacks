"use client";

import { managerService } from "@/services/managerService";
import type { ManagerProfileFormValues } from "@/types/manager";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to update manager profile
 */
export function useUpdateManagerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      managerId,
      data,
    }: {
      managerId: string;
      data: Partial<ManagerProfileFormValues>;
    }) => managerService.updateProfile(managerId, data),
    onSuccess: () => {
      // Invalidate profile queries to refetch
      queryClient.invalidateQueries({ queryKey: ["manager-profile"] });
      queryClient.invalidateQueries({ queryKey: ["adminManagers"] });
    },
  });
}
