export type KybStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "resubmission_requested"
  | "rejected"
  | "revoked";

export type UboRole =
  | "ubo"
  | "director"
  | "signatory"
  | "trustee"
  | "gp"
  | "protector";
export type EntityType = "company" | "fund" | "trust" | "foundation";

export type KybDocumentCategory =
  | "certificate_of_incorporation"
  | "proof_of_address"
  | "register_of_directors"
  | "register_of_shareholders"
  | "ubo_id_document"
  | "financial_statements"
  | "regulatory_license"
  | "source_of_funds_evidence"
  | "authority_evidence"
  | "sanctions_screening_evidence"
  | "wallet_screening_evidence"
  | "other";

export interface KybUbo {
  id: string;
  submission_id: string;
  full_name: string;
  date_of_birth: string;
  nationality: string;
  country_of_residence: string;
  role: UboRole;
  ownership_percentage: number | null;
  source_of_wealth: string;
  is_pep: boolean;
  pep_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface KybDocument {
  id: string;
  submission_id: string;
  ubo_id: string | null;
  category: KybDocumentCategory;
  file_name: string;
  storage_path: string;
  mime_type: string;
  uploaded_at: string;
  preview_url?: string;
}

export interface KybWalletDeclaration {
  id: string;
  submission_id: string;
  wallet_address: string;
  wallet_label: string;
  source_description: string;
  declared_at: string;
}

export interface KybSubmission {
  id: string;
  user_id: string;
  status: KybStatus;
  step_completed: number;
  attestation_confirmed: boolean;
  entity_type: EntityType | null;
  jurisdiction: string | null;
  is_regulated: boolean | null;
  regulator_name: string | null;
  license_number: string | null;
  legal_name: string | null;
  trading_name: string | null;
  registration_number: string | null;
  date_of_incorporation: string | null;
  registered_address: string | null;
  business_activity: string | null;
  website: string | null;
  ownership_structure_description: string | null;
  source_of_funds: string | null;
  source_of_wealth: string | null;
  has_pep: boolean | null;
  pep_details: string | null;
  has_rca: boolean | null;
  rca_details: string | null;
  sanctions_declaration: boolean | null;
  adverse_media_declaration: boolean | null;
  funding_route_declaration: string | null;
  authorized_signatory_declaration: boolean | null;
  accuracy_declaration: boolean | null;
  ongoing_reporting_declaration: boolean | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  risk_score: number | null;
  risk_band: string | null;
  rejection_reason: string | null;
  reviewer_notes: string | null;
  edd_required: boolean;
  edd_notes: string | null;
  resubmission_items: string[] | null;
  attestation_tx: string | null;
  attestation_expires_at: string | null;
  created_at: string;
  updated_at: string;
  ubos: KybUbo[];
  documents: KybDocument[];
  wallets: KybWalletDeclaration[];
}

export interface KybQueueItem {
  id: string;
  user_id: string;
  legal_name: string | null;
  trading_name: string | null;
  entity_type: string | null;
  jurisdiction: string | null;
  status: KybStatus;
  risk_score: number | null;
  risk_band: string | null;
  created_at: string;
  users: { account: string } | null;
}

export interface KybQueueResponse {
  data: KybQueueItem[];
  total: number;
  page: number;
  pageSize: number;
}
