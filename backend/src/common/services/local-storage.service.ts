import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageService } from '../interfaces/storage.interface';
import { getErrorMessage, logError } from '../utils';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private uploadDir: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.baseUrl = `http://localhost:${this.configService.get('PORT', 3030)}/uploads`;
    void this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Local storage initialized at: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error('Failed to initialize local storage', error);
      throw error;
    }
  }

  async uploadFile(
    filePath: string,
    buffer: Buffer,

    _mimeType: string,
  ): Promise<string> {
    try {
      // Create subdirectories if needed
      const fullPath = path.join(this.uploadDir, filePath);
      const dir = path.dirname(fullPath);

      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, buffer);

      // Return the file path for consistency with Supabase Storage service
      this.logger.log(`File uploaded successfully: ${filePath}`);

      return filePath;
    } catch (error) {
      logError(this.logger, 'Failed to upload file', error);
      throw new Error(`Failed to upload file: ${getErrorMessage(error)}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.unlink(fullPath);
      this.logger.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      logError(this.logger, 'Failed to delete file', error);
      throw new Error(`Failed to delete file: ${getErrorMessage(error)}`);
    }
  }

  async getFile(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      const buffer = await fs.readFile(fullPath);
      return buffer;
    } catch (error) {
      logError(this.logger, 'Failed to get file', error);
      throw new Error(`Failed to get file: ${getErrorMessage(error)}`);
    }
  }

  getSignedUrl(filePath: string, expiresIn: number = 604800): Promise<string> {
    // For local storage, create a time-limited URL with query params
    // This provides some consistency with production behavior
    const expirationTime = Date.now() + expiresIn * 1000;
    return Promise.resolve(
      `${this.baseUrl}/${filePath}?expires=${expirationTime}&dev=1`,
    );
  }

  getFileUrl(filePath: string, expiresInHours: number = 1): Promise<string> {
    // For local storage, create a time-limited URL with query params
    // This mimics the expiration behavior of production storage
    const expirationTime = Date.now() + expiresInHours * 60 * 60 * 1000;
    return Promise.resolve(
      `${this.baseUrl}/${filePath}?expires=${expirationTime}&dev=1`,
    );
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      // File doesn't exist or no access permission
      return false;
    }
  }

  getSignedUploadUrl(
    filePath: string,
    mimeType: string,
    expiresInMinutes: number = 15,
  ): Promise<string> {
    // For local storage, return a mock upload URL for interface consistency
    // In development, uploads go through the regular uploadFile method
    const expirationTime = Date.now() + expiresInMinutes * 60 * 1000;
    return Promise.resolve(
      `${this.baseUrl}/upload/${filePath}?expires=${expirationTime}&dev=1&mime=${encodeURIComponent(mimeType)}`,
    );
  }
}
