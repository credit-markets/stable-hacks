import {
  FILE_SUB_TYPES,
  FILE_TYPES,
  type FileSubType,
  type FileType,
} from "@/constants/fileTypes";
import { FILE_SIZE_LIMITS } from "@/constants/fileUpload";
import { type FileUploadRequest, fileService } from "@/services/fileService";
import type { ImageValidationOptions } from "@/utils/fileValidation";
import { validateDocument, validateImage } from "@/utils/fileValidation";
import { useMutation } from "@tanstack/react-query";
import axios, { type AxiosProgressEvent } from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";

export interface UseFileUploadOptions {
  fileType: FileType;
  subType: FileSubType;
  validation?: ImageValidationOptions;
  maxSizeMB?: number;
}

export interface FileUploadResult {
  path: string;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Enhanced error classification for file upload operations
 */
function getFileUploadErrorMessage(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401) return "Please log in again";
    if (status === 403) {
      if (message?.includes("ownership")) {
        return "You can only upload files to your own entities";
      }
      return "Upload permission denied";
    }
    if (status === 413) return "File too large";
    if (status === 400) {
      if (message?.includes("Invalid file type")) return "Invalid file type";
      if (message?.includes("File size exceeds")) return "File too large";
      if (message?.includes("file header")) return "Invalid file format";
      if (message?.includes("file path")) return "Invalid file path";
      if (message?.includes("Entity not found")) return "Entity not found";
      if (message?.includes("ownership"))
        return "You can only upload files to your own entities";
      return message || "Invalid request";
    }
    if (status && status >= 500) return "Server error";

    return message || "Upload failed. Please try again.";
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes("Authentication required"))
    return "Please log in again";
  if (errorMessage.includes("File validation failed")) return null; // Validation already showed toast
  if (errorMessage.includes("Network Error")) return "Network error";

  return "Upload failed";
}

export function useFileUpload(options: UseFileUploadOptions) {
  const { fileType, subType, validation, maxSizeMB } = options;
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<FileUploadResult> => {
      // Validate the file first
      if (fileType === "image") {
        const isValid = await validateImage(file, validation);
        if (!isValid) {
          throw new Error("File validation failed");
        }
      } else if (fileType === "document") {
        const isValid = validateDocument(file, { maxSizeMB });
        if (!isValid) {
          throw new Error("File validation failed");
        }
      }

      const request: FileUploadRequest = {
        file,
        fileType,
        subType,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const percentCompleted =
            progressEvent.loaded && progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
          setUploadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total || 0,
            percentage: percentCompleted,
          });
        },
      };

      return fileService.uploadFile(request);
    },
    onError: (error: unknown) => {
      console.error("File upload error:", error);

      const userMessage = getFileUploadErrorMessage(error);
      if (userMessage) {
        toast.error(userMessage);
      }
    },
    onSuccess: () => {
      const fileTypeText = fileType === "image" ? "Image" : "Document";
      toast.success(`${fileTypeText} uploaded successfully!`);
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
    },
    onSettled: () => {
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
}
