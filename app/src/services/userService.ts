import type { User as CanonicalUser } from "@/services/api";
import { api } from "./api";

export type User = CanonicalUser;

export interface UserRoles {
  isAdmin: boolean;
  isManager: boolean;
  isAttester: boolean;
  managedPoolIds: string[];
}

export async function getUserRoles(): Promise<UserRoles> {
  const response = await api.get("/users/me/roles");
  return response.data;
}
