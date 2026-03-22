import type {
  KybDocument,
  KybQueueResponse,
  KybSubmission,
  KybUbo,
  KybWalletDeclaration,
} from "@/types/kyb";
import { api } from "./api";

export const kybService = {
  // ── Investor Methods ──────────────────────────────────────────────

  createDraft: async (): Promise<KybSubmission> => {
    const response = await api.post("/kyb", {});
    return response.data;
  },

  getMySubmission: async (): Promise<KybSubmission> => {
    const response = await api.get("/kyb/me");
    return response.data;
  },

  updateSubmission: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<KybSubmission> => {
    const response = await api.patch(`/kyb/${id}`, data);
    return response.data;
  },

  submitForReview: async (id: string): Promise<KybSubmission> => {
    const response = await api.post(`/kyb/${id}/submit`, {});
    return response.data;
  },

  addUbo: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<KybUbo> => {
    const response = await api.post(`/kyb/${id}/ubos`, data);
    return response.data;
  },

  updateUbo: async (
    id: string,
    uboId: string,
    data: Record<string, unknown>,
  ): Promise<KybUbo> => {
    const response = await api.patch(`/kyb/${id}/ubos/${uboId}`, data);
    return response.data;
  },

  deleteUbo: async (id: string, uboId: string): Promise<void> => {
    await api.delete(`/kyb/${id}/ubos/${uboId}`);
  },

  uploadDocument: async (
    id: string,
    formData: FormData,
  ): Promise<KybDocument> => {
    const response = await api.post(`/kyb/${id}/documents`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  deleteDocument: async (id: string, docId: string): Promise<void> => {
    await api.delete(`/kyb/${id}/documents/${docId}`);
  },

  addWallet: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<KybWalletDeclaration> => {
    const response = await api.post(`/kyb/${id}/wallets`, data);
    return response.data;
  },

  deleteWallet: async (id: string, walletId: string): Promise<void> => {
    await api.delete(`/kyb/${id}/wallets/${walletId}`);
  },

  // ── Attester Methods ──────────────────────────────────────────────

  getQueue: async (
    params?: Record<string, unknown>,
  ): Promise<KybQueueResponse> => {
    const response = await api.get("/kyb/queue", { params });
    return response.data;
  },

  getReview: async (id: string): Promise<KybSubmission> => {
    const response = await api.get(`/kyb/${id}/review`);
    return response.data;
  },

  updateReview: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<KybSubmission> => {
    const response = await api.patch(`/kyb/${id}/review`, data);
    return response.data;
  },

  approve: async (
    id: string,
    data?: Record<string, unknown>,
  ): Promise<KybSubmission> => {
    const response = await api.post(`/kyb/${id}/approve`, data || {});
    return response.data;
  },

  reject: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<KybSubmission> => {
    const response = await api.post(`/kyb/${id}/reject`, data);
    return response.data;
  },

  requestResubmission: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<KybSubmission> => {
    const response = await api.post(`/kyb/${id}/request-resubmission`, data);
    return response.data;
  },

  revoke: async (
    id: string,
    data?: Record<string, unknown>,
  ): Promise<KybSubmission> => {
    const response = await api.post(`/kyb/${id}/revoke`, data || {});
    return response.data;
  },

  confirmAttestation: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<KybSubmission> => {
    const response = await api.patch(`/kyb/${id}/attestation-tx`, data);
    return response.data;
  },

  getDocumentPreview: async (
    id: string,
    docId: string,
  ): Promise<{ url: string }> => {
    const response = await api.get(`/kyb/${id}/documents/${docId}/preview`);
    return response.data;
  },

  getDocumentDownload: async (
    id: string,
    docId: string,
  ): Promise<{ url: string }> => {
    const response = await api.get(`/kyb/${id}/documents/${docId}/download`);
    return response.data;
  },
};
