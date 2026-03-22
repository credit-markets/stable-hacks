// File size limits in MB
export const FILE_SIZE_LIMITS = {
  IMAGE_MB: 5,
  DOCUMENT_MB: 20,
  LARGE_IMAGE_MB: 10,
} as const;

// Image dimension requirements
export const IMAGE_DIMENSIONS = {
  MIN_WIDTH: 200,
  MIN_HEIGHT: 200,
  LOGO_MIN_WIDTH: 200,
  LOGO_MIN_HEIGHT: 200,
  COVER_MIN_WIDTH: 400,
  COVER_MIN_HEIGHT: 200,
} as const;

// Common dimension presets
export const DIMENSION_PRESETS = {
  PROFILE_LOGO: { width: 200, height: 200 },
  PROFILE_COVER: { width: 800, height: 400 },
  TEAM_MEMBER: { width: 200, height: 200 },
  POOL_LOGO: { width: 200, height: 200 },
} as const;

// Allowed MIME types for validation
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPTED_IMAGE_TYPES_WITH_GIF = [
  ...ACCEPTED_IMAGE_TYPES,
  "image/gif",
] as const;

export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
] as const;

// File extensions for UI display
export const ACCEPTED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
] as const;

export const ACCEPTED_IMAGE_EXTENSIONS = "image/*";
export const ACCEPTED_DOCUMENT_EXTENSIONS_STRING =
  ACCEPTED_DOCUMENT_EXTENSIONS.join(",");

// Type definitions
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];
export type AcceptedImageTypeWithGif =
  (typeof ACCEPTED_IMAGE_TYPES_WITH_GIF)[number];
export type AcceptedDocumentType = (typeof ACCEPTED_DOCUMENT_TYPES)[number];

// Validation configurations for common upload scenarios
import type { ImageValidationOptions } from "@/utils/fileValidation";

export const VALIDATION_CONFIGS: Record<string, ImageValidationOptions> = {
  PROFILE_LOGO: {
    maxSizeMB: FILE_SIZE_LIMITS.IMAGE_MB,
    requireSquare: true,
    minDimensions: DIMENSION_PRESETS.PROFILE_LOGO,
    allowedTypes: ACCEPTED_IMAGE_TYPES,
  },
  PROFILE_COVER: {
    maxSizeMB: FILE_SIZE_LIMITS.LARGE_IMAGE_MB,
    requireSquare: false,
    minDimensions: DIMENSION_PRESETS.PROFILE_COVER,
    allowedTypes: ACCEPTED_IMAGE_TYPES_WITH_GIF,
  },
  TEAM_MEMBER: {
    maxSizeMB: FILE_SIZE_LIMITS.IMAGE_MB,
    requireSquare: true,
    minDimensions: DIMENSION_PRESETS.TEAM_MEMBER,
    allowedTypes: ACCEPTED_IMAGE_TYPES,
  },
  POOL_LOGO: {
    maxSizeMB: FILE_SIZE_LIMITS.IMAGE_MB,
    requireSquare: false,
    minDimensions: DIMENSION_PRESETS.POOL_LOGO,
    allowedTypes: ACCEPTED_IMAGE_TYPES_WITH_GIF,
  },
} as const;
