export type { ManagerProfileFormValues } from "@/lib/validations/managerProfileSchema";

export interface ManagerProfileResponse {
  id: string;
  actor_id?: string | null;
  company_name: string;
  overview: string | null;
  logo_path: string | null;
  website: string | null;
  owner_address: string;
  created_at: string;
  updated_at: string;
}
