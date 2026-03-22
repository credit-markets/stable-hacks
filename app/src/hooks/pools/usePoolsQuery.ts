"use client";

import { getPools } from "@/services/poolService";
import { queryConfigs } from "@/utils/queryUtils";
import { useQuery } from "@tanstack/react-query";

export type SortByOption =
  | "target_return_rate"
  | "created_at"
  | "title"
  | "minimum_investment"
  | "risk_score";
export type SortOrderOption = "ascending" | "descending";

interface UsePoolsQueryOptions {
  queryFilter?: string;
  sortBy?: SortByOption;
  sortOrder?: SortOrderOption;
}

export function usePoolsQuery({
  queryFilter,
  sortBy,
  sortOrder = "descending",
}: UsePoolsQueryOptions = {}) {
  const params = new URLSearchParams();

  if (queryFilter) {
    for (const [key, value] of new URLSearchParams(queryFilter)) {
      params.append(key, value);
    }
  }

  if (sortBy && !params.has("sortBy")) {
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
  }

  const queryString = params.toString();

  return useQuery({
    queryKey: ["pools", queryString],
    queryFn: () => getPools(queryString),
    ...queryConfigs,
  });
}
