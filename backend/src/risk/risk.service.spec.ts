import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RiskService } from './risk.service';
import { SupabaseService } from '../database/supabase.service';
import { RISK_METRIC_DEFINITIONS } from './risk-definitions';

interface MockChain {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
}

const createChainMock = (resolvedValue: {
  data: Record<string, unknown>[] | Record<string, unknown> | null;
  error: { message: string; code?: string } | null;
}): MockChain => {
  const chain: MockChain = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue(resolvedValue);
  chain.single.mockResolvedValue(resolvedValue);
  return chain;
};

describe('RiskService', () => {
  let service: RiskService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from: mockFrom }) },
        },
      ],
    }).compile();

    service = module.get<RiskService>(RiskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getScore', () => {
    const pipelineKey = '12.345.678/0001-01';

    it('should query risk_fidc_scores when pool_type is fidc', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'fidc' },
        error: null,
      });
      const scoreData = {
        pipeline_key: pipelineKey,
        score_risco: 15,
        faixa_risco: 'Baixo',
        pdd_ratio: 0.005,
      };
      const scoreChain = createChainMock({
        data: scoreData,
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_fidc_scores') return scoreChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      const result = await service.getScore(pipelineKey);

      expect(mockFrom).toHaveBeenCalledWith('pools');
      expect(mockFrom).toHaveBeenCalledWith('risk_fidc_scores');
      expect(result).toEqual({ ...scoreData, pool_type: 'fidc' });
    });

    it('should query risk_tidc_scores when pool_type is tidc', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'tidc' },
        error: null,
      });
      const scoreData = {
        pipeline_key: pipelineKey,
        score_risco: 42,
        faixa_risco: 'Moderado',
        collection_rate: 0.95,
      };
      const scoreChain = createChainMock({
        data: scoreData,
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_tidc_scores') return scoreChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      const result = await service.getScore(pipelineKey);

      expect(mockFrom).toHaveBeenCalledWith('pools');
      expect(mockFrom).toHaveBeenCalledWith('risk_tidc_scores');
      expect(result).toEqual({ ...scoreData, pool_type: 'tidc' });
    });

    it('should throw NotFoundException when pool is not found', async () => {
      const poolChain = createChainMock({
        data: null,
        error: { message: 'not found', code: 'PGRST116' },
      });
      mockFrom.mockReturnValue(poolChain);

      await expect(service.getScore(pipelineKey)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getScore(pipelineKey)).rejects.toThrow(
        `Pool not found for pipeline_key: ${pipelineKey}`,
      );
    });

    it('should throw NotFoundException when score is not found', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'fidc' },
        error: null,
      });
      const scoreChain = createChainMock({
        data: null,
        error: { message: 'not found', code: 'PGRST116' },
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_fidc_scores') return scoreChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      await expect(service.getScore(pipelineKey)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getScore(pipelineKey)).rejects.toThrow(
        `Risk score not found for pipeline_key: ${pipelineKey}`,
      );
    });

    it('should throw InternalServerErrorException on non-PGRST116 score error', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'fidc' },
        error: null,
      });
      const scoreChain = createChainMock({
        data: null,
        error: { message: 'DB connection failed', code: '500' },
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_fidc_scores') return scoreChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      await expect(service.getScore(pipelineKey)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getScore(pipelineKey)).rejects.toThrow(
        'Failed to fetch risk score',
      );
    });
  });

  describe('getMonthly', () => {
    const pipelineKey = '12.345.678/0001-01';

    it('should return array ordered by reference_month DESC', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'fidc' },
        error: null,
      });
      const monthlyData = [
        {
          pipeline_key: pipelineKey,
          reference_month: '2026-03-01',
          pdd_ratio: 0.008,
        },
        {
          pipeline_key: pipelineKey,
          reference_month: '2026-02-01',
          pdd_ratio: 0.006,
        },
        {
          pipeline_key: pipelineKey,
          reference_month: '2026-01-01',
          pdd_ratio: 0.005,
        },
      ];
      const monthlyChain = createChainMock({
        data: monthlyData,
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_fidc_monthly') return monthlyChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      const result = await service.getMonthly(pipelineKey);

      expect(mockFrom).toHaveBeenCalledWith('risk_fidc_monthly');
      expect(monthlyChain.order).toHaveBeenCalledWith('reference_month', {
        ascending: false,
      });
      expect(result).toEqual(monthlyData);
      expect(result).toHaveLength(3);
    });

    it('should respect the limit parameter', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'tidc' },
        error: null,
      });
      const monthlyData = [
        {
          pipeline_key: pipelineKey,
          reference_month: '2026-03-01',
          collection_rate: 0.92,
        },
      ];
      const monthlyChain = createChainMock({
        data: monthlyData,
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_tidc_monthly') return monthlyChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      const result = await service.getMonthly(pipelineKey, 6);

      expect(mockFrom).toHaveBeenCalledWith('risk_tidc_monthly');
      expect(monthlyChain.limit).toHaveBeenCalledWith(6);
      expect(result).toEqual(monthlyData);
    });

    it('should use default limit of 60 when not specified', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'fidc' },
        error: null,
      });
      const monthlyChain = createChainMock({
        data: [],
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_fidc_monthly') return monthlyChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      await service.getMonthly(pipelineKey);

      expect(monthlyChain.limit).toHaveBeenCalledWith(60);
    });

    it('should return empty array when data is null', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'fidc' },
        error: null,
      });
      const monthlyChain = createChainMock({
        data: null,
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_fidc_monthly') return monthlyChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      const result = await service.getMonthly(pipelineKey);

      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException on supabase error', async () => {
      const poolChain = createChainMock({
        data: { pool_type: 'fidc' },
        error: null,
      });
      const monthlyChain = createChainMock({
        data: null,
        error: { message: 'DB timeout', code: '500' },
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'pools') return poolChain;
        if (table === 'risk_fidc_monthly') return monthlyChain;
        return createChainMock({
          data: null,
          error: { message: 'unexpected table' },
        });
      });

      await expect(service.getMonthly(pipelineKey)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getMonthly(pipelineKey)).rejects.toThrow(
        'Failed to fetch monthly risk data',
      );
    });
  });

  describe('getDefinitions', () => {
    it('should return the RISK_METRIC_DEFINITIONS object', () => {
      const result = service.getDefinitions();

      expect(result).toBe(RISK_METRIC_DEFINITIONS);
    });

    it('should contain expected metric keys', () => {
      const result = service.getDefinitions();
      const expectedKeys = [
        'score_risco',
        'faixa_risco',
        'pdd_ratio',
        'pdd_prevista_ensemble',
        'delta_pdd',
        'confidence_tier',
        'inad_early_ratio',
        'inad_mid_ratio',
        'inad_severe_ratio',
        'default_stock_ratio',
        'subordination_ratio',
        'leverage_ratio',
        'liquidity_ratio',
        'recompra_ratio',
        'wal_years',
        'senior_return_mes',
        'mean_rentab',
        'collection_rate',
        'effective_yield',
        'sacado_top5_pct',
        'cedente_top5_pct',
      ];

      for (const key of expectedKeys) {
        expect(result).toHaveProperty(key);
      }
    });

    it('should have label and description for each metric', () => {
      const result = service.getDefinitions();

      for (const [_key, def] of Object.entries(result)) {
        expect(def.label).toBeDefined();
        expect(typeof def.label).toBe('string');
        expect(def.description).toBeDefined();
        expect(typeof def.description).toBe('string');
      }
    });
  });
});
