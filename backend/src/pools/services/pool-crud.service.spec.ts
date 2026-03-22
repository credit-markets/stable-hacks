import { Test, TestingModule } from '@nestjs/testing';
import { PoolCrudService } from './pool-crud.service';
import { SupabaseService } from '../../database/supabase.service';

function createMockSupabaseClient() {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
  };
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    __queryBuilder: queryBuilder,
  };
}

describe('PoolCrudService', () => {
  let service: PoolCrudService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolCrudService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
      ],
    }).compile();

    service = module.get<PoolCrudService>(PoolCrudService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should include is_visible: true when filter.manager is absent', async () => {
      await service.findAll(1, 10, 'created_at', 'descending', {});

      // eq should be called with 'is_visible', true (public marketplace filter)
      expect(mockClient.__queryBuilder.eq).toHaveBeenCalledWith(
        'is_visible',
        true,
      );
    });

    it('should NOT apply is_visible filter when filter.manager is provided', async () => {
      await service.findAll(1, 10, 'created_at', 'descending', {
        manager: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      });

      // eq should be called with manager_address but NOT with is_visible
      const eqCalls = mockClient.__queryBuilder.eq.mock.calls;
      expect(eqCalls).toContainEqual([
        'manager_address',
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      ]);

      const isVisibleCalls = eqCalls.filter(
        (call: unknown[]) => call[0] === 'is_visible',
      );
      expect(isVisibleCalls).toHaveLength(0);
    });

    it('should fall back to created_at for invalid sortBy values', async () => {
      await service.findAll(1, 10, 'DROP TABLE pools; --', 'descending', {});

      expect(mockClient.__queryBuilder.order).toHaveBeenCalledWith(
        'created_at',
        { ascending: false },
      );
    });

    it('should use valid sortBy when provided', async () => {
      await service.findAll(1, 10, 'target_return_rate', 'ascending', {});

      expect(mockClient.__queryBuilder.order).toHaveBeenCalledWith(
        'target_return_rate',
        { ascending: true },
      );
    });

    it('should apply status filter independently from visibility', async () => {
      await service.findAll(1, 10, 'created_at', 'descending', {
        status: 'open',
      });

      const eqCalls = mockClient.__queryBuilder.eq.mock.calls;
      expect(eqCalls).toContainEqual(['status', 'open']);
      expect(eqCalls).toContainEqual(['is_visible', true]);
    });

    it('should apply status filter with manager (no visibility filter)', async () => {
      await service.findAll(1, 10, 'created_at', 'descending', {
        status: 'draft',
        manager: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      });

      const eqCalls = mockClient.__queryBuilder.eq.mock.calls;
      expect(eqCalls).toContainEqual(['status', 'draft']);
      expect(eqCalls).toContainEqual([
        'manager_address',
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      ]);

      const isVisibleCalls = eqCalls.filter(
        (call: unknown[]) => call[0] === 'is_visible',
      );
      expect(isVisibleCalls).toHaveLength(0);
    });

    it('should apply correct pagination range', async () => {
      await service.findAll(3, 20, 'created_at', 'descending', {});

      // page 3, pageSize 20 → from = 40, to = 59
      expect(mockClient.__queryBuilder.range).toHaveBeenCalledWith(40, 59);
    });
  });
});
