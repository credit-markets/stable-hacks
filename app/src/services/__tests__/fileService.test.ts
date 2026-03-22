import { MOCK_FILES } from "@/__tests__/fixtures/file.fixtures";
import { mockAxiosError, mockAxiosSuccess } from "@/__tests__/mocks/axios.mock";
import { FILE_SUB_TYPES, FILE_TYPES } from "@/constants/fileTypes";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileUploadRequest } from "../fileService";

// Mock axios module
vi.mock("axios", () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockPatch = vi.fn();
  const mockDelete = vi.fn();
  const mockRequest = vi.fn();

  const mockAxios = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
    delete: mockDelete,
    request: mockRequest,
    create: vi.fn(() => mockAxios),
  };
  return {
    default: mockAxios,
  };
});

// Import after mocking
import { fileService } from "../fileService";

const mockAxios = axios as any;

describe("fileService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadFile", () => {
    it("should upload file with correct FormData and headers", async () => {
      mockAxios.post.mockResolvedValue(
        mockAxiosSuccess({ path: "/uploads/manager/logo-123.jpg" }),
      );

      const request: FileUploadRequest = {
        file: MOCK_FILES.IMAGE_PNG,
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      const result = await fileService.uploadFile(request);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/files/upload"),
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }),
      );

      expect(result).toEqual({ path: "/uploads/manager/logo-123.jpg" });
    });

    it("should include progress callback when provided", async () => {
      mockAxios.post.mockResolvedValue(
        mockAxiosSuccess({ path: "/uploads/test.jpg" }),
      );

      const progressCallback = vi.fn();
      const request: FileUploadRequest = {
        file: MOCK_FILES.IMAGE_JPG,
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
        onUploadProgress: progressCallback,
      };

      await fileService.uploadFile(request);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(FormData),
        expect.objectContaining({
          onUploadProgress: progressCallback,
        }),
      );
    });

    it("should upload document with correct file type", async () => {
      mockAxios.post.mockResolvedValue(
        mockAxiosSuccess({ path: "/uploads/pool/document-456.pdf" }),
      );

      const request: FileUploadRequest = {
        file: MOCK_FILES.PDF_SMALL,
        fileType: FILE_TYPES.DOCUMENT,
        subType: FILE_SUB_TYPES.POOL_DOCUMENT,
      };

      const result = await fileService.uploadFile(request);

      expect(result.path).toContain(".pdf");
    });

    it("should handle upload errors", async () => {
      mockAxios.post.mockRejectedValue(mockAxiosError("Upload failed", 500));

      const request: FileUploadRequest = {
        file: MOCK_FILES.IMAGE_PNG,
        fileType: FILE_TYPES.IMAGE,
        subType: FILE_SUB_TYPES.PROFILE_LOGO,
      };

      await expect(fileService.uploadFile(request)).rejects.toThrow();
    });
  });

  describe("getFileUrl - Path Traversal Prevention (SECURITY CRITICAL)", () => {
    const maliciousPaths = {
      "parent directory traversal (..)": "../../../etc/passwd",
      "Windows-style traversal (..\\)": "..\\..\\windows\\system32\\config",
      "absolute path (/)": "/etc/passwd",
      "backslash path": "uploads\\..\\sensitive\\file.pdf",
      "command injection (;)": "uploads/file;rm -rf /",
      "pipe injection (|)": "uploads/file|cat /etc/passwd",
      "command chaining (&&)": "uploads/file&& ls -la",
      "script injection": "uploads/file<script>alert(1)</script>",
      "null byte injection": "uploads/file%00.pdf",
      "hidden traversal (../)": "uploads/../sensitive/file.pdf",
      "dot-slash traversal": "uploads/./../../etc/passwd",
      "nested traversal": "uploads/subdir/../../outside/file.pdf",
    };

    it.each(Object.entries(maliciousPaths))(
      "should reject path with %s",
      async (_, path) => {
        await expect(fileService.getFileUrl(path)).rejects.toThrow(
          "Invalid file path format",
        );
        expect(mockAxios.get).not.toHaveBeenCalled();
      },
    );

    const validPaths = [
      "manager/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/logo-123.jpg",
      "manager/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/cover-456.png",
      "pool/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/document-789.pdf",
      "manager/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/my-file_name.test.jpg",
    ];

    it.each(validPaths)("should accept valid path: %s", async (path) => {
      mockAxios.get.mockResolvedValue(
        mockAxiosSuccess({ url: "https://storage.example.com/signed-url" }),
      );

      const url = await fileService.getFileUrl(path);
      expect(url).toBe("https://storage.example.com/signed-url");
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/files/url"),
        expect.objectContaining({
          params: { path, expires: 1 },
        }),
      );
    });

    it("should support custom expiration times", async () => {
      mockAxios.get.mockResolvedValue(
        mockAxiosSuccess({ url: "https://storage.example.com/signed-url" }),
      );

      await fileService.getFileUrl(
        "manager/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/logo.jpg",
        24,
      );

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            path: "manager/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/logo.jpg",
            expires: 24,
          },
        }),
      );
    });

    it("should use default expiration of 1 hour", async () => {
      mockAxios.get.mockResolvedValue(
        mockAxiosSuccess({ url: "https://storage.example.com/signed-url" }),
      );

      await fileService.getFileUrl(
        "manager/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/logo.jpg",
      );

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            path: "manager/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/logo.jpg",
            expires: 1,
          },
        }),
      );
    });
  });

  describe("error handling", () => {
    it("should handle 404 file not found", async () => {
      mockAxios.get.mockRejectedValue(mockAxiosError("File not found", 404));

      const validPath =
        "manager/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/missing.jpg";

      await expect(fileService.getFileUrl(validPath)).rejects.toThrow();
    });

    it("should handle 403 unauthorized access", async () => {
      mockAxios.get.mockRejectedValue(mockAxiosError("Forbidden", 403));

      const validPath =
        "manager/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/private.jpg";

      await expect(fileService.getFileUrl(validPath)).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      mockAxios.get.mockRejectedValue(new Error("Network Error"));

      const validPath =
        "manager/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/logo.jpg";

      await expect(fileService.getFileUrl(validPath)).rejects.toThrow(
        "Network Error",
      );
    });
  });
});
