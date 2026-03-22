import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HeliusWebhookService } from './helius-webhook.service';
import { ExecutionEventService } from '../events/events.service';
import { SupabaseService } from '../database/supabase.service';
import { SolanaService } from './solana.service';
import { AttesterGuard } from '../auth/guards/attester.guard';
import { PoolOnChainService } from '../pools/services/pool-onchain.service';

describe('HeliusWebhookService – snapshotPoolTvl', () => {
  let service: HeliusWebhookService;

  const mockEventService = {
    emit: jest.fn().mockResolvedValue(undefined),
  };

  const mockSupabase = {
    getClient: jest.fn(),
  };

  const mockSolanaService = {};

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'AUTHORITY') return 'AuthorityAddr111';
      if (key === 'ATTESTER') return 'AttesterAddr222';
      return '';
    }),
  };

  const mockAttesterGuard = {
    clearCacheForWallet: jest.fn(),
  };

  const mockPoolOnChainService = {
    getPoolOnchainState: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeliusWebhookService,
        { provide: ExecutionEventService, useValue: mockEventService },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: SolanaService, useValue: mockSolanaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AttesterGuard, useValue: mockAttesterGuard },
        { provide: PoolOnChainService, useValue: mockPoolOnChainService },
      ],
    }).compile();

    service = module.get<HeliusWebhookService>(HeliusWebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to call the private method via bracket notation
  const callSnapshotPoolTvl = (
    poolId: string,
    eventType: string,
    txSignature: string,
    timestamp: number,
  ): Promise<void> =>
    (
      service as unknown as Record<
        string,
        (...args: unknown[]) => Promise<void>
      >
    ).snapshotPoolTvl(poolId, eventType, txSignature, timestamp);

  /**
   * BigInt TVL formula used by the service:
   *   priceScaled = BigInt(Math.round(pricePerShare * 1_000_000))
   *   tvl = Number((totalSharesBig * priceScaled) / 1_000_000_000_000n)
   *
   * This helper mirrors that logic for expected values.
   */
  function expectedTvl(totalShares: number, pricePerShare: number): number {
    const priceScaled = BigInt(Math.round(pricePerShare * 1_000_000));
    return Number((BigInt(totalShares) * priceScaled) / 1_000_000_000_000n);
  }

  it('should insert a TVL snapshot when totalShares > 0 and price_per_share exists', async () => {
    const poolId = 'pool-uuid-1';
    const insertMock = jest.fn().mockResolvedValue({ error: null });

    mockPoolOnChainService.getPoolOnchainState.mockResolvedValue({
      totalShares: BigInt(1000000),
    });

    const fromMock = jest.fn().mockImplementation((table: string) => {
      if (table === 'pools') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { price_per_share: 1.05 },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'tvl_snapshots') {
        return { insert: insertMock };
      }
      return {};
    });

    mockSupabase.getClient.mockReturnValue({ from: fromMock });

    await callSnapshotPoolTvl(
      poolId,
      'oracle.price_updated',
      'txSig123',
      1700000000,
    );

    expect(mockPoolOnChainService.getPoolOnchainState).toHaveBeenCalledWith(
      poolId,
    );
    expect(insertMock).toHaveBeenCalledWith({
      pool_id: poolId,
      tvl: expectedTvl(1000000, 1.05),
      total_shares: 1000000,
      price_per_share: 1.05,
      event_type: 'oracle.price_updated',
      chain_tx_id: 'txSig123',
      recorded_at: new Date(1700000000 * 1000).toISOString(),
    });
  });

  it('should skip snapshot when getPoolOnchainState returns null', async () => {
    mockPoolOnChainService.getPoolOnchainState.mockResolvedValue(null);

    const fromMock = jest.fn();
    mockSupabase.getClient.mockReturnValue({ from: fromMock });

    await callSnapshotPoolTvl(
      'pool-1',
      'oracle.price_updated',
      'txSig',
      1700000000,
    );

    // from() should never be called since we bail early
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('should skip snapshot when totalShares is 0', async () => {
    mockPoolOnChainService.getPoolOnchainState.mockResolvedValue({
      totalShares: BigInt(0),
    });

    const fromMock = jest.fn();
    mockSupabase.getClient.mockReturnValue({ from: fromMock });

    await callSnapshotPoolTvl(
      'pool-1',
      'oracle.price_updated',
      'txSig',
      1700000000,
    );

    expect(fromMock).not.toHaveBeenCalled();
  });

  it('should skip snapshot when price_per_share is null', async () => {
    const insertMock = jest.fn();

    mockPoolOnChainService.getPoolOnchainState.mockResolvedValue({
      totalShares: BigInt(5000000),
    });

    const fromMock = jest.fn().mockImplementation((table: string) => {
      if (table === 'pools') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { price_per_share: null },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'tvl_snapshots') {
        return { insert: insertMock };
      }
      return {};
    });

    mockSupabase.getClient.mockReturnValue({ from: fromMock });

    await callSnapshotPoolTvl(
      'pool-1',
      'oracle.price_updated',
      'txSig',
      1700000000,
    );

    expect(insertMock).not.toHaveBeenCalled();
  });

  it('should not throw on RPC failure (non-fatal, logs error)', async () => {
    mockPoolOnChainService.getPoolOnchainState.mockRejectedValue(
      new Error('RPC connection failed'),
    );

    // Should not throw — the method catches errors internally
    await expect(
      callSnapshotPoolTvl(
        'pool-1',
        'oracle.price_updated',
        'txSig',
        1700000000,
      ),
    ).resolves.toBeUndefined();
  });

  it('TVL formula: verify totalShares * pricePerShare / 1e6 produces correct value', async () => {
    const totalShares = 2500000;
    const pricePerShare = 1.12;
    const tvlExpected = expectedTvl(totalShares, pricePerShare);

    const insertMock = jest.fn().mockResolvedValue({ error: null });

    mockPoolOnChainService.getPoolOnchainState.mockResolvedValue({
      totalShares: BigInt(totalShares),
    });

    const fromMock = jest.fn().mockImplementation((table: string) => {
      if (table === 'pools') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { price_per_share: pricePerShare },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'tvl_snapshots') {
        return { insert: insertMock };
      }
      return {};
    });

    mockSupabase.getClient.mockReturnValue({ from: fromMock });

    await callSnapshotPoolTvl(
      'pool-formula',
      'investment.settled',
      'txSigFormula',
      1700000000,
    );

    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedRow = (
      insertMock.mock.calls as Array<[{ tvl: number }]>
    )[0][0];
    expect(insertedRow.tvl).toBe(tvlExpected);
    // 2500000 * 1120000 / 1_000_000_000_000 = 2 (BigInt truncation)
    expect(insertedRow.tvl).toBe(2);
  });
});
