import {
  MOCK_FILES,
  createMockFile,
  mockImageAPI,
} from "@/__tests__/fixtures/file.fixtures";
import {
  mockAxios,
  mockAxiosError,
  mockAxiosSuccess,
  setupAxiosMocks,
} from "@/__tests__/mocks/axios.mock";
import { createTestWrapperWithClient } from "@/__tests__/utils/test-wrapper";
import { FILE_SUB_TYPES, FILE_TYPES } from "@/constants/fileTypes";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Setup mocks BEFORE imports that use them
setupAxiosMocks();

vi.mock("react-hot-toast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "react-hot-toast";
// Now import the components that use these mocks
import { type UseFileUploadOptions, useFileUpload } from "../useFileUpload";

describe("useFileUpload", () => {
  let wrapper: any;
  let cleanupImageAPI: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    const setup = createTestWrapperWithClient();
    wrapper = setup.wrapper;
  });

  afterEach(() => {
    if (cleanupImageAPI) {
      cleanupImageAPI();
      cleanupImageAPI = undefined;
    }
  });

  describe("successful uploads", () => {
    it("should upload image successfully with progress tracking", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      mockAxios.post.mockResolvedValue(
        mockAxiosSuccess({ path: "/uploads/manager/logo-123.jpg" }),
      );

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
        validation: {
          maxSizeMB: 5,
          requireSquare: true,
          minDimensions: { width: 200, height: 200 },
          allowedTypes: ["image/jpeg", "image/png"],
        },
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/files/upload"),
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "multipart/form-data",
          }),
        }),
      );
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual({
        path: "/uploads/manager/logo-123.jpg",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Image uploaded successfully!",
      );
    });

    it("should upload document successfully", async () => {
      mockAxios.post.mockResolvedValue(
        mockAxiosSuccess({ path: "/uploads/pool/document-456.pdf" }),
      );

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.DOCUMENT,
        subType: FILE_SUB_TYPES.POOL_DOCUMENT,
        maxSizeMB: 20,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(MOCK_FILES.PDF_SMALL);
      });

      expect(mockAxios.post).toHaveBeenCalled();
      expect(result.current.isSuccess).toBe(true);
      expect(toast.success).toHaveBeenCalledWith(
        "Document uploaded successfully!",
      );
    });

    it("should track upload progress", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);

      let progressCallback: ((event: any) => void) | undefined;
      mockAxios.post.mockImplementation((url, data, config) => {
        progressCallback = config?.onUploadProgress;
        // Simulate progress during upload
        setTimeout(() => {
          if (progressCallback) {
            progressCallback({ loaded: 5000, total: 10000 });
          }
        }, 10);
        return Promise.resolve(mockAxiosSuccess({ path: "/uploads/test.jpg" }));
      });

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      act(() => {
        result.current.mutate(MOCK_FILES.IMAGE_PNG);
      });

      // Wait for progress event to fire
      await waitFor(
        () => {
          expect(result.current.uploadProgress.percentage).toBe(50);
        },
        { timeout: 1000 },
      );

      expect(result.current.uploadProgress.loaded).toBe(5000);
      expect(result.current.uploadProgress.total).toBe(10000);
    });

    it("should reset upload progress after success", async () => {
      cleanupImageAPI = mockImageAPI(300, 300);
      mockAxios.post.mockResolvedValue(
        mockAxiosSuccess({ path: "/uploads/test.jpg" }),
      );

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
      });

      await waitFor(() => {
        expect(result.current.uploadProgress.percentage).toBe(0);
        expect(result.current.uploadProgress.loaded).toBe(0);
        expect(result.current.uploadProgress.total).toBe(0);
      });
    });
  });

  describe("validation failures", () => {
    it("should fail when validation rejects file", async () => {
      cleanupImageAPI = mockImageAPI(100, 100); // Too small

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
        validation: {
          minDimensions: { width: 200, height: 200 },
        },
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockAxios.post).not.toHaveBeenCalled();
      expect(result.current.isError).toBe(true);
    });

    it("should not upload when file type is invalid", async () => {
      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
        validation: {
          allowedTypes: ["image/jpeg"],
        },
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.INVALID_TYPE);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it("should fail when document exceeds size limit", async () => {
      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.DOCUMENT,
        subType: FILE_SUB_TYPES.POOL_DOCUMENT,
        maxSizeMB: 10,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.PDF_TOO_LARGE);
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it("should fail when square image is required but not provided", async () => {
      cleanupImageAPI = mockImageAPI(400, 200); // Not square

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
        validation: {
          requireSquare: true,
        },
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockAxios.post).not.toHaveBeenCalled();
    });
  });

  describe("error handling and classification", () => {
    beforeEach(() => {
      cleanupImageAPI = mockImageAPI(300, 300);
    });

    it("should handle 403 ownership error", async () => {
      mockAxios.post.mockRejectedValue(
        mockAxiosError("ownership", 403, {
          message: "You can only upload files to your own entities",
        }),
      );

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
        } catch (error) {
          // Error is expected
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should handle 413 payload too large error", async () => {
      mockAxios.post.mockRejectedValue(
        mockAxiosError("Payload Too Large", 413),
      );

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
        } catch (error) {
          // Error is expected
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should handle 400 invalid file type error", async () => {
      mockAxios.post.mockRejectedValue(
        mockAxiosError("Invalid file type", 400, {
          message: "Invalid file type",
        }),
      );

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
        } catch (error) {
          // Error is expected
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should handle 500 server error", async () => {
      mockAxios.post.mockRejectedValue(
        mockAxiosError("Internal Server Error", 500),
      );

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
        } catch (error) {
          // Error is expected
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should handle network error", async () => {
      const networkError = new Error("Network Error");
      mockAxios.post.mockRejectedValue(networkError);

      const options: UseFileUploadOptions = {
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      const { result } = renderHook(() => useFileUpload(options), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(MOCK_FILES.IMAGE_PNG);
        } catch (error) {
          // Error is expected
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
