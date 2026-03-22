import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

/**
 * Standardized file upload exceptions with consistent error messages
 */

export class FileValidationException extends BadRequestException {
  constructor(message: string, field?: string) {
    const errorMessage = field ? `${field}: ${message}` : message;
    super({
      error: 'File Validation Error',
      message: errorMessage,
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
  }
}

export class FileSizeException extends PayloadTooLargeException {
  constructor(maxSize: number, actualSize?: number) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const actualSizeMB = actualSize
      ? (actualSize / (1024 * 1024)).toFixed(1)
      : 'unknown';

    super({
      error: 'File Size Exceeded',
      message: `File size exceeds the maximum allowed limit of ${maxSizeMB}MB${actualSize ? ` (actual: ${actualSizeMB}MB)` : ''}`,
      maxSizeBytes: maxSize,
      actualSizeBytes: actualSize,
      statusCode: 413,
      timestamp: new Date().toISOString(),
    });
  }
}

export class FileTypeException extends UnsupportedMediaTypeException {
  constructor(allowedTypes: readonly string[], actualType?: string) {
    super({
      error: 'Unsupported File Type',
      message: `File type not supported. Allowed types: ${allowedTypes.join(', ')}${actualType ? `. Received: ${actualType}` : ''}`,
      allowedTypes: allowedTypes,
      actualType: actualType,
      statusCode: 415,
      timestamp: new Date().toISOString(),
    });
  }
}

export class FileSecurityException extends BadRequestException {
  constructor(reason: string) {
    super({
      error: 'File Security Violation',
      message: `File rejected for security reasons: ${reason}`,
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
  }
}

export class FileUploadException extends BadRequestException {
  constructor(message: string, details?: unknown) {
    super({
      error: 'File Upload Error',
      message: message,
      details: details,
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
  }
}
