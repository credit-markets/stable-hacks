import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  JwksVerificationService,
  VerifiedJwtPayload,
} from '../services/jwks-verification.service';
import { AuthGuardService } from '../services/auth-guard.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AuthorizedCredential } from '../services/auth-guard.service';

// Wallet type constants matching the old enum for test compatibility
const WalletType = {
  EOA: 'EOA' as const,
  Email: 'Email' as const,
};

type Authorized = AuthorizedCredential & { date_added?: Date };

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwksVerificationService: jest.Mocked<JwksVerificationService>;
  let reflector: jest.Mocked<Reflector>;
  let authGuardService: jest.Mocked<AuthGuardService>;

  const mockRequest = {
    headers: {},
    cookies: {},
    userCredentials: undefined as unknown,
    token: undefined as string | undefined,
  };

  const createMockExecutionContext = (
    request = mockRequest,
  ): ExecutionContext => ({
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
  });

  beforeEach(async () => {
    // Reset mock request
    mockRequest.headers = {};
    mockRequest.cookies = {};
    mockRequest.userCredentials = undefined;
    mockRequest.token = undefined;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwksVerificationService,
          useValue: {
            verifyToken: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: AuthGuardService,
          useValue: {
            findUserAuthorizedCredentials: jest.fn(),
            fetchCredentialsFromDynamic: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwksVerificationService = module.get(JwksVerificationService);
    reflector = module.get(Reflector);
    authGuardService = module.get(AuthGuardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('public route detection (@Public decorator)', () => {
    it('should allow access to public routes without authentication', async () => {
      const context = createMockExecutionContext();
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(jwksVerificationService.verifyToken).not.toHaveBeenCalled();
    });

    it('should require authentication for non-public routes', async () => {
      const request = { ...mockRequest, headers: {} };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing authentication token',
      );
    });

    it('should handle undefined @Public decorator (default to protected)', async () => {
      const request = { ...mockRequest, headers: {} };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('token extraction from headers', () => {
    it('should extract token from Authorization header with Bearer prefix', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        verified_credentials: [
          {
            address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
            chain: 'solana',
            id: 'cred-123',
            wallet_name: 'Phantom',
            wallet_provider: 'phantom',
          },
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwksVerificationService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
    });

    it('should reject Authorization header without Bearer prefix', async () => {
      const request = {
        ...mockRequest,
        headers: { authorization: 'Basic sometoken' },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing authentication token',
      );
    });

    it('should handle empty Authorization header', async () => {
      const request = {
        ...mockRequest,
        headers: { authorization: '' },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('token extraction from cookies', () => {
    it('should extract token from DYNAMIC_JWT_TOKEN cookie', async () => {
      const mockToken = 'cookie.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-456',
        verified_credentials: [
          {
            address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
            chain: 'solana',
            id: 'cred-456',
            wallet_name: 'Solflare',
            wallet_provider: 'solflare',
          },
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: {},
        cookies: { DYNAMIC_JWT_TOKEN: mockToken },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwksVerificationService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
    });

    it('should prefer header token over cookie token', async () => {
      const headerToken = 'header.jwt.token';
      const cookieToken = 'cookie.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-789',
        verified_credentials: [
          {
            address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
            chain: 'solana',
            id: 'cred-789',
            wallet_name: 'Phantom',
            wallet_provider: 'phantom',
          },
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${headerToken}` },
        cookies: { DYNAMIC_JWT_TOKEN: cookieToken },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwksVerificationService.verifyToken).toHaveBeenCalledWith(
        headerToken,
      );
    });

    it('should handle non-string cookie values', async () => {
      const request = {
        ...mockRequest,
        headers: {},
        cookies: { DYNAMIC_JWT_TOKEN: 12345 }, // Non-string value
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('credential attachment to request', () => {
    it('should attach verified credentials to request object', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        verified_credentials: [
          {
            address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
            chain: 'solana',
            id: 'cred-123',
            wallet_name: 'Phantom',
            wallet_provider: 'phantom',
          },
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);

      await guard.canActivate(context);

      expect(request.userCredentials).toEqual({
        ...mockPayload,
        address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        verified_credentials: mockPayload.verified_credentials,
        sub: 'user-123',
        email: 'test@example.com',
      });
      expect(request.token).toBe(mockToken);
    });

    it('should extract address from verified_account if verified_credentials is missing', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        verified_account: {
          address: 'BPFLoaderUpgradeab1e11111111111111111111111',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);
      authGuardService.findUserAuthorizedCredentials.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing verified credentials',
      );
    });
  });

  describe('middleware reuse optimization', () => {
    it('should skip verifyToken call when middleware already set userCredentials with sub', async () => {
      const mockToken = 'valid.jwt.token';
      const presetCredentials = {
        sub: 'user-789',
        email: 'preset@example.com',
        verified_credentials: [
          {
            address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
            chain: 'solana',
            id: 'cred-preset',
            wallet_name: 'Phantom',
            wallet_provider: 'phantom',
          },
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
        userCredentials: presetCredentials,
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwksVerificationService.verifyToken).not.toHaveBeenCalled();
      expect(request.userCredentials).toMatchObject({
        address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
        sub: 'user-789',
      });
    });
  });

  describe('database fallback for credentials', () => {
    it('should fetch credentials from database when JWT lacks verified_credentials', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        // No verified_credentials
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockAuthorizedCredentials: Authorized[] = [
        {
          id: 'auth-id-123',
          address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
          type: WalletType.EOA,

          date_added: new Date(),
        },
      ];

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);
      authGuardService.findUserAuthorizedCredentials.mockResolvedValue(
        mockAuthorizedCredentials,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        authGuardService.findUserAuthorizedCredentials,
      ).toHaveBeenCalledWith('user-123');
      expect(request.userCredentials).toMatchObject({
        address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
      });
    });

    it('should map EOA wallet type correctly from database credentials', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockAuthorizedCredentials: Authorized[] = [
        {
          id: 'auth-id-123',
          address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
          type: WalletType.EOA,

          date_added: new Date(),
        },
      ];

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);
      authGuardService.findUserAuthorizedCredentials.mockResolvedValue(
        mockAuthorizedCredentials,
      );

      await guard.canActivate(context);

      expect(request.userCredentials).toMatchObject({
        verified_credentials: [
          {
            address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
            chain: 'solana',
            id: 'auth-id-123',
            wallet_name: 'External Wallet',
            wallet_provider: 'phantom',
          },
        ],
      });
    });

    it('should map Email wallet type correctly from database credentials', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockAuthorizedCredentials: Authorized[] = [
        {
          id: 'auth-id-456',
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          type: WalletType.Email,
          email: 'test@example.com',

          date_added: new Date(),
        },
      ];

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);
      authGuardService.findUserAuthorizedCredentials.mockResolvedValue(
        mockAuthorizedCredentials,
      );

      await guard.canActivate(context);

      expect(request.userCredentials).toMatchObject({
        verified_credentials: [
          {
            address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
            chain: 'solana',
            id: 'auth-id-456',
            wallet_name: 'Email',
            wallet_provider: 'dynamic',
          },
        ],
      });
    });

    it('should throw UnauthorizedException when no credentials found in database', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);
      authGuardService.findUserAuthorizedCredentials.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing verified credentials',
      );
    });

    it('should trigger database fallback when verified_credentials is an empty array', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        verified_credentials: [], // Empty array, not undefined
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockAuthorizedCredentials: Authorized[] = [
        {
          id: 'auth-id-from-db',
          address: 'BPFLoaderUpgradeab1e11111111111111111111111',
          type: WalletType.EOA,

          date_added: new Date(),
        },
      ];

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);
      authGuardService.findUserAuthorizedCredentials.mockResolvedValue(
        mockAuthorizedCredentials,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        authGuardService.findUserAuthorizedCredentials,
      ).toHaveBeenCalledWith('user-123');
      expect(request.userCredentials).toMatchObject({
        address: 'BPFLoaderUpgradeab1e11111111111111111111111',
      });
    });

    it('should extract address from verified_account when verified_credentials[0].address is missing', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        verified_credentials: [
          {
            address: '', // Empty address in verified_credentials
            chain: 'solana',
            id: 'cred-123',
            wallet_name: 'Phantom',
            wallet_provider: 'phantom',
          },
        ],
        verified_account: {
          address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.userCredentials).toMatchObject({
        address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      });
      // Should NOT trigger database fallback since verified_credentials exists (length > 0)
      expect(
        authGuardService.findUserAuthorizedCredentials,
      ).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user ID is missing in token', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: '', // Empty sub
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing user ID in token',
      );
    });
  });

  describe('error handling (401 vs 500)', () => {
    it('should throw 401 UnauthorizedException for invalid token', async () => {
      const mockToken = 'invalid.jwt.token';
      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired token'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw 401 for missing wallet address in credentials', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        verified_credentials: [
          {
            address: '', // Empty address
            chain: 'solana',
            id: 'cred-123',
            wallet_name: 'Phantom',
            wallet_provider: 'phantom',
          },
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Authentication token missing wallet address',
      );
    });

    it('should throw 500 InternalServerErrorException for infrastructure failures', async () => {
      const mockToken = 'valid.jwt.token';
      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Authentication service temporarily unavailable',
      );
    });

    it('should re-throw UnauthorizedException from JWKS verification', async () => {
      const mockToken = 'expired.jwt.token';
      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockRejectedValue(
        new UnauthorizedException('MFA required'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow('MFA required');
    });

    it('should succeed when findUserAuthorizedCredentials returns null but fetchCredentialsFromDynamic returns valid credentials', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const dynamicCredentials: Authorized[] = [
        {
          id: 'dynamic-wallet-id',
          address: 'BPFLoaderUpgradeab1e11111111111111111111111',
          type: WalletType.EOA,
        },
      ];

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);
      authGuardService.findUserAuthorizedCredentials.mockResolvedValue(null);
      authGuardService.fetchCredentialsFromDynamic.mockResolvedValue(
        dynamicCredentials,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        authGuardService.findUserAuthorizedCredentials,
      ).toHaveBeenCalledWith('user-123');
      expect(
        authGuardService.fetchCredentialsFromDynamic,
      ).toHaveBeenCalledWith('user-123');
      expect(request.userCredentials).toMatchObject({
        address: 'BPFLoaderUpgradeab1e11111111111111111111111',
        verified_credentials: [
          {
            address: 'BPFLoaderUpgradeab1e11111111111111111111111',
            chain: 'solana',
            id: 'dynamic-wallet-id',
            wallet_name: 'External Wallet',
            wallet_provider: 'phantom',
          },
        ],
      });
    });

    it('should convert database errors to 500 InternalServerErrorException', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload: VerifiedJwtPayload = {
        sub: 'user-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const request = {
        ...mockRequest,
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(false);
      jwksVerificationService.verifyToken.mockResolvedValue(mockPayload);
      authGuardService.findUserAuthorizedCredentials.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Authentication service temporarily unavailable',
      );
    });
  });
});
