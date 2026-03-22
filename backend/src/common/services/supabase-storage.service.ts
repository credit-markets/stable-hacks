import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database/supabase.service';
import { IStorageService } from '../interfaces/storage.interface';
import { logError } from '../utils';

@Injectable()
export class SupabaseStorageService implements IStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly bucketName: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName =
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'files';
  }

  private get storage() {
    return this.supabaseService.getClient().storage.from(this.bucketName);
  }

  async uploadFile(
    filePath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const { error } = await this.storage.upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
      cacheControl: 'private, max-age=3600',
    });

    if (error) {
      logError(this.logger, 'Failed to upload file to Supabase Storage', error);
      this.logger.error('Storage operation failed', { message: error.message });
      throw new Error('Storage operation failed');
    }

    this.logger.log(`File uploaded successfully: ${filePath}`);
    return filePath;
  }

  async getFileUrl(
    filePath: string,
    expiresInHours: number = 1,
  ): Promise<string> {
    const { data, error } = await this.storage.createSignedUrl(
      filePath,
      expiresInHours * 60 * 60,
    );

    if (error || !data?.signedUrl) {
      logError(this.logger, 'Failed to generate signed URL', error);
      this.logger.error('Storage operation failed', {
        message: error?.message,
      });
      throw new Error('Storage operation failed');
    }

    return data.signedUrl;
  }

  async getSignedUrl(
    filePath: string,
    expiresIn: number = 604800,
  ): Promise<string> {
    const { data, error } = await this.storage.createSignedUrl(
      filePath,
      expiresIn,
    );

    if (error || !data?.signedUrl) {
      logError(this.logger, 'Failed to generate signed URL', error);
      this.logger.error('Storage operation failed', {
        message: error?.message,
      });
      throw new Error('Storage operation failed');
    }

    return data.signedUrl;
  }

  async getSignedUploadUrl(
    filePath: string,
    _mimeType: string,
    _expiresInMinutes = 15,
  ): Promise<string> {
    // Note: Supabase SDK v2 createSignedUploadUrl uses fixed 2h expiry.
    // The expiresInMinutes parameter is reserved for when SDK supports custom expiry.
    const { data, error } = await this.storage.createSignedUploadUrl(filePath);

    if (error || !data?.signedUrl) {
      logError(this.logger, 'Failed to generate signed upload URL', error);
      this.logger.error('Storage operation failed', {
        message: error?.message,
      });
      throw new Error('Storage operation failed');
    }

    return data.signedUrl;
  }

  async deleteFile(filePath: string): Promise<void> {
    const { error } = await this.storage.remove([filePath]);

    if (error) {
      logError(this.logger, 'Failed to delete file', error);
      this.logger.error('Storage operation failed', { message: error.message });
      throw new Error('Storage operation failed');
    }
  }

  async getFile(filePath: string): Promise<Buffer> {
    const { data, error } = await this.storage.download(filePath);

    if (error || !data) {
      logError(this.logger, 'Failed to download file', error);
      this.logger.error('Storage operation failed', {
        message: error?.message,
      });
      throw new Error('Storage operation failed');
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const lastSlash = filePath.lastIndexOf('/');
      const directory = lastSlash >= 0 ? filePath.substring(0, lastSlash) : '';
      const fileName =
        lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;

      const { data, error } = await this.storage.list(directory, {
        search: fileName,
        limit: 1,
      });

      if (error) return false;
      return (data ?? []).some((f) => f.name === fileName);
    } catch {
      return false;
    }
  }
}
