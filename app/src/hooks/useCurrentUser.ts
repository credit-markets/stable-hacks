"use client";

import { api } from "@/services/api";
import type { DBUserData } from "@/types/auth";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

/**
 * Extended user data type that includes auth token and wallet address for compatibility
 */
export type ExtendedUserData = DBUserData & {
  walletAddress: string | undefined;
};

/**
 * Hook to fetch current authenticated user data from the backend.
 *
 * User data is fetched from the `/users/me` endpoint and cached client-side with React Query.
 *
 * @returns React Query result with user data, loading state, and error handling
 *
 * @example
 * ```tsx
 * const { data: user, isLoading, error } = useCurrentUser();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error />;
 *
 * return <div>Welcome, {user.account}</div>;
 * ```
 */
export function useCurrentUser() {
  const { user, primaryWallet } = useDynamicContext();

  return useQuery<ExtendedUserData>({
    queryKey: ["currentUser", user?.userId, primaryWallet?.address],
    queryFn: async () => {
      const { data } = await api.get<DBUserData>("/users/me");

      return {
        ...data,
        walletAddress: primaryWallet?.address,
      };
    },
    enabled: !!user && (!!user?.userId || !!primaryWallet?.address),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
    retryDelay: 1000,
  });
}
