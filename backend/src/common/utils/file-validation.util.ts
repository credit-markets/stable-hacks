import { MulterFile } from '../types/multer.types';
import {
  FileValidationException,
  FileSizeException,
  FileTypeException,
} from '../exceptions/file-upload.exceptions';

// File signature (magic numbers) for common image formats
const FILE_SIGNATURES = {
  // JPEG files start with FF D8 FF
  jpeg: [0xff, 0xd8, 0xff],
  // PNG files start with 89 50 4E 47 0D 0A 1A 0A
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  // GIF files start with GIF87a or GIF89a
  gif87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  gif89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  // WebP files start with RIFF....WEBP
  webp: [0x52, 0x49, 0x46, 0x46], // Note: Need to check for WEBP at offset 8
  // PDF files start with %PDF
  pdf: [0x25, 0x50, 0x44, 0x46],
};

interface FileValidationOptions {
  allowedMimeTypes: readonly string[];
  maxFileSize: number;
  validateHeaders?: boolean;
}

/**
 * Validates file headers to ensure the file content matches its MIME type
 * This prevents malicious files from bypassing validation by spoofing MIME types
 */
export function validateFileHeaders(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 8) {
    return false;
  }

  // Check JPEG
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return (
      buffer[0] === FILE_SIGNATURES.jpeg[0] &&
      buffer[1] === FILE_SIGNATURES.jpeg[1] &&
      buffer[2] === FILE_SIGNATURES.jpeg[2]
    );
  }

  // Check PNG
  if (mimeType === 'image/png') {
    return FILE_SIGNATURES.png.every((byte, index) => buffer[index] === byte);
  }

  // Check GIF
  if (mimeType === 'image/gif') {
    const isGif87a = FILE_SIGNATURES.gif87a.every(
      (byte, index) => buffer[index] === byte,
    );
    const isGif89a = FILE_SIGNATURES.gif89a.every(
      (byte, index) => buffer[index] === byte,
    );
    return isGif87a || isGif89a;
  }

  // Check WebP
  if (mimeType === 'image/webp') {
    const hasRiffHeader = FILE_SIGNATURES.webp.every(
      (byte, index) => buffer[index] === byte,
    );
    // Check for WEBP at offset 8
    const hasWebpSignature =
      buffer.length >= 12 &&
      buffer[8] === 0x57 && // W
      buffer[9] === 0x45 && // E
      buffer[10] === 0x42 && // B
      buffer[11] === 0x50; // P
    return hasRiffHeader && hasWebpSignature;
  }

  // Check PDF
  if (mimeType === 'application/pdf') {
    return FILE_SIGNATURES.pdf.every((byte, index) => buffer[index] === byte);
  }

  // For other file types, we'll trust the MIME type
  // You can add more file signatures as needed
  return true;
}

/**
 * Comprehensive file validation including MIME type, size, and header checks
 */
export function validateFile(
  file: MulterFile,
  options: FileValidationOptions,
): void {
  const { allowedMimeTypes, maxFileSize, validateHeaders = true } = options;

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new FileTypeException(allowedMimeTypes, file.mimetype);
  }

  // Check file size
  if (file.size > maxFileSize) {
    throw new FileSizeException(maxFileSize, file.size);
  }

  // Validate file headers if enabled
  if (validateHeaders && file.buffer) {
    const isValidHeader = validateFileHeaders(file.buffer, file.mimetype);
    if (!isValidHeader) {
      throw new FileValidationException(
        'File content does not match the declared file type',
        'content-type',
      );
    }
  }
}

/**
 * Sanitizes filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path separators and null bytes
  return (
    filename
      // eslint-disable-next-line no-useless-escape
      .replace(/[\/\\]/g, '_') // Replace forward/back slashes
      .replace(/\0/g, '') // Remove null bytes
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\./, '') // Remove leading dot
      .substring(0, 255)
  ); // Limit filename length
}
