import type { FileSubType, FileType } from "@/constants/fileTypes";
import type { AxiosProgressEvent } from "axios";
import { api } from "./api";

export interface FileUploadRequest {
  file: File;
  fileType: FileType;
  subType: FileSubType;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}

export interface FileUploadResponse {
  path: string;
}

export interface FileUrlResponse {
  url: string;
}

class FileService {
  /**
   * Upload a file under manager address with subType organization
   * All files are automatically associated with the authenticated manager
   */
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", request.file);
    formData.append("fileType", request.fileType);
    formData.append("subType", request.subType);

    const response = await api.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: request.onUploadProgress,
    });

    return response.data;
  }

  /**
   * Get a temporary URL for a file
   */
  async getFileUrl(path: string, expiresInHours = 1): Promise<string> {
    // Validate path to prevent directory traversal
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
  }
}

export const fileService = new FileService();
