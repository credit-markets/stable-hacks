import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { KybCrudService } from './kyb-crud.service';
import { SupabaseService } from '../../database/supabase.service';
import { IStorageService } from '../../common/interfaces/storage.interface';

/**
 * Helper: builds a mock Supabase client with chainable query builder.
 */
function createMockSupabaseClient() {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    __queryBuilder: queryBuilder,
  };
}

describe('KybCrudService', () => {
  let service: KybCrudService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let mockStorageService: jest.Mocked<IStorageService>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    mockStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getFile: jest.fn(),
      getSignedUrl: jest.fn(),
      getFileUrl: jest.fn(),
    } as unknown as jest.Mocked<IStorageService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KybCrudService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
        {
          provide: 'STORAGE_SERVICE',
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<KybCrudService>(KybCrudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createDraft ──────────────────────────────────────────────────

  describe('createDraft', () => {
    it('should return existing draft when one exists in draft status', async () => {
      const existingDraft = { id: 'sub-1', status: 'draft', user_id: 'user-1' };

      // First query: find existing submission
      mockClient.__queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingDraft,
        error: null,
      });

      // getFullSubmission: single() for submission
      mockClient.__queryBuilder.single.mockResolvedValueOnce({
        data: { ...existingDraft, attestation_tx: null },
        error: null,
      });

      // createDraft chain calls .order().limit().maybeSingle() — limit needs to be chainable
      // Then getFullSubmission calls .order() as terminal for ubos/docs/wallets
      // Reset order to handle both patterns
      mockClient.__queryBuilder.order.mockImplementation(() => ({
        limit: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: existingDraft,
            error: null,
          }),
        }),
        // Also resolve directly for getFullSubmission parallel queries
        data: [],
        error: null,
      }));

      const result = await service.createDraft('user-1');

      expect(result).toBeDefined();
      // Should NOT have called insert (reused existing draft)
      expect(mockClient.__queryBuilder.insert).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when submission is submitted', async () => {
      mockClient.__queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: 'sub-1', status: 'submitted', user_id: 'user-1' },
        error: null,
      });

      await expect(service.createDraft('user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when submission is under_review', async () => {
      mockClient.__queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: 'sub-1', status: 'under_review', user_id: 'user-1' },
        error: null,
      });

      await expect(service.createDraft('user-1')).rejects.toThrow(
        'You already have an active KYB submission',
      );
    });

    it('should throw ConflictException when submission is approved', async () => {
      mockClient.__queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: 'sub-1', status: 'approved', user_id: 'user-1' },
        error: null,
      });

      await expect(service.createDraft('user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle race condition: error code 23505 throws ConflictException', async () => {
      // No existing submission found
      mockClient.__queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Insert fails with unique violation
      mockClient.__queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      });

      await expect(service.createDraft('user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── deleteUbo ────────────────────────────────────────────────────

  describe('deleteUbo', () => {
    it('should include submission_id in the query (IDOR fix verification)', async () => {
      // delete().eq().eq() chain resolves to { error: null }
      mockClient.__queryBuilder.eq.mockReturnValue({
        ...mockClient.__queryBuilder,
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      await service.deleteUbo('sub-1', 'ubo-1');

      expect(mockClient.from).toHaveBeenCalledWith('kyb_ubos');
      expect(mockClient.__queryBuilder.delete).toHaveBeenCalled();
      // First eq is for 'id', second should be 'submission_id'
      expect(mockClient.__queryBuilder.eq).toHaveBeenCalledWith('id', 'ubo-1');
    });
  });

  // ─── deleteWallet ─────────────────────────────────────────────────

  describe('deleteWallet', () => {
    it('should include submission_id in the query', async () => {
      mockClient.__queryBuilder.eq.mockReturnValue({
        ...mockClient.__queryBuilder,
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      await service.deleteWallet('sub-1', 'wallet-1');

      expect(mockClient.from).toHaveBeenCalledWith('kyb_wallet_declarations');
      expect(mockClient.__queryBuilder.delete).toHaveBeenCalled();
      expect(mockClient.__queryBuilder.eq).toHaveBeenCalledWith(
        'id',
        'wallet-1',
      );
    });
  });

  // ─── deleteDocument ───────────────────────────────────────────────

  describe('deleteDocument', () => {
    it('should call storageService.deleteFile when storage_path exists', async () => {
      // Mock: first from() = select storage_path, second from() = delete
      mockClient.__queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { storage_path: 'kyb/docs/file.pdf' },
        error: null,
      });

      await service.deleteDocument('sub-1', 'doc-1');

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        'kyb/docs/file.pdf',
      );
      // Verify delete was called (from() called twice: select + delete)
      expect(mockClient.from).toHaveBeenCalledWith('kyb_documents');
      expect(mockClient.__queryBuilder.delete).toHaveBeenCalled();
    });

    it('should skip storageService.deleteFile when storage_path is null', async () => {
      mockClient.__queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { storage_path: null },
        error: null,
      });

      await service.deleteDocument('sub-1', 'doc-1');

      expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
    });
  });
});
