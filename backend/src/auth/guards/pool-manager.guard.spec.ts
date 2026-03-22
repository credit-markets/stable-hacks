import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PoolManagerGuard } from './pool-manager.guard';
import { SupabaseService } from '../../database/supabase.service';

describe('PoolManagerGuard', () => {
  let guard: PoolManagerGuard;

  const VALID_POOL_ID_1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const VALID_POOL_ID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  const VALID_POOL_ID_3 = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

  const mockFrom = jest.fn();
  const mockSupabaseClient = { from: mockFrom };

  const createMockExecutionContext = (
    request: Record<string, unknown>,
  ): ExecutionContext =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    mockFrom.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolManagerGuard,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    guard = module.get<PoolManagerGuard>(PoolManagerGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when wallet is missing', () => {
    it('should throw ForbiddenException when no wallet address in credentials', async () => {
      const request = {
        userCredentials: {},
        params: { id: VALID_POOL_ID_1 },
      };
      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No wallet address in credentials',
      );
    });
  });

  describe('when pool ID is missing', () => {
    it('should throw BadRequestException when no pool ID in params', async () => {
      const request = {
        userCredentials: {
          address: '0xwallet1234567890abcdef1234567890abcdef12',
        },
        params: {},
      };
      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        BadRequestException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Pool ID required in route params (:id or :poolId)',
      );
    });
  });

  describe('pool ID resolution', () => {
    it('should use params.id when available', async () => {
      const wallet = '0xmanager1234567890abcdef1234567890abcdef';
      const request = {
        userCredentials: { address: wallet },
        params: { id: VALID_POOL_ID_1 },
      };
      const context = createMockExecutionContext(request);

      const singleMock = jest.fn().mockResolvedValue({
        data: { manager_address: wallet },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(eqMock).toHaveBeenCalledWith('id', VALID_POOL_ID_1);
    });

    it('should fall back to params.poolId when params.id is not available', async () => {
      const wallet = '0xmanager1234567890abcdef1234567890abcdef';
      const request = {
        userCredentials: { address: wallet },
        params: { poolId: VALID_POOL_ID_2 },
      };
      const context = createMockExecutionContext(request);

      const singleMock = jest.fn().mockResolvedValue({
        data: { manager_address: wallet },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(eqMock).toHaveBeenCalledWith('id', VALID_POOL_ID_2);
    });
  });

  describe('manager authorization', () => {
    it('should allow access when wallet matches pool manager_address', async () => {
      const wallet = '0xmanager1234567890abcdef1234567890abcdef';
      const request = {
        userCredentials: { address: wallet },
        params: { id: VALID_POOL_ID_1 },
      };
      const context = createMockExecutionContext(request);

      const singleMock = jest.fn().mockResolvedValue({
        data: { manager_address: wallet },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when wallet does not match pool manager_address', async () => {
      const wallet = '0xnotmanager123456789012345678901234567890';
      const request = {
        userCredentials: { address: wallet },
        params: { id: VALID_POOL_ID_1 },
      };
      const context = createMockExecutionContext(request);

      const singleMock = jest.fn().mockResolvedValue({
        data: { manager_address: '0xactualmanager123456789012345678901234' },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Not the manager of this pool',
      );
    });

    it('should deny access when pool is not found', async () => {
      const wallet = '0xmanager1234567890abcdef1234567890abcdef';
      const request = {
        userCredentials: { address: wallet },
        params: { id: VALID_POOL_ID_3 },
      };
      const context = createMockExecutionContext(request);

      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Row not found', code: 'PGRST116' },
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Pool not found or access denied',
      );
    });

    it('should deny access when manager_address is null on the pool', async () => {
      const wallet = '0xmanager1234567890abcdef1234567890abcdef';
      const request = {
        userCredentials: { address: wallet },
        params: { id: VALID_POOL_ID_1 },
      };
      const context = createMockExecutionContext(request);

      const singleMock = jest.fn().mockResolvedValue({
        data: { manager_address: null },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Not the manager of this pool',
      );
    });
  });

  describe('UUID validation', () => {
    it('should throw ForbiddenException for non-UUID pool ID', async () => {
      const wallet = '0xmanager1234567890abcdef1234567890abcdef';
      const request = {
        userCredentials: { address: wallet },
        params: { id: 'not-a-valid-uuid' },
      };
      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid pool ID',
      );
    });
  });

  describe('wallet comparison', () => {
    it('should compare wallet address case-sensitively (Solana base58)', async () => {
      const wallet = '0xMANAGER1234567890ABCDEF1234567890ABCDEF';
      const request = {
        userCredentials: { address: wallet },
        params: { id: VALID_POOL_ID_1 },
      };
      const context = createMockExecutionContext(request);

      const singleMock = jest.fn().mockResolvedValue({
        data: { manager_address: wallet },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
