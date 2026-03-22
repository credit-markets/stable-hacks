import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { KybOwnerGuard } from './kyb-owner.guard';
import { SupabaseService } from '../../database/supabase.service';
import { UserAuthService } from '../../common/services/user-auth.service';

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

describe('KybOwnerGuard', () => {
  let guard: KybOwnerGuard;
  let userAuthService: jest.Mocked<
    Pick<UserAuthService, 'findByAuthorizedAddress'>
  >;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  const createMockExecutionContext = (request: unknown): ExecutionContext =>
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
    mockClient = createMockSupabaseClient();

    userAuthService = {
      findByAuthorizedAddress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KybOwnerGuard,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
        {
          provide: UserAuthService,
          useValue: userAuthService,
        },
      ],
    }).compile();

    guard = module.get<KybOwnerGuard>(KybOwnerGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when authenticated user owns the submission', async () => {
    const request = {
      params: { id: 'sub-1' },
      userCredentials: {
        verified_credentials: [
          { address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' },
        ],
      },
    };
    const context = createMockExecutionContext(request);

    userAuthService.findByAuthorizedAddress.mockResolvedValue({
      id: 'user-123',
    } as any);

    mockClient.__queryBuilder.single.mockResolvedValue({
      data: { user_id: 'user-123' },
      error: null,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(userAuthService.findByAuthorizedAddress).toHaveBeenCalledWith(
      '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
    );
    expect(mockClient.from).toHaveBeenCalledWith('kyb_submissions');
  });

  it('should throw ForbiddenException when request.params.id is absent', async () => {
    const request = {
      params: {},
      userCredentials: {
        verified_credentials: [
          { address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' },
        ],
      },
    };
    const context = createMockExecutionContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Missing credentials or submission ID',
    );
  });

  it('should throw ForbiddenException when credentials are missing', async () => {
    const request = {
      params: { id: 'sub-1' },
      userCredentials: undefined,
    };
    const context = createMockExecutionContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Missing credentials or submission ID',
    );
  });

  it('should throw ForbiddenException when user not found', async () => {
    const request = {
      params: { id: 'sub-1' },
      userCredentials: {
        verified_credentials: [
          { address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' },
        ],
      },
    };
    const context = createMockExecutionContext(request);

    userAuthService.findByAuthorizedAddress.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow('User not found');
  });

  it('should throw ForbiddenException when submission not found', async () => {
    const request = {
      params: { id: 'sub-nonexistent' },
      userCredentials: {
        verified_credentials: [
          { address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' },
        ],
      },
    };
    const context = createMockExecutionContext(request);

    userAuthService.findByAuthorizedAddress.mockResolvedValue({
      id: 'user-123',
    } as any);

    mockClient.__queryBuilder.single.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Submission not found',
    );
  });

  it('should throw ForbiddenException when user_id does not match (IDOR prevention)', async () => {
    const request = {
      params: { id: 'sub-1' },
      userCredentials: {
        verified_credentials: [
          { address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' },
        ],
      },
    };
    const context = createMockExecutionContext(request);

    userAuthService.findByAuthorizedAddress.mockResolvedValue({
      id: 'user-123',
    } as any);

    // Submission belongs to a different user
    mockClient.__queryBuilder.single.mockResolvedValue({
      data: { user_id: 'user-other-456' },
      error: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'You do not own this submission',
    );
  });

  it('should throw ForbiddenException when supabase returns an error', async () => {
    const request = {
      params: { id: 'sub-1' },
      userCredentials: {
        verified_credentials: [
          { address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' },
        ],
      },
    };
    const context = createMockExecutionContext(request);

    userAuthService.findByAuthorizedAddress.mockResolvedValue({
      id: 'user-123',
    } as any);

    mockClient.__queryBuilder.single.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Submission not found',
    );
  });
});
