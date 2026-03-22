import type { Manager } from "@/services/api";
import type {
  ManagerProfileFormValues,
  ManagerProfileResponse,
} from "@/types/manager";
import type { PoolsResponse } from "@/types/pools";
import { api } from "./api";

export const managerService = {
  createProfile: async (
    data: ManagerProfileFormValues,
  ): Promise<ManagerProfileResponse> => {
    const response = await api.post("/managers", data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  getProfile: async (): Promise<ManagerProfileResponse | null> => {
    try {
      const response = await api.get("/managers/profile");
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  getProfileByAddress: async (
    address: string,
  ): Promise<ManagerProfileResponse> => {
    const response = await api.get(`/managers/address/${address}`);
    return response.data;
  },

  updateProfile: async (
    managerId: string,
    data: Partial<ManagerProfileFormValues>,
  ): Promise<ManagerProfileResponse> => {
    const response = await api.patch(`/managers/${managerId}`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  uploadImage: async (file: File): Promise<{ path: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", "image");
    formData.append("subType", "profile-logo");

    const response = await api.post("/files/upload", formData);
    return response.data;
  },
};

export type { Manager };

export interface ManagersResponse {
  data: Manager[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getManagers(params?: string): Promise<ManagersResponse> {
  let url = "/managers";
  if (params) {
    url += `?${params}`;
  }

  const response = await api.get<ManagersResponse>(url);
  return response.data;
}

export async function getManager(id: string): Promise<Manager> {
  const response = await api.get<Manager>(`/managers/${id}`);
  return response.data;
}

export async function updateManager(
  id: string,
  data: Partial<Manager>,
): Promise<void> {
  await api.patch(`/managers/${id}`, data);
}

export async function deleteManager(id: string): Promise<void> {
  await api.delete(`/managers/${id}`);
}

export async function getManagerPoolsList(
  params?: string,
): Promise<PoolsResponse> {
  let url = "/pools/manager";
  if (params) {
    const paramsFormatted = params.replace("size=", "pageSize=");
    url += `?${paramsFormatted}`;
  }

  const response = await api.get<PoolsResponse>(url);
  return response.data;
}
