import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionEventService } from './events.service';
import { SupabaseService } from '../database/supabase.service';
import { QueryEventsDto } from './dto/query-events.dto';

interface MockChain {
  select: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
}

const createChainMock = (resolvedValue: {
  data: Record<string, unknown>[] | null;
  count: number | null;
  error: { message: string; code?: string } | null;
}): MockChain => {
  const chain: MockChain = {
    select: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.range.mockResolvedValue(resolvedValue);
  return chain;
};

describe('ExecutionEventService', () => {
  let service: ExecutionEventService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionEventService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();

    service = module.get<ExecutionEventService>(ExecutionEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated results with defaults', async () => {
      const mockData = [
        {
          id: '1',
          event_type: 'pool.created',
          created_at: '2026-03-17T00:00:00Z',
        },
        {
          id: '2',
          event_type: 'pool.updated',
          created_at: '2026-03-16T00:00:00Z',
        },
      ];
      const chain = createChainMock({ data: mockData, count: 2, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      const result = await service.findAllPaginated(dto);

      expect(mockFrom).toHaveBeenCalledWith('execution_events');
      expect(chain.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(chain.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(chain.range).toHaveBeenCalledWith(0, 19);
      expect(result.data).toEqual(mockData);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    it('should apply event_type filter', async () => {
      const chain = createChainMock({ data: [], count: 0, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      dto.event_type = 'pool.created';
      await service.findAllPaginated(dto);

      expect(chain.eq).toHaveBeenCalledWith('event_type', 'pool.created');
    });

    it('should apply actor_type filter', async () => {
      const chain = createChainMock({ data: [], count: 0, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      dto.actor_type = 'admin';
      await service.findAllPaginated(dto);

      expect(chain.eq).toHaveBeenCalledWith('actor_type', 'admin');
    });

    it('should apply date_from filter', async () => {
      const chain = createChainMock({ data: [], count: 0, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      dto.date_from = '2026-03-01T00:00:00Z';
      await service.findAllPaginated(dto);

      expect(chain.gte).toHaveBeenCalledWith(
        'created_at',
        '2026-03-01T00:00:00Z',
      );
    });

    it('should apply date_to filter', async () => {
      const chain = createChainMock({ data: [], count: 0, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      dto.date_to = '2026-03-31T23:59:59Z';
      await service.findAllPaginated(dto);

      expect(chain.lte).toHaveBeenCalledWith(
        'created_at',
        '2026-03-31T23:59:59Z',
      );
    });

    it('should apply all filters together', async () => {
      const chain = createChainMock({ data: [], count: 0, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      dto.event_type = 'pool.created';
      dto.actor_type = 'manager';
      dto.date_from = '2026-03-01T00:00:00Z';
      dto.date_to = '2026-03-31T23:59:59Z';
      await service.findAllPaginated(dto);

      expect(chain.eq).toHaveBeenCalledWith('event_type', 'pool.created');
      expect(chain.eq).toHaveBeenCalledWith('actor_type', 'manager');
      expect(chain.gte).toHaveBeenCalledWith(
        'created_at',
        '2026-03-01T00:00:00Z',
      );
      expect(chain.lte).toHaveBeenCalledWith(
        'created_at',
        '2026-03-31T23:59:59Z',
      );
    });

    it('should calculate correct pagination range for page 2', async () => {
      const chain = createChainMock({ data: [], count: 50, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      dto.page = 2;
      dto.pageSize = 10;
      const result = await service.findAllPaginated(dto);

      expect(chain.range).toHaveBeenCalledWith(10, 19);
      expect(result.pagination).toEqual({
        total: 50,
        page: 2,
        pageSize: 10,
        totalPages: 5,
      });
    });

    it('should calculate correct pagination range for page 3 with pageSize 15', async () => {
      const chain = createChainMock({ data: [], count: 100, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      dto.page = 3;
      dto.pageSize = 15;
      const result = await service.findAllPaginated(dto);

      expect(chain.range).toHaveBeenCalledWith(30, 44);
      expect(result.pagination).toEqual({
        total: 100,
        page: 3,
        pageSize: 15,
        totalPages: 7,
      });
    });

    it('should throw on supabase error', async () => {
      const chain = createChainMock({
        data: null,
        count: null,
        error: { message: 'DB error', code: '500' },
      });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      await expect(service.findAllPaginated(dto)).rejects.toEqual({
        message: 'DB error',
        code: '500',
      });
    });

    it('should return empty array when data is null', async () => {
      const chain = createChainMock({ data: null, count: 0, error: null });
      mockFrom.mockReturnValue(chain);

      const dto = new QueryEventsDto();
      const result = await service.findAllPaginated(dto);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ─── emit ────────────────────────────────────────────────────────

  describe('emit', () => {
    const baseEvent = {
      event_type: 'pool.created',
      correlation_id: 'corr-1',
      actor_id: 'actor-1',
      actor_type: 'manager' as const,
      target_type: 'pool',
      target_id: 'pool-1',
      payload: { amount: 100 },
    };

    it('should use upsert with onConflict chain_tx_id when chain_tx_id is provided', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: upsertMock, insert: insertMock });

      await service.emit({ ...baseEvent, chain_tx_id: 'tx-abc' });

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ chain_tx_id: 'tx-abc' }),
        expect.objectContaining({ onConflict: 'chain_tx_id' }),
      );
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('should use insert (not upsert) when chain_tx_id is not provided', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: upsertMock, insert: insertMock });

      await service.emit(baseEvent);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'pool.created' }),
      );
      expect(upsertMock).not.toHaveBeenCalled();
    });

    it('should auto-generate correlation_id when not provided', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });

      const eventWithoutCorrelation = {
        ...baseEvent,
        correlation_id: '',
      };

      await service.emit(eventWithoutCorrelation);

      const calls = insertMock.mock.calls as unknown[][];
      const insertedData = calls[0][0] as Record<string, unknown>;
      expect(insertedData.correlation_id).toBeTruthy();
      expect(typeof insertedData.correlation_id).toBe('string');
      // Should be a UUID (not empty)
      expect((insertedData.correlation_id as string).length).toBeGreaterThan(0);
    });
  });

  // ─── findResolutionsByCorrelationIds ─────────────────────────────

  describe('findResolutionsByCorrelationIds', () => {
    it('should return [] immediately for empty array input', async () => {
      const result = await service.findResolutionsByCorrelationIds(
        [],
        ['pool.confirmed'],
      );

      expect(result).toEqual([]);
      // Should not call supabase at all
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
