import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttesterGuard } from './attester.guard';
import { SupabaseService } from '../../database/supabase.service';

describe('AttesterGuard', () => {
  let guard: AttesterGuard;

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
        AttesterGuard,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('0xADMIN_AUTHORITY_ADDRESS'),
          },
        },
      ],
    }).compile();

    guard = module.get<AttesterGuard>(AttesterGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when wallet is missing', () => {
    it('should throw ForbiddenException when no wallet address in credentials', async () => {
      const request = { userCredentials: {} };
      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No wallet address in credentials',
      );
    });

    it('should throw ForbiddenException when userCredentials is undefined', async () => {
      const request = {};
      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('attester authorization', () => {
    it('should allow access when wallet is attester on a pool', async () => {
      const wallet = '0xattester1234567890abcdef1234567890abcdef';
      const request = { userCredentials: { address: wallet } };
      const context = createMockExecutionContext(request);

      const limitMock = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'pool-1' }], error: null });
      const eqMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(eqMock).toHaveBeenCalledWith('attester_address', wallet);
    });

    it('should deny access when wallet is not attester on any pool', async () => {
      const wallet = '0xnotattester12345678901234567890abcdef12';
      const request = { userCredentials: { address: wallet } };
      const context = createMockExecutionContext(request);

      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Not an attester',
      );
    });

    it('should deny access when query returns null data', async () => {
      const wallet = '0xnulldata1234567890abcdef1234567890abcdef';
      const request = { userCredentials: { address: wallet } };
      const context = createMockExecutionContext(request);

      const limitMock = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const eqMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Not an attester',
      );
    });
  });

  describe('Supabase error handling', () => {
    it('should throw InternalServerErrorException when query fails', async () => {
      const wallet = '0xattestererr1234567890abcdef1234567890ab';
      const request = { userCredentials: { address: wallet } };
      const context = createMockExecutionContext(request);

      const limitMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection refused', code: 'ECONNREFUSED' },
      });
      const eqMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      await expect(guard.canActivate(context)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Unable to verify attester status',
      );
    });

    it('should not cache errors (fail closed, allow retry)', async () => {
      const wallet = '0xattesterretry1234567890abcdef1234567890';
      const request = { userCredentials: { address: wallet } };

      // First call: Supabase error
      const limitErrorMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Timeout' },
      });
      const eqErrorMock = jest.fn().mockReturnValue({ limit: limitErrorMock });
      const selectErrorMock = jest.fn().mockReturnValue({ eq: eqErrorMock });

      mockFrom.mockReturnValue({ select: selectErrorMock });

      const context1 = createMockExecutionContext(request);
      await expect(guard.canActivate(context1)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Second call: Supabase recovers — should hit DB, not cache
      mockFrom.mockClear();
      const limitSuccessMock = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'pool-1' }], error: null });
      const eqSuccessMock = jest
        .fn()
        .mockReturnValue({ limit: limitSuccessMock });
      const selectSuccessMock = jest
        .fn()
        .mockReturnValue({ eq: eqSuccessMock });

      mockFrom.mockReturnValue({ select: selectSuccessMock });

      const context2 = createMockExecutionContext(request);
      const result = await guard.canActivate(context2);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalled();
    });
  });

  describe('caching behavior', () => {
    it('should return cached positive result without querying database', async () => {
      const wallet = '0xcachedattester1234567890abcdef1234567890';
      const request = { userCredentials: { address: wallet } };

      // First call: DB returns attester = true
      const limitMock = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'pool-1' }], error: null });
      const eqMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      const context1 = createMockExecutionContext(request);
      await guard.canActivate(context1);

      // Second call: should use cache
      mockFrom.mockClear();
      const context2 = createMockExecutionContext(request);
      const result = await guard.canActivate(context2);

      expect(result).toBe(true);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should return cached negative result and throw ForbiddenException', async () => {
      const wallet = '0xcachednonattester12345678901234567890ab';
      const request = { userCredentials: { address: wallet } };

      // First call: DB returns attester = false
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      const context1 = createMockExecutionContext(request);
      await expect(guard.canActivate(context1)).rejects.toThrow(
        ForbiddenException,
      );

      // Second call: should use cache and throw
      mockFrom.mockClear();
      const context2 = createMockExecutionContext(request);
      await expect(guard.canActivate(context2)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context2)).rejects.toThrow(
        'Not an attester',
      );

      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('wallet comparison', () => {
    it('should compare wallet address case-sensitively (Solana base58)', async () => {
      const wallet = '0xATTESTER1234567890ABCDEF1234567890ABCDEF';
      const request = { userCredentials: { address: wallet } };
      const context = createMockExecutionContext(request);

      const limitMock = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'pool-1' }], error: null });
      const eqMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });

      mockFrom.mockReturnValue({ select: selectMock });

      await guard.canActivate(context);

      expect(eqMock).toHaveBeenCalledWith('attester_address', wallet);
    });
  });

  describe('admin authority', () => {
    it('should still query pools for authority address (no admin bypass in attester guard)', async () => {
      const request = {
        userCredentials: { address: '0xADMIN_AUTHORITY_ADDRESS' },
      };
      const context = createMockExecutionContext(request);

      const limitMock = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'pool-1' }], error: null });
      const eqMock = jest.fn().mockReturnValue({ limit: limitMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ select: selectMock });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('pools');
    });
  });
});
