import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseStorageService } from '../supabase-storage.service';
import { SupabaseService } from '../../../database/supabase.service';

interface MockStorageBucket {
  upload: jest.Mock;
  download: jest.Mock;
  remove: jest.Mock;
  createSignedUrl: jest.Mock;
  createSignedUploadUrl: jest.Mock;
  list: jest.Mock;
}

interface MockSupabaseClient {
  storage: {
    from: jest.Mock;
  };
}

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;
  let mockBucket: MockStorageBucket;
  let mockSupabaseClient: MockSupabaseClient;

  const BUCKET_NAME = 'files';

  beforeEach(async () => {
    // Mock the Supabase storage bucket methods
    mockBucket = {
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      createSignedUrl: jest.fn(),
      createSignedUploadUrl: jest.fn(),
      list: jest.fn(),
    };

    // Mock the Supabase client with storage.from() returning the bucket mock
    mockSupabaseClient = {
      storage: {
        from: jest.fn().mockReturnValue(mockBucket),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseStorageService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockSupabaseClient },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<SupabaseStorageService>(SupabaseStorageService);
  });

  describe('uploadFile', () => {
    it('should upload file and return path', async () => {
      mockBucket.upload.mockResolvedValue({
        data: { path: 'manager/0xabc/pool-logo-123.png' },
        error: null,
      });

      const result = await service.uploadFile(
        'manager/0xabc/pool-logo-123.png',
        Buffer.from('test'),
        'image/png',
      );

      expect(result).toBe('manager/0xabc/pool-logo-123.png');
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith(BUCKET_NAME);
    });

    it('should throw on upload error', async () => {
      mockBucket.upload.mockResolvedValue({
        data: null,
        error: { message: 'Bucket not found' },
      });

      await expect(
        service.uploadFile('test.png', Buffer.from('test'), 'image/png'),
      ).rejects.toThrow('Storage operation failed');
    });
  });

  describe('getFileUrl', () => {
    it('should return signed URL with correct expiry', async () => {
      mockBucket.createSignedUrl.mockResolvedValue({
        data: {
          signedUrl:
            'https://supabase.co/storage/v1/sign/files/test.png?token=abc',
        },
        error: null,
      });

      const url = await service.getFileUrl('test.png', 2);

      expect(url).toContain('https://supabase.co');
      expect(mockBucket.createSignedUrl).toHaveBeenCalledWith(
        'test.png',
        2 * 60 * 60, // hours to seconds
      );
    });

    it('should throw on signed URL error', async () => {
      mockBucket.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Object not found' },
      });

      await expect(service.getFileUrl('missing.png')).rejects.toThrow(
        'Storage operation failed',
      );
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL with expiry in seconds', async () => {
      mockBucket.createSignedUrl.mockResolvedValue({
        data: {
          signedUrl:
            'https://supabase.co/storage/v1/sign/files/doc.pdf?token=xyz',
        },
        error: null,
      });

      const url = await service.getSignedUrl('doc.pdf', 3600);

      expect(url).toContain('https://supabase.co');
      expect(mockBucket.createSignedUrl).toHaveBeenCalledWith('doc.pdf', 3600);
    });
  });

  describe('getSignedUploadUrl', () => {
    it('should return signed upload URL', async () => {
      mockBucket.createSignedUploadUrl.mockResolvedValue({
        data: {
          signedUrl:
            'https://supabase.co/storage/v1/upload/sign/files/new-file.png?token=abc',
        },
        error: null,
      });

      const url = await service.getSignedUploadUrl('new-file.png', 'image/png');

      expect(url).toContain('https://supabase.co');
      expect(mockBucket.createSignedUploadUrl).toHaveBeenCalledWith(
        'new-file.png',
      );
    });

    it('should throw on signed upload URL error', async () => {
      mockBucket.createSignedUploadUrl.mockResolvedValue({
        data: null,
        error: { message: 'Not allowed' },
      });

      await expect(
        service.getSignedUploadUrl('test.png', 'image/png'),
      ).rejects.toThrow('Storage operation failed');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from bucket', async () => {
      mockBucket.remove.mockResolvedValue({
        data: [{ name: 'test.png' }],
        error: null,
      });

      await expect(service.deleteFile('test.png')).resolves.toBeUndefined();
      expect(mockBucket.remove).toHaveBeenCalledWith(['test.png']);
    });

    it('should throw on delete error', async () => {
      mockBucket.remove.mockResolvedValue({
        data: null,
        error: { message: 'Object not found' },
      });

      await expect(service.deleteFile('missing.png')).rejects.toThrow(
        'Storage operation failed',
      );
    });
  });

  describe('getFile', () => {
    it('should download and return buffer', async () => {
      const blob = new Blob(['test content']);
      mockBucket.download.mockResolvedValue({
        data: blob,
        error: null,
      });

      const buffer = await service.getFile('test.png');
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should throw on download error', async () => {
      mockBucket.download.mockResolvedValue({
        data: null,
        error: { message: 'Object not found' },
      });

      await expect(service.getFile('missing.png')).rejects.toThrow(
        'Storage operation failed',
      );
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists in listing', async () => {
      mockBucket.list.mockResolvedValue({
        data: [{ name: 'pool-logo-123.png' }],
        error: null,
      });

      const exists = await service.fileExists(
        'manager/0xabc/pool-logo-123.png',
      );
      expect(exists).toBe(true);
    });

    it('should return false when file not in listing', async () => {
      mockBucket.list.mockResolvedValue({
        data: [],
        error: null,
      });

      const exists = await service.fileExists('manager/0xabc/missing.png');
      expect(exists).toBe(false);
    });

    it('should return false on error', async () => {
      mockBucket.list.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      const exists = await service.fileExists('some/path.png');
      expect(exists).toBe(false);
    });
  });
});
