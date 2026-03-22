import { z } from "zod";

/**
 * Step 1: Pre-screening — entity type, jurisdiction, and regulatory status
 */
export const preScreenSchema = z.object({
  entity_type: z.enum(["company", "fund", "trust", "foundation"], {
    required_error: "Entity type is required",
  }),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  is_regulated: z.boolean({
    required_error: "Please indicate if the entity is regulated",
  }),
  regulator_name: z.string().optional().nullable(),
  license_number: z.string().optional().nullable(),
});

/**
 * Step 2: Company information — legal details and registration
 */
export const companyInfoSchema = z.object({
  legal_name: z.string().min(1, "Legal name is required"),
  trading_name: z.string().optional().nullable(),
  registration_number: z.string().min(1, "Registration number is required"),
  date_of_incorporation: z.string().min(1, "Date of incorporation is required"),
  registered_address: z.string().min(1, "Registered address is required"),
  business_activity: z.string().min(1, "Business activity is required"),
  website: z.string().optional().nullable(),
});

/**
 * Step 3: UBO (Ultimate Beneficial Owner) details
 */
export const uboSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(1, "Nationality is required"),
  country_of_residence: z.string().min(1, "Country of residence is required"),
  role: z.enum(["ubo", "director", "signatory", "trustee", "gp", "protector"], {
    required_error: "Role is required",
  }),
  ownership_percentage: z.number().min(0).max(100).optional().nullable(),
  source_of_wealth: z.string().min(1, "Source of wealth is required"),
  is_pep: z.boolean({
    required_error: "Please indicate PEP status",
  }),
  pep_details: z.string().optional().nullable(),
});

/**
 * Step 4: Source of funds and wealth
 */
export const sourceOfFundsSchema = z.object({
  ownership_structure_description: z
    .string()
    .min(1, "Ownership structure description is required"),
  source_of_funds: z.string().min(1, "Source of funds is required"),
  source_of_wealth: z.string().min(1, "Source of wealth is required"),
});

/**
 * Step 5: PEP and RCA (Relative or Close Associate) declarations
 */
export const pepRcaSchema = z
  .object({
    has_pep: z.boolean({
      required_error: "Please indicate if there are any PEPs",
    }),
    pep_details: z.string().optional().nullable(),
    has_rca: z.boolean({
      required_error: "Please indicate if there are any RCAs",
    }),
    rca_details: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      !data.has_pep || (data.pep_details && data.pep_details.trim().length > 0),
    {
      message: "PEP details are required when PEP status is declared",
      path: ["pep_details"],
    },
  )
  .refine(
    (data) =>
      !data.has_rca || (data.rca_details && data.rca_details.trim().length > 0),
    {
      message: "RCA details are required when RCA status is declared",
      path: ["rca_details"],
    },
  );

/**
 * Step 6: Compliance declarations — sanctions, adverse media, funding route
 */
export const declarationsSchema = z.object({
  sanctions_declaration: z.boolean().refine((val) => val === true, {
    message: "Sanctions declaration must be confirmed",
  }),
  adverse_media_declaration: z.boolean().refine((val) => val === true, {
    message: "Adverse media declaration must be confirmed",
  }),
  funding_route_declaration: z
    .string()
    .min(1, "Funding route declaration is required"),
});

/**
 * Step 7: Representations — signatory authority, accuracy, and ongoing reporting
 */
export const representationsSchema = z.object({
  authorized_signatory_declaration: z.boolean().refine((val) => val === true, {
    message: "Authorized signatory declaration must be confirmed",
  }),
  accuracy_declaration: z.boolean().refine((val) => val === true, {
    message: "Accuracy declaration must be confirmed",
  }),
  ongoing_reporting_declaration: z.boolean().refine((val) => val === true, {
    message: "Ongoing reporting declaration must be confirmed",
  }),
});

/**
 * Wallet declaration schema
 */
export const walletSchema = z.object({
  wallet_address: z.string().min(1, "Wallet address is required"),
  wallet_label: z.string().min(1, "Wallet label is required"),
  source_description: z.string().min(1, "Source description is required"),
});

/**
 * Inferred types from Zod schemas
 */
export type PreScreenFormValues = z.infer<typeof preScreenSchema>;
export type CompanyInfoFormValues = z.infer<typeof companyInfoSchema>;
export type UboFormValues = z.infer<typeof uboSchema>;
export type SourceOfFundsFormValues = z.infer<typeof sourceOfFundsSchema>;
export type PepRcaFormValues = z.infer<typeof pepRcaSchema>;
export type DeclarationsFormValues = z.infer<typeof declarationsSchema>;
export type RepresentationsFormValues = z.infer<typeof representationsSchema>;
export type WalletFormValues = z.infer<typeof walletSchema>;
