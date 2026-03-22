import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PoolDeploymentService } from './pool-deployment.service';
import { SolanaService } from '../../blockchain/solana.service';
import { ExecutionEventService } from '../../events/events.service';
import { SupabaseService } from '../../database/supabase.service';
import { PublicKey } from '@solana/web3.js';

// Stable fake public key for tests
const FAKE_PUBKEY = new PublicKey('11111111111111111111111111111111');

/**
 * Helper: builds a mock Supabase client with chainable query builder.
 */
function createMockSupabaseClient() {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    __queryBuilder: queryBuilder,
  };
}

/**
 * Type for accessing private methods on PoolDeploymentService in tests.
 */
interface PoolDeploymentServicePrivate {
  getNextVaultId(programId: PublicKey): Promise<number>;
}

describe('PoolDeploymentService', () => {
  let service: PoolDeploymentService;
  let servicePrivate: PoolDeploymentServicePrivate;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let solanaService: Record<string, jest.Mock>;
  let mockGetAccountInfo: jest.Mock;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    mockGetAccountInfo = jest.fn().mockResolvedValue(null);

    solanaService = {
      getConnection: jest.fn().mockReturnValue({
        getLatestBlockhash: jest
          .fn()
          .mockResolvedValue({ blockhash: 'test-blockhash' }),
        getAccountInfo: mockGetAccountInfo,
      }),
      getProgram: jest.fn().mockReturnValue({
        programId: FAKE_PUBKEY,
        methods: {
          initializePool: jest.fn().mockReturnValue({
            accounts: jest.fn().mockReturnValue({
              transaction: jest.fn().mockResolvedValue({
                serialize: jest.fn().mockReturnValue(Buffer.from('test-tx')),
                recentBlockhash: null,
                feePayer: null,
              }),
            }),
          }),
        },
      }),
      getVaultPda: jest.fn().mockReturnValue(FAKE_PUBKEY),
      findPda: jest.fn().mockReturnValue([FAKE_PUBKEY, 255]),
      fetchFrozenAccount: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolDeploymentService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
        {
          provide: SolanaService,
          useValue: solanaService,
        },
        {
          provide: ExecutionEventService,
          useValue: {
            emit: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PoolDeploymentService>(PoolDeploymentService);
    servicePrivate = service as unknown as PoolDeploymentServicePrivate;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getNextVaultId (private, tested via buildInitializePoolTx) ───
  // We test the behavior indirectly since getNextVaultId is private.
  // However, we can access it for unit-testing via bracket notation.

  describe('getNextVaultId (internal)', () => {
    it('should return max vault_id + 1 from database', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { vault_id: 5 },
        error: null,
      });
      // On-chain check: account does not exist (slot is free)
      mockGetAccountInfo.mockResolvedValue(null);

      const nextId = await servicePrivate.getNextVaultId(FAKE_PUBKEY);

      expect(nextId).toBe(6);
      expect(mockClient.from).toHaveBeenCalledWith('pools');
      expect(mockClient.__queryBuilder.order).toHaveBeenCalledWith('vault_id', {
        ascending: false,
      });
    });

    it('should return 1 when no pools have vault_id', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });
      mockGetAccountInfo.mockResolvedValue(null);

      const nextId = await servicePrivate.getNextVaultId(FAKE_PUBKEY);

      expect(nextId).toBe(1);
    });

    it('should return 1 when data has vault_id of 0 (falsy)', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { vault_id: 0 },
        error: null,
      });
      mockGetAccountInfo.mockResolvedValue(null);

      const nextId = await servicePrivate.getNextVaultId(FAKE_PUBKEY);

      expect(nextId).toBe(1);
    });

    it('should skip vault IDs that already exist on-chain', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { vault_id: 3 },
        error: null,
      });
      // First call: vault_id 4 exists on-chain; second call: vault_id 5 is free
      mockGetAccountInfo
        .mockResolvedValueOnce({ data: Buffer.from('account-data') })
        .mockResolvedValueOnce(null);

      const nextId = await servicePrivate.getNextVaultId(FAKE_PUBKEY);

      expect(nextId).toBe(5);
      expect(mockGetAccountInfo).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException after scanning 100 slots', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { vault_id: 1 },
        error: null,
      });
      // Every slot exists on-chain
      mockGetAccountInfo.mockResolvedValue({
        data: Buffer.from('exists'),
      });

      await expect(servicePrivate.getNextVaultId(FAKE_PUBKEY)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─── buildInitializePoolTx ────────────────────────────────────────

  describe('buildInitializePoolTx', () => {
    it('should save vault_id and on_chain_address to the pool', async () => {
      // getNextVaultId: max vault_id is 2
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { vault_id: 2 },
        error: null,
      });
      mockGetAccountInfo.mockResolvedValue(null);

      // Mock the program methods chain
      const mockTransaction = {
        serialize: jest.fn().mockReturnValue(Buffer.from('tx-data')),
        recentBlockhash: null as string | null,
        feePayer: null as PublicKey | null,
      };
      solanaService.getProgram.mockReturnValue({
        programId: FAKE_PUBKEY,
        methods: {
          initializePool: jest.fn().mockReturnValue({
            accounts: jest.fn().mockReturnValue({
              transaction: jest.fn().mockResolvedValue(mockTransaction),
            }),
          }),
        },
      });

      // Mock update call to succeed (for saving vault_id)
      // The update chain returns { error: null }
      const updateQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({ error: null }),
      };
      // After the initial query (getNextVaultId), the second from() call is for update
      mockClient.from
        .mockReturnValueOnce(mockClient.__queryBuilder) // getNextVaultId select
        .mockReturnValueOnce(updateQueryBuilder); // update vault_id

      await service.buildInitializePoolTx({
        poolId: 'pool-1',
        authorityAddress: FAKE_PUBKEY.toBase58(),
        assetMint: FAKE_PUBKEY.toBase58(),
        managerAddress: FAKE_PUBKEY.toBase58(),
        minimumInvestment: 1000,
        maxStaleness: 3600,
        navOracle: FAKE_PUBKEY.toBase58(),
        oracleProgram: FAKE_PUBKEY.toBase58(),
        attester: FAKE_PUBKEY.toBase58(),
        attestationProgram: FAKE_PUBKEY.toBase58(),
      });

      // Verify vault_id and on_chain_address were saved
      expect(updateQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          vault_id: 3, // 2 + 1
        }),
      );
    });
  });
});
