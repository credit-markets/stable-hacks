/**
 * KYB hooks
 *
 * React Query hooks for KYB (Know Your Business) submission and review flows.
 */

// Investor hooks
export { useMyKyb } from "./useMyKyb";
export { useCreateKybDraft } from "./useCreateKybDraft";
export { useUpdateKyb } from "./useUpdateKyb";
export { useSubmitKyb } from "./useSubmitKyb";
export { useAddUbo, useUpdateUbo, useDeleteUbo } from "./useKybUbos";
export {
  useUploadKybDocument,
  useDeleteKybDocument,
} from "./useKybDocuments";
export { useAddWallet, useDeleteWallet } from "./useKybWallets";

// Attester hooks
export { useKybQueue } from "./useKybQueue";
export { useKybReview } from "./useKybReview";
export {
  useApproveKyb,
  useRejectKyb,
  useRequestResubmission,
  useRevokeKyb,
  useConfirmAttestation,
} from "./useKybAttesterActions";
