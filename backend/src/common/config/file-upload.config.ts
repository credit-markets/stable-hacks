import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { MulterFile } from '../types/multer.types';
import {
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
} from '../constants/file-validation.constants';

// Generic file filter for both images and documents
export const genericFileFilter = (
  _req: any,
  file: MulterFile,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = [
    ...ALLOWED_MIME_TYPES.IMAGES,
    ...ALLOWED_MIME_TYPES.DOCUMENTS,
  ];
  const allowedExts = [
    ...ALLOWED_EXTENSIONS.IMAGES.map((ext) => `.${ext}`),
    ...ALLOWED_EXTENSIONS.DOCUMENTS.map((ext) => `.${ext}`),
  ];
  const fileExt = extname(file.originalname).toLowerCase();

  if (
    !allowedMimes.includes(
      file.mimetype as (typeof ALLOWED_MIME_TYPES.IMAGES)[number],
    )
  ) {
    return callback(
      new BadRequestException(
        `Invalid file type. Allowed types: images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX, XLS, XLSX, CSV)`,
      ),
      false,
    );
  }

  if (!allowedExts.includes(fileExt)) {
    return callback(
      new BadRequestException(
        `Invalid file extension. Allowed extensions: ${allowedExts.join(', ')}`,
      ),
      false,
    );
  }

  callback(null, true);
};

// Multer configuration for generic file uploads (images + documents)
export const genericUploadOptions: MulterOptions = {
  fileFilter: genericFileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.DOCUMENT, // Use larger limit for documents
    files: 1, // Limit to 1 file per request
  },
};
