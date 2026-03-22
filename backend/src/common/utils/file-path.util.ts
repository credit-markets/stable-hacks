import { BadRequestException } from '@nestjs/common';
import { MulterFile } from '../types/multer.types';
import {
  VALID_SUB_TYPES,
  type FileType,
  type FileSubType,
} from '../constants/file-types.constants';
import {
  PATH_VALIDATION_PATTERNS,
  MIME_TO_EXTENSION_MAP,
} from '../constants/file-validation.constants';

/**
 * Generates a simplified file path under manager address with timestamp
 *
 * @param managerAddress - Manager address (from auth token)
 * @param fileType - Type of file (image, document) - currently not used but kept for potential future use
 * @param subType - Subtype for organization (profile-logo, pool-logo, etc.)
 * @param file - The uploaded file
 * @returns Generated file path
 */
export function generateFilePath(
  managerAddress: string,
  fileType: FileType,
  subType: FileSubType,
  file: MulterFile,
): string {
  const timestamp = Date.now();

  // Secure extension extraction using whitelist mapping
  let extension = '';
  if (
    file.mimetype &&
    MIME_TO_EXTENSION_MAP[file.mimetype as keyof typeof MIME_TO_EXTENSION_MAP]
  ) {
    // Use secure MIME-to-extension mapping
    extension =
      MIME_TO_EXTENSION_MAP[
        file.mimetype as keyof typeof MIME_TO_EXTENSION_MAP
      ];
  } else {
    // Secure fallback: extract extension from filename and validate
    const extensionMatch = file.originalname.match(/\.([^.]+)$/);
    const originalExtension = extensionMatch
      ? extensionMatch[1].toLowerCase()
      : '';

    // Only allow known safe extensions
    const allowedExtensions = Object.values(MIME_TO_EXTENSION_MAP);
    if (
      allowedExtensions.includes(
        originalExtension as (typeof MIME_TO_EXTENSION_MAP)[keyof typeof MIME_TO_EXTENSION_MAP],
      )
    ) {
      extension = originalExtension;
    } else {
      // Default to safe extension if unknown
      extension = 'bin';
    }
  }

  // Validate manager address format (Solana base58: 32-44 alphanumeric chars)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(managerAddress)) {
    throw new BadRequestException(
      'Manager address must be a valid Solana address',
    );
  }

  // Validate subType
  if (!VALID_SUB_TYPES.includes(subType)) {
    throw new BadRequestException(
      `Invalid subType '${subType}'. Must be one of: ${VALID_SUB_TYPES.join(', ')}`,
    );
  }

  // Generate path: manager/{address}/{subType}-{timestamp}.{extension}
  return `manager/${managerAddress}/${subType}-${timestamp}.${extension}`;
}

/**
 * Validates a file path against security patterns
 *
 * @param path - The file path to validate
 * @returns true if path is valid, false otherwise
 */
export function validateFilePath(path: string): boolean {
  return PATH_VALIDATION_PATTERNS.MANAGER_FILES.test(path);
}

/**
 * Extracts metadata from a file path
 *
 * @param filePath - The file path to analyze
 * @returns Object containing filename, extension, and directory
 */
export function getFilePathMetadata(filePath: string): {
  filename: string;
  extension: string;
  directory: string;
} {
  const pathParts = filePath.split('/');
  const filename = pathParts[pathParts.length - 1];
  const extensionMatch = filename.match(/\.([^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : '';
  const directory = pathParts.slice(0, -1).join('/');

  return {
    filename,
    extension,
    directory,
  };
}
