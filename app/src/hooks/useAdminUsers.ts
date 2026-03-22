"use client";

import { api } from "@/services/api";
import type { EnrichedUser } from "@/services/api";
import type { PaginatedResponse } from "@/types/pagination";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface UseAdminUsersOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ascending" | "descending";
  filter?: string;
}

async function fetchAdminUsers(
  params: string,
): Promise<PaginatedResponse<EnrichedUser>> {
  const response = await api.get(`/users/all?${params}`);
  return response.data;
}

export function useAdminUsers(options: UseAdminUsersOptions = {}) {
  const { user } = useDynamicContext();

  const {
    page = 1,
    pageSize = 10,
    sortBy = "created_at",
    sortOrder = "descending",
    filter = "",
  } = options;

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("pageSize", String(pageSize));
    params.append("sortBy", String(sortBy));
    params.append("sortOrder", String(sortOrder));

    if (filter) {
      params.append("search", filter);
    }

    return params.toString();
  };

  const usersQuery = useQuery<PaginatedResponse<EnrichedUser>>({
    queryKey: ["users", page, pageSize, sortBy, sortOrder, filter],
    queryFn: () => fetchAdminUsers(buildQueryParams()),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  return {
    users: usersQuery.data?.data || [],
    pagination: usersQuery.data?.pagination,
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
  };
}
