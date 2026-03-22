"use client";

import { API_URL } from "@/constants/api";
import type { ExecutionEvent } from "@/services/api";
import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface UseEventsOptions {
  eventType?: string;
  actorType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export function useEventsQuery(options: UseEventsOptions = {}) {
  const { user } = useDynamicContext();
  const {
    eventType,
    actorType,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
  } = options;

  return useQuery({
    queryKey: [
      "adminEvents",
      eventType,
      actorType,
      dateFrom,
      dateTo,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));
      if (eventType) params.append("event_type", eventType);
      if (actorType) params.append("actor_type", actorType);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const response = await api.get<{
        data: ExecutionEvent[];
        pagination: {
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
      }>(`/events/admin?${params.toString()}`);
      return response.data;
    },
    enabled: !!user,
  });
}
