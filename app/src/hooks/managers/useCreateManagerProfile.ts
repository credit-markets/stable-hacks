"use client";

import { managerService } from "@/services/managerService";
import type { ManagerProfileFormValues } from "@/types/manager";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to create manager profile
 */
export function useCreateManagerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ManagerProfileFormValues) =>
      managerService.createProfile(data),
    onSuccess: () => {
      // Invalidate profile queries to refetch
      queryClient.invalidateQueries({ queryKey: ["manager-profile"] });
      queryClient.invalidateQueries({ queryKey: ["adminManagers"] });
      queryClient.invalidateQueries({ queryKey: ["userRoles"] });
    },
  });
}
