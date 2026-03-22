import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  ExtractedUserCredentials,
} from '../common/decorators/authenticated-user.decorator';
import { IStorageService } from '../common/interfaces/storage.interface';
import { URL_EXPIRATION_LIMITS } from '../common/constants/file-validation.constants';
import { genericUploadOptions } from '../common/config/file-upload.config';
import { MulterFile } from '../common/types/multer.types';
import { validateFile } from '../common/utils/file-validation.util';
import {
  generateFilePath,
  validateFilePath,
} from '../common/utils/file-path.util';
import { getErrorMessage } from '../common/utils/error.util';
import { performSecurityValidation } from '../common/utils/file-security.util';
import { FileUploadRateLimitGuard } from '../common/guards/file-upload-rate-limit.guard';
import {
  ALLOWED_MIME_TYPES,
  FILE_SIZE_LIMITS,
} from '../common/constants/file-validation.constants';
import {
  VALID_FILE_TYPES,
  VALID_SUB_TYPES,
  type FileType,
  type FileSubType,
} from '../common/constants/file-types.constants';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

/**
 * Controller for unified file operations
 * Provides file upload and secure URL generation for uploaded files
 */
@ApiTags('files')
@ApiBearerAuth('JWT-auth')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileUploadsController {
  private readonly logger = new Logger(FileUploadsController.name);

  private readonly authorityAddress: string;

  constructor(
    @Inject('STORAGE_SERVICE') private readonly storageService: IStorageService,
    private readonly configService: ConfigService,
  ) {
    this.authorityAddress = this.configService.getOrThrow<string>('AUTHORITY');
  }

  /**
   * Simplified file upload endpoint
   * All files are uploaded under manager address with subType organization
   */
  @Post('upload')
  @UseGuards(FileUploadRateLimitGuard)
  @UseInterceptors(FileInterceptor('file', genericUploadOptions))
  @ApiOperation({
    summary: 'Upload a file with ownership validation',
    description:
      'Simplified endpoint for uploading images and documents. All files are organized under manager address.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (image or document)',
        },
        fileType: {
          type: 'string',
          enum: ['image', 'document'],
          description: 'Type of file being uploaded',
        },
        subType: {
          type: 'string',
          enum: VALID_SUB_TYPES,
          description: 'Subtype for file organization',
        },
      },
      required: ['file', 'fileType', 'subType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path for storage reference',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - ownership validation failed',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async uploadFile(
    @UploadedFile() file: MulterFile,
    @Body('fileType') fileType: FileType,
    @Body('subType') subType: FileSubType,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ): Promise<{ path: string }> {
    try {
      // Validate required parameters
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      if (!fileType || !VALID_FILE_TYPES.includes(fileType)) {
        throw new BadRequestException(
          `Invalid or missing fileType. Must be one of: ${VALID_FILE_TYPES.join(', ')}`,
        );
      }

      if (!subType || !VALID_SUB_TYPES.includes(subType)) {
        throw new BadRequestException(
          `Invalid or missing subType. Must be one of: ${VALID_SUB_TYPES.join(', ')}`,
        );
      }

      // Enhanced security validation
      performSecurityValidation(file);

      // Validate file based on type
      const allowedMimeTypes =
        fileType === 'image'
          ? ALLOWED_MIME_TYPES.IMAGES
          : ALLOWED_MIME_TYPES.DOCUMENTS;

      const maxFileSize =
        fileType === 'image'
          ? FILE_SIZE_LIMITS.IMAGE
          : FILE_SIZE_LIMITS.DOCUMENT;

      validateFile(file, {
        allowedMimeTypes,
        maxFileSize,
        validateHeaders: true,
      });

      // Generate file path - everything under manager address
      const filePath = generateFilePath(account, fileType, subType, file);

      // Upload file
      const path = await this.storageService.uploadFile(
        filePath,
        file.buffer,
        file.mimetype,
      );

      this.logger.log(
        `File uploaded successfully: ${path} for manager:${account}`,
      );
      return { path };
    } catch (error) {
      this.logger.error(`File upload failed: ${getErrorMessage(error)}`);
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException(`Upload failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Generate a signed URL for accessing a file
   * @param path - The file path to generate URL for
   * @param expires - URL expiration time in hours (1-24, default: 1)
   * @returns Object containing the signed URL
   * @throws BadRequestException for invalid paths, missing files, or other errors
   */
  @Get('url')
  @ApiOperation({
    summary: 'Get a signed URL for accessing an uploaded file',
  })
  @ApiQuery({ name: 'path', required: true, type: String, description: 'File storage path' })
  @ApiQuery({ name: 'expires', required: false, type: String, description: 'URL expiration in hours (1-24, default: 1)' })
  @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid path or parameters' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - file ownership validation failed',
  })
  async getFileUrl(
    @Query('path') path: string,
    @AuthenticatedUser()
    { account }: ExtractedUserCredentials,
    @Query('expires') expires?: string,
  ): Promise<{ url: string }> {
    if (!path) {
      this.logger.warn('File URL request missing path parameter');
      throw new BadRequestException('File path is required');
    }

    // Validate path format for security
    if (!validateFilePath(path)) {
      this.logger.warn(`Invalid file path format attempted: ${path}`);
      throw new BadRequestException('Invalid file path format');
    }

    // Ownership check: extract wallet address from path and verify
    const pathParts = path.split('/');
    const pathAddress = pathParts[1];
    if (
      pathAddress &&
      pathAddress !== account &&
      account !== this.authorityAddress
    ) {
      throw new ForbiddenException('Access to this file is not permitted');
    }

    const expiresInHours = expires
      ? parseInt(expires, 10)
      : URL_EXPIRATION_LIMITS.DEFAULT;
    if (
      isNaN(expiresInHours) ||
      expiresInHours < URL_EXPIRATION_LIMITS.MIN ||
      expiresInHours > URL_EXPIRATION_LIMITS.MAX
    ) {
      this.logger.warn(`Invalid expires value attempted: ${expires}`);
      throw new BadRequestException(
        `Invalid expires value (${URL_EXPIRATION_LIMITS.MIN}-${URL_EXPIRATION_LIMITS.MAX} hours)`,
      );
    }

    try {
      // Check if file exists before generating URL
      const fileExists = await this.checkFileExists(path);
      if (!fileExists) {
        this.logger.warn(
          `Attempted to generate URL for non-existent file: ${path}`,
        );
        throw new BadRequestException('File not found');
      }

      const url = await this.storageService.getFileUrl(path, expiresInHours);
      this.logger.log(
        `Generated file URL for path: ${path}, expires in ${expiresInHours}h`,
      );
      return { url };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to generate file URL for path ${path}: ${getErrorMessage(error)}`,
      );
      throw new BadRequestException(
        `Failed to generate file URL: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Check if a file exists in storage
   * @param path - The file path to check
   * @returns true if file exists, false otherwise
   */
  private async checkFileExists(path: string): Promise<boolean> {
    try {
      // Check if storage service has fileExists method (now properly typed)
      if (this.storageService.fileExists) {
        return await this.storageService.fileExists(path);
      }

      // Fallback: try to get file metadata (less efficient but works)
      await this.storageService.getFile(path);
      return true;
    } catch (error) {
      this.logger.debug(
        `File existence check failed for ${path}: ${getErrorMessage(error)}`,
      );
      return false;
    }
  }
}
