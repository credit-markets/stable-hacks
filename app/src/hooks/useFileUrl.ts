import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import axios, { type AxiosError } from "axios";

interface FileUrlResponse {
  url: string;
}

/**
 * Enhanced error classification for file URL operations
 */
function classifyFileUrlError(error: unknown) {
  if (!error) return {};

  // Handle Axios errors with status codes
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const responseMessage = (
      axiosError.response?.data as Record<string, string> | undefined
    )?.message;
    const message: string | undefined = responseMessage || axiosError.message;

    return {
      isNotFound:
        status === 404 ||
        message?.includes("File not found") ||
        message?.includes("not found"),
      isUnauthorized:
        status === 401 ||
        message?.includes("Authentication") ||
        message?.includes("Unauthorized"),
      isForbidden:
        status === 403 ||
        message?.includes("expired") ||
        message?.includes("Forbidden"),
      isInvalidPath: status === 400 && message?.includes("Invalid file path"),
      isBadRequest: status === 400,
      isServerError: status && status >= 500,
      isNetworkError: !status && axiosError.code === "NETWORK_ERROR",
      rawError: error,
    };
  }

  // Handle other error types
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    isNotFound:
      errorMessage.includes("not found") || errorMessage.includes("404"),
    isUnauthorized:
      errorMessage.includes("Authentication") || errorMessage.includes("401"),
    isForbidden:
      errorMessage.includes("expired") || errorMessage.includes("403"),
    isInvalidPath: errorMessage.includes("Invalid file path"),
    isBadRequest: errorMessage.includes("400"),
    isServerError:
      errorMessage.includes("500") ||
      errorMessage.includes("502") ||
      errorMessage.includes("503"),
    isNetworkError:
      errorMessage.includes("Network Error") || errorMessage.includes("fetch"),
    rawError: error,
  };
}

export function useFileUrl(path: string | undefined, expiresInHours = 1) {
  return useQuery({
    queryKey: ["file-url", path, expiresInHours],
    queryFn: async (): Promise<string> => {
      if (!path) {
        throw new Error("File path is required");
      }

      // Validate path to prevent directory traversal and ensure safe format
      if (
        path.includes("..") ||
        path.startsWith("/") ||
        path.includes("\\") ||
        !/^[a-zA-Z0-9\/\-_.]+$/.test(path)
      ) {
        throw new Error("Invalid file path format");
      }

      const response = await api.get<FileUrlResponse>("/files/url", {
        params: {
          path,
          expires: expiresInHours,
        },
      });

      return response.data.url;
    },
    enabled: !!path,
    // Cache URLs for 45 minutes (URLs expire in 1 hour by default, 15-minute safety margin)
    staleTime: 45 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
  });
}

/**
 * Get user-friendly error messages for documents
 */
function getDocumentErrorMessage(
  errorInfo: ReturnType<typeof classifyFileUrlError>,
): string {
  if (errorInfo.isNotFound) return "Document not found";
  if (errorInfo.isUnauthorized) return "Please log in again";
  if (errorInfo.isForbidden) return "Access expired - refresh to reload";
  if (errorInfo.isInvalidPath) return "Invalid document path";
  if (errorInfo.isNetworkError) return "Network error - check connection";
  if (errorInfo.isServerError) return "Server error - try again later";
  return "Document unavailable";
}

/**
 * Get user-friendly error messages for images
 */
function getImageErrorMessage(
  errorInfo: ReturnType<typeof classifyFileUrlError>,
): string {
  if (errorInfo.isNotFound) return "Image not found";
  if (errorInfo.isUnauthorized) return "Please log in again";
  if (errorInfo.isForbidden) return "Access expired - refresh to reload";
  if (errorInfo.isInvalidPath) return "Invalid image path";
  if (errorInfo.isNetworkError) return "Network error - check connection";
  if (errorInfo.isServerError) return "Server error - try again later";
  return "Image unavailable";
}

/**
 * Hook specifically for document URLs with enhanced error handling
 */
export function useDocumentUrl(documentPath: string | undefined) {
  const query = useFileUrl(documentPath);
  const errorInfo = classifyFileUrlError(query.error);

  return {
    ...query,
    url: query.data,
    isLoadingUrl: query.isLoading,
    urlError: query.error,
    ...errorInfo,
    // Document-specific helper methods
    canRetry: !errorInfo.isInvalidPath && !errorInfo.isNotFound,
    shouldReauth: errorInfo.isUnauthorized || errorInfo.isForbidden,
    userMessage: getDocumentErrorMessage(errorInfo),
  };
}

/**
 * Hook specifically for image URLs with enhanced error handling
 */
export function useImageUrl(imagePath: string | undefined) {
  const query = useFileUrl(imagePath);
  const errorInfo = classifyFileUrlError(query.error);

  return {
    ...query,
    url: query.data,
    isLoadingUrl: query.isLoading,
    urlError: query.error,
    ...errorInfo,
    // Image-specific helper methods
    canRetry: !errorInfo.isInvalidPath && !errorInfo.isNotFound,
    shouldReauth: errorInfo.isUnauthorized || errorInfo.isForbidden,
    userMessage: getImageErrorMessage(errorInfo),
  };
}
