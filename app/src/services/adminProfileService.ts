import type { Manager } from "@/services/api";
import type { PaginatedResponse } from "@/types/pagination";
import { api } from "./api";

export type AdminProfilesParams = {
  page?: number;
  pageSize?: number;
  status?: string;
};

export type AdminProfilesResponse = PaginatedResponse<Manager>;

export const adminProfileService = {
  getProfiles: async (
    params?: AdminProfilesParams,
  ): Promise<AdminProfilesResponse> => {
    const urlParams = new URLSearchParams();

    if (params?.page) urlParams.append("page", String(params.page));
    if (params?.pageSize) urlParams.append("pageSize", String(params.pageSize));
    if (params?.status) urlParams.append("status", String(params.status));

    const queryString = urlParams.toString();
    const url = queryString ? `/managers?${queryString}` : "/managers";

    const response = await api.get<AdminProfilesResponse>(url);
    return response.data;
  },

  getProfileById: async (id: string): Promise<Manager> => {
    const response = await api.get<Manager>(`/managers/${id}`);
    return response.data;
  },

  getProfileByAddress: async (address: string): Promise<Manager> => {
    const response = await api.get<Manager>(`/managers/address/${address}`);
    return response.data;
  },

  deleteProfile: async (id: string): Promise<void> => {
    await api.delete(`/managers/${id}`);
  },
};

// For standalone functions when no auth token is available yet
export async function getProfiles(
  params?: string,
): Promise<AdminProfilesResponse> {
  let url = "/managers";
  if (params) {
    url += `?${params}`;
  }

  const response = await api.get<AdminProfilesResponse>(url);
  return response.data;
}

export async function getProfileById(id: string): Promise<Manager> {
  const response = await api.get<Manager>(`/managers/${id}`);
  return response.data;
}

export async function deleteProfile(id: string): Promise<void> {
  await api.delete(`/managers/${id}`);
}
