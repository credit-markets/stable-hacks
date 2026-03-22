"use client";

import useUserRole from "@/hooks/useUserRole";
import { managerService } from "@/services/managerService";
import type { ManagerProfileResponse } from "@/types/manager";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get manager profile.
 * Only fetches when the user has a manager role (or when looking up by address).
 * @param address - Optional manager address. If not provided, uses current user's address
 */
export function useManagerProfile(address?: string) {
  const { primaryWallet, user } = useDynamicContext();
  const { data: roles } = useUserRole();
  const userAddress = address || primaryWallet?.address;

  return useQuery<ManagerProfileResponse | null>({
    queryKey: ["manager-profile", userAddress],
    queryFn: () =>
      address
        ? managerService.getProfileByAddress(address)
        : managerService.getProfile(),
    enabled: !!user && !!userAddress && (!!address || !!roles?.isManager),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
