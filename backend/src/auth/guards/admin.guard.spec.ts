import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from './admin.guard';

const AUTHORITY_WALLET = '896g47TLVYnc5coDnoeSVV33Fa9Uognuuavh1wykCbcr';

describe('AdminGuard', () => {
  let guard: AdminGuard;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(AUTHORITY_WALLET),
          },
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw ForbiddenException when no wallet address in credentials', () => {
    const request = { userCredentials: {} };
    const context = createMockExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'No wallet address in credentials',
    );
  });

  it('should throw ForbiddenException when userCredentials is undefined', () => {
    const request = {};
    const context = createMockExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access when wallet matches AUTHORITY', () => {
    const request = { userCredentials: { address: AUTHORITY_WALLET } };
    const context = createMockExecutionContext(request);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should perform case-sensitive comparison (Solana base58 addresses)', () => {
    const request = {
      userCredentials: { address: AUTHORITY_WALLET.toUpperCase() },
    };
    const context = createMockExecutionContext(request);

    // Solana addresses are case-sensitive — uppercased address must NOT match
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when wallet does not match AUTHORITY', () => {
    const request = {
      userCredentials: { address: 'SomeOtherWallet1234567890abcdef' },
    };
    const context = createMockExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Not an admin');
  });

  it('should throw when AUTHORITY env var is not configured', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          AdminGuard,
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: jest.fn().mockImplementation(() => {
                throw new Error('Configuration key "AUTHORITY" does not exist');
              }),
            },
          },
        ],
      }).compile(),
    ).rejects.toThrow();
  });
});
