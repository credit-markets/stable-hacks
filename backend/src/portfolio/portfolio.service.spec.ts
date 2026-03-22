import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { SupabaseService } from '../database/supabase.service';

describe('PortfolioService', () => {
  let service: PortfolioService;

  // Reusable mock builder
  const _createMockClient = (overrides: Record<string, unknown> = {}) => {
    const defaultChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };
    return {
      from: jest.fn().mockReturnValue({ ...defaultChain, ...overrides }),
    };
  };

  const mockSupabase = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return zeroed response for wallet with no investments', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
      mockSupabase.getClient.mockReturnValue(mockClient);

      const result = await service.getSummary('EmptyWallet111');

      expect(result.totalInvested).toBe(0);
      expect(result.currentValue).toBe(0);
      expect(result.unrealizedPnl).toBe(0);
      expect(result.weightedAvgReturn).toBe(0);
      expect(result.weightedCreditScore).toBeNull();
      expect(result.positions).toEqual([]);
      expect(result.allocation).toEqual([]);
    });

    it('should throw InternalServerErrorException when investment query fails', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'DB error' },
              }),
            }),
          }),
        }),
      };
      mockSupabase.getClient.mockReturnValue(mockClient);

      await expect(service.getSummary('WalletAddr')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should compute correct metrics for a single FIDC position', async () => {
      const walletAddress = 'InvestorWallet123';
      const poolId = 'pool-uuid-1';
      const pipelineKey = 'fidc-agro-001';

      // Build a mock client that returns different data per table
      let executionEventsCallCount = 0;
      const fromMock = jest.fn();

      // execution_events uses a two-step pattern:
      // Step 1: select('correlation_id').eq('actor_id').eq('event_type') -> correlation IDs
      // Step 2: select('target_id, payload').in('correlation_id').eq('event_type') -> settled events
      fromMock.mockImplementation((table: string) => {
        if (table === 'execution_events') {
          executionEventsCallCount++;
          if (executionEventsCallCount === 1) {
            // Step 1: find investor's requested correlation IDs
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [{ correlation_id: 'corr-1' }],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (executionEventsCallCount === 2) {
            // Step 2: find claimed events for those correlation IDs
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [{ correlation_id: 'corr-1' }],
                    error: null,
                  }),
                }),
              }),
            };
          }
          // Step 3: get .requested events for claimed deposits
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      target_id: poolId,
                      correlation_id: 'corr-1',
                      payload: { amount: 10000_000000, shares: 10000_000000 },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'pools') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: poolId,
                    title: 'FIDC Agro Senior',
                    pipeline_key: pipelineKey,
                    pool_type: 'fidc',
                    asset_class: 'credit_receivables',
                    price_per_share: 1.05,
                    asset_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'risk_fidc_scores') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    pipeline_key: pipelineKey,
                    score_risco: 0.78,
                    confidence_tier: 2,
                    mean_rentab: 0.01,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        // risk_tidc_scores — not called for fidc
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      mockSupabase.getClient.mockReturnValue({ from: fromMock });

      const result = await service.getSummary(walletAddress);

      expect(result.totalInvested).toBe(10000);
      // 10000 shares * 1.05 NAV = 10500
      expect(result.currentValue).toBe(10500);
      expect(result.unrealizedPnl).toBe(500);
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].poolTitle).toBe('FIDC Agro Senior');
      expect(result.positions[0].creditScore).toBe(78);
      expect(result.positions[0].ltmReturn).toBe(0.12); // 0.01 * 12
      expect(result.positions[0].share).toBe(100);
      expect(result.allocation).toHaveLength(1);
      expect(result.allocation[0].assetClass).toBe('credit_receivables');
    });

    it('should fall back to invested amount when NAV is null', async () => {
      const poolId = 'pool-no-nav';

      let executionEventsCallCount = 0;
      const fromMock = jest.fn().mockImplementation((table: string) => {
        if (table === 'execution_events') {
          executionEventsCallCount++;
          if (executionEventsCallCount === 1) {
            // Step 1: find investor's requested correlation IDs
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [{ correlation_id: 'corr-nav-1' }],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (executionEventsCallCount === 2) {
            // Step 2: find claimed events
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [{ correlation_id: 'corr-nav-1' }],
                    error: null,
                  }),
                }),
              }),
            };
          }
          // Step 3: get .requested events for claimed deposits
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      target_id: poolId,
                      correlation_id: 'corr-nav-1',
                      payload: { amount: 5000_000000, shares: 50_000000 },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'pools') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: poolId,
                    title: 'Pool No NAV',
                    pipeline_key: null,
                    pool_type: 'fidc',
                    asset_class: 'unknown',
                    price_per_share: null,
                    asset_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      mockSupabase.getClient.mockReturnValue({ from: fromMock });

      const result = await service.getSummary('Wallet123');

      // Falls back to invested when NAV is null
      expect(result.currentValue).toBe(5000);
      expect(result.unrealizedPnl).toBe(0);
    });

    it('should compute weighted averages across multiple positions (FIDC + TIDC)', async () => {
      const fidcPoolId = 'pool-fidc';
      const tidcPoolId = 'pool-tidc';
      const fidcPipelineKey = 'fidc_test_001';
      const tidcPipelineKey = 'tidc_test_001';

      let executionEventsCallCount = 0;
      const fromMock = jest.fn().mockImplementation((table: string) => {
        if (table === 'execution_events') {
          executionEventsCallCount++;
          if (executionEventsCallCount === 1) {
            // Step 1: find investor's requested correlation IDs
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [
                      { correlation_id: 'corr-fidc-1' },
                      { correlation_id: 'corr-tidc-1' },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (executionEventsCallCount === 2) {
            // Step 2: find claimed events for those correlation IDs
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [
                      { correlation_id: 'corr-fidc-1' },
                      { correlation_id: 'corr-tidc-1' },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          // Step 3: get .requested events for claimed deposits (carry amount + shares)
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      target_id: fidcPoolId,
                      correlation_id: 'corr-fidc-1',
                      payload: { amount: 20000_000000, shares: 20000_000000 },
                    },
                    {
                      target_id: tidcPoolId,
                      correlation_id: 'corr-tidc-1',
                      payload: { amount: 10000_000000, shares: 10000_000000 },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'pools') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: fidcPoolId,
                    title: 'FIDC Test',
                    pipeline_key: fidcPipelineKey,
                    pool_type: 'fidc',
                    asset_class: 'mixed_receivables',
                    price_per_share: 1.1,
                    asset_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  },
                  {
                    id: tidcPoolId,
                    title: 'TIDC Test',
                    pipeline_key: tidcPipelineKey,
                    pool_type: 'tidc',
                    asset_class: 'creative_economy',
                    price_per_share: 1.05,
                    asset_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'risk_fidc_scores') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    pipeline_key: fidcPipelineKey,
                    score_risco: 0.02,
                    confidence_tier: 1,
                    mean_rentab: 0.012,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'risk_tidc_scores') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    pipeline_key: tidcPipelineKey,
                    score_risco: 0.62,
                    confidence_tier: 2,
                    effective_yield: 5.5,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      mockSupabase.getClient.mockReturnValue({ from: fromMock });

      const result = await service.getSummary('MultiWallet');

      expect(result.positions).toHaveLength(2);
      expect(result.totalInvested).toBe(30000);

      // FIDC: 20000 shares * 1.10 NAV = 22000
      // TIDC: 10000 shares * 1.05 NAV = 10500
      expect(result.currentValue).toBe(32500);
      expect(result.unrealizedPnl).toBe(2500);

      // Weighted avg return: (20000 * 0.144 + 10000 * 5.5) / 30000
      // FIDC mean_rentab 0.012 * 12 = 0.144, TIDC effective_yield = 5.5
      const expectedReturn = (20000 * 0.144 + 10000 * 5.5) / 30000;
      expect(result.weightedAvgReturn).toBeCloseTo(expectedReturn, 2);

      // Weighted credit score: (20000 * 2 + 10000 * 62) / 30000
      const expectedScore = (20000 * 2 + 10000 * 62) / 30000;
      expect(result.weightedCreditScore).toBeCloseTo(expectedScore, 2);

      // Allocation: 2 asset classes
      expect(result.allocation).toHaveLength(2);
      const mixedAlloc = result.allocation.find(
        (a) => a.assetClass === 'mixed_receivables',
      );
      expect(mixedAlloc?.percentage).toBeCloseTo(66.67, 0);
    });
  });

  describe('getTransactions', () => {
    it('should return empty data when wallet has no transactions', async () => {
      // Three sequential calls to execution_events:
      // Step 1: get correlation IDs via actor_id + event_type filter -> empty, short-circuits
      const fromMock = jest.fn().mockImplementation(() => {
        // Step 1: select('correlation_id').eq('actor_id').in('event_type') -> empty
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      mockSupabase.getClient.mockReturnValue({ from: fromMock });

      const result = await service.getTransactions('EmptyWallet', 1, 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return transactions with resolved pool titles and decimal-divided amounts', async () => {
      const walletAddress = 'InvestorWallet123';
      const poolId = 'pool-uuid-1';

      // New getTransactions flow:
      // 1: select('correlation_id').eq('actor_id').in('event_type') → correlation IDs
      // 2: select('id', {count}).in('correlation_id').in('event_type') → count
      // 3: select(...).in().in().order().range() → data page
      // Then 1 call to pools for title + asset_mint
      let executionEventsCallCount = 0;
      const fromMock = jest.fn().mockImplementation((table: string) => {
        if (table === 'execution_events') {
          executionEventsCallCount++;
          if (executionEventsCallCount === 1) {
            // Step 1: return correlation IDs
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  in: jest.fn().mockResolvedValue({
                    data: [{ correlation_id: 'corr-tx-1' }],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (executionEventsCallCount === 2) {
            // Step 2: count query (no .eq chain, just .in().in())
            return {
              select: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  in: jest.fn().mockResolvedValue({ count: 2, error: null }),
                }),
              }),
            };
          }
          // Step 3: data query (.in().in().order().range())
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    range: jest.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'evt-1',
                          event_type: 'investment.settled',
                          target_id: poolId,
                          correlation_id: 'corr-tx-1',
                          payload: { amount: 5000_000000, shares: 50_000000 },
                          chain_tx_id: 'txhash123',
                          created_at: '2026-01-01T00:00:00Z',
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'pools') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: poolId,
                    title: 'FIDC Agro Senior',
                    asset_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      mockSupabase.getClient.mockReturnValue({ from: fromMock });

      const result = await service.getTransactions(walletAddress, 1, 10);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('evt-1');
      expect(result.data[0].eventType).toBe('investment.settled');
      expect(result.data[0].poolTitle).toBe('FIDC Agro Senior');
      expect(result.data[0].poolId).toBe(poolId);
      expect(result.data[0].tokenSymbol).toBe('USDC');
      // 5000_000000 / 10^6 = 5000
      expect(result.data[0].amount).toBe(5000);
      // 50_000000 / 10^6 = 50
      expect(result.data[0].shares).toBe(50);
      expect(result.data[0].chainTxId).toBe('txhash123');
    });
  });
});
