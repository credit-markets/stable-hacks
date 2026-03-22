"use client";

import { adminProfileService } from "@/services/adminProfileService";
import type { AdminProfilesResponse } from "@/services/adminProfileService";
import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

/**
 * Hook to fetch all managers for admin management.
 */
export function useAdminManagers(page = 1, pageSize = 10) {
  const { user } = useDynamicContext();

  const query = useQuery<AdminProfilesResponse>({
    queryKey: ["adminManagers", page, pageSize],
    queryFn: () => adminProfileService.getProfiles({ page, pageSize }),
    enabled: !!user,
  });

  return { ...query };
}

/**
 * Mutation to register a new manager by wallet address.
 */
export function useRegisterManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletAddress: string) => {
      const response = await api.post("/managers/admin/register", {
        wallet_address: walletAddress,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminManagers"] });
      queryClient.invalidateQueries({ queryKey: ["userRoles"] });
    },
  });
}

/**
 * Mutation to remove a manager.
 */
export function useRemoveManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (managerId: string) => {
      return adminProfileService.deleteProfile(managerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminManagers"] });
      queryClient.invalidateQueries({ queryKey: ["userRoles"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to remove manager");
    },
  });
}
