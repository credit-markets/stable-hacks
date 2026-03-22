import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ManagerCrudService } from './manager-crud.service';
import { SupabaseService } from '../../database/supabase.service';

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
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    __queryBuilder: queryBuilder,
  };
}

describe('ManagerCrudService', () => {
  let service: ManagerCrudService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagerCrudService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
      ],
    }).compile();

    service = module.get<ManagerCrudService>(ManagerCrudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('should roll back actor record when manager insert fails', async () => {
      const actorId = 'actor-123';

      // First from() call: actors insert — succeeds
      const actorQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: { id: actorId }, error: null }),
      };

      // Second from() call: managers insert — fails
      const managerQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        }),
      };

      // Third from() call: actors delete (cleanup)
      const cleanupQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockClient.from
        .mockReturnValueOnce(actorQueryBuilder)
        .mockReturnValueOnce(managerQueryBuilder)
        .mockReturnValueOnce(cleanupQueryBuilder);

      await expect(
        service.create({ company_name: 'Test Corp' }, 'wallet-address-1'),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify cleanup: actor was deleted
      expect(mockClient.from).toHaveBeenCalledWith('actors');
      expect(cleanupQueryBuilder.delete).toHaveBeenCalled();
      expect(cleanupQueryBuilder.eq).toHaveBeenCalledWith('id', actorId);
    });
  });

  // ─── existsByOwner ──────────────────────────────────────────────

  describe('existsByOwner', () => {
    it('should return false when count is 0', async () => {
      mockClient.__queryBuilder.eq.mockResolvedValueOnce({
        count: 0,
        error: null,
      });

      const result = await service.existsByOwner('wallet-1');

      expect(result).toBe(false);
      expect(mockClient.from).toHaveBeenCalledWith('managers');
      expect(mockClient.__queryBuilder.select).toHaveBeenCalledWith('*', {
        count: 'exact',
        head: true,
      });
    });

    it('should return true when count is 1', async () => {
      mockClient.__queryBuilder.eq.mockResolvedValueOnce({
        count: 1,
        error: null,
      });

      const result = await service.existsByOwner('wallet-1');

      expect(result).toBe(true);
    });

    it('should return false when count is null (treated as 0)', async () => {
      mockClient.__queryBuilder.eq.mockResolvedValueOnce({
        count: null,
        error: null,
      });

      const result = await service.existsByOwner('wallet-1');

      expect(result).toBe(false);
    });

    it('should throw InternalServerErrorException on supabase error', async () => {
      mockClient.__queryBuilder.eq.mockResolvedValueOnce({
        count: null,
        error: { message: 'DB error' },
      });

      await expect(service.existsByOwner('wallet-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
