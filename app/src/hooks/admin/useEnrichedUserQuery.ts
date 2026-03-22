"use client";

import type { EnrichedUser } from "@/services/api";
import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export function useEnrichedUserQuery(userId?: string) {
  const { user } = useDynamicContext();

  return useQuery({
    queryKey: ["enrichedUser", userId],
    queryFn: async () => {
      const response = await api.get<EnrichedUser>(`/users/id/${userId}`);
      return response.data;
    },
    enabled: !!user && !!userId,
  });
}
