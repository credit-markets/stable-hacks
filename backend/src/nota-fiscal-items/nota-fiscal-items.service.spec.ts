import { Test, TestingModule } from '@nestjs/testing';
import { NotaFiscalItemsService } from './nota-fiscal-items.service';
import { SupabaseService } from '../database/supabase.service';

/**
 * Helper: builds a mock Supabase client with chainable query builder.
 */
function createMockSupabaseClient() {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    __queryBuilder: queryBuilder,
  };
}

describe('NotaFiscalItemsService', () => {
  let service: NotaFiscalItemsService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotaFiscalItemsService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
      ],
    }).compile();

    service = module.get<NotaFiscalItemsService>(NotaFiscalItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getAggregates ─────────────────────────────────────────────────

  describe('getAggregates', () => {
    it('should return null when data is empty', async () => {
      mockClient.__queryBuilder.eq.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.getAggregates('pool-1');

      expect(result).toBeNull();
    });

    it('should calculate effective_yield as ((face - acquisition) / acquisition) * 100', async () => {
      const items = [
        {
          valor_nominal: 1000,
          valor_aquisicao: 800,
          taxa_desconto: 5,
          status: 'active',
          data_vencimento: '2099-12-31',
        },
        {
          valor_nominal: 2000,
          valor_aquisicao: 1600,
          taxa_desconto: 7,
          status: 'active',
          data_vencimento: '2099-12-31',
        },
      ];

      mockClient.__queryBuilder.eq.mockResolvedValueOnce({
        data: items,
        error: null,
      });

      const result = await service.getAggregates('pool-1');

      // total face = 3000, total acquisition = 2400
      // effective_yield = ((3000 - 2400) / 2400) * 100 = 25
      expect(result).not.toBeNull();
      expect(result!.effective_yield).toBe(25);
      expect(result!.total_face_value).toBe(3000);
      expect(result!.total_acquisition_value).toBe(2400);
    });

    it('should return effective_yield of 0 when totalAcquisitionValue is zero (not Infinity/NaN)', async () => {
      const items = [
        {
          valor_nominal: 1000,
          valor_aquisicao: 0,
          taxa_desconto: null,
          status: 'active',
          data_vencimento: '2099-12-31',
        },
      ];

      mockClient.__queryBuilder.eq.mockResolvedValueOnce({
        data: items,
        error: null,
      });

      const result = await service.getAggregates('pool-1');

      expect(result).not.toBeNull();
      expect(result!.effective_yield).toBe(0);
      expect(Number.isFinite(result!.effective_yield)).toBe(true);
    });

    it('should only count active items in maturity buckets', async () => {
      const now = new Date();
      const in15Days = new Date(
        now.getTime() + 15 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const in45Days = new Date(
        now.getTime() + 45 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const items = [
        {
          valor_nominal: 100,
          valor_aquisicao: 90,
          taxa_desconto: 5,
          status: 'active',
          data_vencimento: in15Days,
        },
        {
          valor_nominal: 200,
          valor_aquisicao: 180,
          taxa_desconto: 5,
          status: 'settled', // NOT active — should not appear in buckets
          data_vencimento: in15Days,
        },
        {
          valor_nominal: 300,
          valor_aquisicao: 270,
          taxa_desconto: 5,
          status: 'active',
          data_vencimento: in45Days,
        },
      ];

      mockClient.__queryBuilder.eq.mockResolvedValueOnce({
        data: items,
        error: null,
      });

      const result = await service.getAggregates('pool-1');

      expect(result).not.toBeNull();
      expect(result!.maturity_distribution.within_30d).toBe(1); // only the active one
      expect(result!.maturity_distribution.within_60d).toBe(1);
      // settled item should NOT be in any bucket
      const totalBucketItems =
        result!.maturity_distribution.within_30d +
        result!.maturity_distribution.within_60d +
        result!.maturity_distribution.within_90d +
        result!.maturity_distribution.beyond_90d;
      expect(totalBucketItems).toBe(2); // only 2 active items
    });
  });
});
