import { BadRequestException } from '@nestjs/common';
import { MulterFile } from '../types/multer.types';
import { FileValidationException } from '../exceptions/file-upload.exceptions';

/**
 * Enhanced security validations for file uploads
 */

/**
 * Common malicious file signatures to detect
 */
const MALICIOUS_SIGNATURES = {
  // Executable files
  exe: [0x4d, 0x5a], // MZ (DOS/Windows executable)
  elf: [0x7f, 0x45, 0x4c, 0x46], // ELF (Linux executable)
  mach_o: [0xfe, 0xed, 0xfa, 0xce], // Mach-O (macOS executable)

  // Script files that could be dangerous
  html_script: [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], // <script
  php: [0x3c, 0x3f, 0x70, 0x68, 0x70], // <?php

  // Archive bombs potential
  zip_bomb_marker: [0x50, 0x4b, 0x03, 0x04], // ZIP header
};

/**
 * Validates file content for suspicious patterns
 * @param file - The uploaded file
 * @throws BadRequestException if suspicious content detected
 */
export function validateFileContent(file: MulterFile): void {
  if (!file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('File content is empty or corrupted');
  }

  // Check for executable signatures
  if (containsMaliciousSignature(file.buffer)) {
    throw new BadRequestException(
      'File contains potentially malicious content',
    );
  }

  // Check for embedded scripts in documents
  if (containsEmbeddedScripts(file.buffer, file.mimetype)) {
    throw new BadRequestException(
      'File contains embedded scripts which are not allowed',
    );
  }

  // Check for suspicious file size patterns (zip bombs, etc.)
  if (isSuspiciousFileSize(file)) {
    throw new BadRequestException(
      'File size pattern indicates potential security risk',
    );
  }
}

/**
 * Checks if file contains known malicious signatures
 */
function containsMaliciousSignature(buffer: Buffer): boolean {
  for (const [_name, signature] of Object.entries(MALICIOUS_SIGNATURES)) {
    if (signature.length <= buffer.length) {
      let match = true;
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks for embedded scripts in document files
 */
function containsEmbeddedScripts(buffer: Buffer, mimeType: string): boolean {
  // For PDF files, check for JavaScript
  if (mimeType === 'application/pdf') {
    const content = buffer.toString('latin1');
    return content.includes('/JavaScript') || content.includes('/JS');
  }

  // For Office documents, check for macros
  if (mimeType.includes('vnd.openxmlformats') || mimeType.includes('msword')) {
    const content = buffer.toString('latin1');
    return content.includes('vbaProject') || content.includes('macros');
  }

  return false;
}

/**
 * Checks for suspicious file size patterns
 */
function isSuspiciousFileSize(file: MulterFile): boolean {
  // Extremely large files could be zip bombs
  if (file.size > 100 * 1024 * 1024) {
    // 100MB
    return true;
  }

  // Files with 0 size are suspicious
  if (file.size === 0) {
    return true;
  }

  // Check compression ratio for potential zip bombs
  if (file.mimetype.includes('zip') || file.mimetype.includes('compressed')) {
    // This is a simplified check - in production you'd want more sophisticated analysis
    const compressionRatio = file.buffer.length / file.size;
    if (compressionRatio < 0.01) {
      // Extremely high compression could indicate zip bomb
      return true;
    }
  }

  return false;
}

/**
 * Validates file name for suspicious patterns
 * @param filename - Original filename
 * @throws BadRequestException if filename is suspicious
 */
export function validateFileName(filename: string): void {
  // Check for double extensions (e.g., file.pdf.exe)
  const parts = filename.split('.');
  if (parts.length > 3) {
    throw new FileValidationException(
      'Files with multiple extensions are not allowed',
      'filename',
    );
  }

  // Check for suspicious characters
  // eslint-disable-next-line no-control-regex
  const suspiciousChars = /[<>:"|?*\x00-\x1f]/;
  if (suspiciousChars.test(filename)) {
    throw new FileValidationException(
      'Filename contains invalid characters',
      'filename',
    );
  }

  // Check for reserved names
  const reservedNames = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ];
  const nameWithoutExt = parts[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    throw new FileValidationException(
      'Filename uses a reserved system name',
      'filename',
    );
  }

  // Check length
  if (filename.length > 255) {
    throw new FileValidationException(
      'Filename is too long (max 255 characters)',
      'filename',
    );
  }
}

/**
 * Comprehensive security validation combining all checks
 * @param file - The uploaded file
 */
export function performSecurityValidation(file: MulterFile): void {
  validateFileName(file.originalname);
  validateFileContent(file);
}
