import { z } from "zod";

export const managerProfileSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  overview: z.string().optional(),
  logo_path: z.string().optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

export type ManagerProfileFormValues = z.infer<typeof managerProfileSchema>;
