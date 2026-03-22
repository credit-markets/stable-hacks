/**
 * File validation constants and patterns for secure file handling
 */
import { VALID_SUB_TYPES } from './file-types.constants';

// Maximum file sizes (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB for images
  DOCUMENT: 20 * 1024 * 1024, // 20MB for documents (matches current pool-document service)
  DEFAULT: 5 * 1024 * 1024, // 5MB default
} as const;

// Allowed file extensions
export const ALLOWED_EXTENSIONS = {
  IMAGES: ['jpg', 'jpeg', 'png', 'webp'] as const,
  DOCUMENTS: [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'txt',
    'csv',
    'png',
    'jpg',
    'jpeg',
  ] as const,
} as const;

// Secure path validation patterns for simplified manager-based structure
// Create dynamic pattern based on valid sub types and file extensions from constants
const createManagerFilesPattern = () => {
  const subTypesPattern = VALID_SUB_TYPES.join('|');

  // Combine all allowed extensions from existing constants
  const allExtensions = [
    ...ALLOWED_EXTENSIONS.IMAGES,
    ...ALLOWED_EXTENSIONS.DOCUMENTS.filter(
      (ext) =>
        !ALLOWED_EXTENSIONS.IMAGES.includes(
          ext as (typeof ALLOWED_EXTENSIONS.IMAGES)[number],
        ),
    ),
  ];
  const extensionsPattern = allExtensions.join('|');

  return new RegExp(
    `^manager\\/[1-9A-HJ-NP-Za-km-z]{32,44}\\/(${subTypesPattern})-\\d+\\.(${extensionsPattern})$`,
  );
};

export const PATH_VALIDATION_PATTERNS = {
  // Dynamic pattern: manager/{address}/{subType}-{timestamp}.{extension}
  // Automatically includes all valid subTypes from constants
  MANAGER_FILES: createManagerFilesPattern(),
} as const;

// URL expiration limits (in hours)
export const URL_EXPIRATION_LIMITS = {
  MIN: 1,
  MAX: 24,
  DEFAULT: 1,
} as const;

// Secure MIME type to file extension mapping
export const MIME_TO_EXTENSION_MAP = {
  // Images
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',

  // Documents
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
} as const;

// File type validation
export const ALLOWED_MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,

  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ] as const,
} as const;
