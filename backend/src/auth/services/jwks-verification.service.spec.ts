import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwksVerificationService } from './jwks-verification.service';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

// Mock jwks-rsa
jest.mock('jwks-rsa');

interface MockJwksClient {
  getSigningKey: jest.Mock;
}

describe('JwksVerificationService', () => {
  let service: JwksVerificationService;
  let mockJwksClient: MockJwksClient;

  const mockDynamicEnvId = 'test-env-id-123';
  const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890
-----END PUBLIC KEY-----`;

  beforeEach(async () => {
    // Create mock JwksClient instance
    mockJwksClient = {
      getSigningKey: jest.fn(),
    };

    // Mock the JwksClient constructor
    (JwksClient as jest.MockedClass<typeof JwksClient>).mockImplementation(
      () => mockJwksClient as unknown as JwksClient,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwksVerificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'DYNAMIC_ENVIRONMENT_ID') {
                return mockDynamicEnvId;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JwksVerificationService>(JwksVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw error when DYNAMIC_ENVIRONMENT_ID is missing', () => {
      const mockConfigService = {
        get: jest.fn(() => undefined),
      } as unknown as ConfigService;

      expect(() => {
        new JwksVerificationService(mockConfigService);
      }).toThrow('DYNAMIC_ENVIRONMENT_ID is required for JWKS verification');
    });

    it('should initialize JwksClient with correct configuration', () => {
      expect(JwksClient).toHaveBeenCalledWith({
        jwksUri: `https://app.dynamic.xyz/api/v0/sdk/${mockDynamicEnvId}/.well-known/jwks`,
        rateLimit: true,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 600000,
      });
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify a valid JWT token', async () => {
      const mockToken = 'valid.jwt.token';
      const mockKid = 'test-key-id';
      const mockDecodedPayload = {
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

      // Mock jwt.decode to return token with kid
      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: mockKid, alg: 'RS256' },
        payload: mockDecodedPayload,
        signature: 'mock-signature',
      } as jwt.Jwt);

      // Mock getSigningKey to return public key
      mockJwksClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => mockPublicKey,
      } as unknown as ReturnType<JwksClient['getSigningKey']> extends Promise<
        infer T
      >
        ? T
        : never);

      // Mock jwt.verify to return decoded payload
      jest
        .spyOn(jwt, 'verify')
        .mockImplementation(() => mockDecodedPayload as jwt.JwtPayload);

      const result = await service.verifyToken(mockToken);

      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(mockJwksClient.getSigningKey).toHaveBeenCalledWith(mockKid);
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockPublicKey, {
        algorithms: ['RS256'],
        ignoreExpiration: false,
      });
      expect(result).toEqual(mockDecodedPayload);
    });

    it('should reject expired JWT token', async () => {
      const mockToken = 'expired.jwt.token';
      const mockKid = 'test-key-id';

      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: mockKid, alg: 'RS256' },
        payload: {},
        signature: 'mock-signature',
      } as jwt.Jwt);

      mockJwksClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => mockPublicKey,
      } as unknown as ReturnType<JwksClient['getSigningKey']> extends Promise<
        infer T
      >
        ? T
        : never);

      // Simulate TokenExpiredError
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should reject token with invalid signature', async () => {
      const mockToken = 'invalid.signature.token';
      const mockKid = 'test-key-id';

      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: mockKid, alg: 'RS256' },
        payload: {},
        signature: 'mock-signature',
      } as jwt.Jwt);

      mockJwksClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => mockPublicKey,
      } as unknown as ReturnType<JwksClient['getSigningKey']> extends Promise<
        infer T
      >
        ? T
        : never);

      // Simulate JsonWebTokenError for invalid signature
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid signature');
      });

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw error when MFA is required', async () => {
      const mockToken = 'mfa.required.token';
      const mockKid = 'test-key-id';
      const mockDecodedPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        scope: 'requiresAdditionalAuth',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: mockKid, alg: 'RS256' },
        payload: mockDecodedPayload,
        signature: 'mock-signature',
      } as jwt.Jwt);

      mockJwksClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => mockPublicKey,
      } as unknown as ReturnType<JwksClient['getSigningKey']> extends Promise<
        infer T
      >
        ? T
        : never);

      jest
        .spyOn(jwt, 'verify')
        .mockImplementation(() => mockDecodedPayload as jwt.JwtPayload);

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'MFA required',
      );
    });

    it('should throw error for invalid token format', async () => {
      const mockToken = 'invalid.token';

      // Mock jwt.decode to return string (invalid format)
      jest
        .spyOn(jwt, 'decode')
        .mockReturnValue('invalid' as unknown as jwt.Jwt);

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'Invalid token format',
      );
    });

    it('should throw error when token decode returns null', async () => {
      const mockToken = 'malformed.token';

      jest.spyOn(jwt, 'decode').mockReturnValue(null);

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'Invalid token format',
      );
    });

    it('should cache JWKS keys properly', async () => {
      const mockToken = 'valid.jwt.token';
      const mockKid = 'test-key-id';
      const mockDecodedPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: mockKid, alg: 'RS256' },
        payload: mockDecodedPayload,
        signature: 'mock-signature',
      } as jwt.Jwt);

      mockJwksClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => mockPublicKey,
      } as unknown as ReturnType<JwksClient['getSigningKey']> extends Promise<
        infer T
      >
        ? T
        : never);

      jest
        .spyOn(jwt, 'verify')
        .mockImplementation(() => mockDecodedPayload as jwt.JwtPayload);

      // Verify token twice
      await service.verifyToken(mockToken);
      await service.verifyToken(mockToken);

      // getSigningKey should be called twice (once for each verification)
      // but JwksClient internally caches keys
      expect(mockJwksClient.getSigningKey).toHaveBeenCalledTimes(2);
      expect(mockJwksClient.getSigningKey).toHaveBeenCalledWith(mockKid);
    });

    it('should extract wallet address from verified_credentials', async () => {
      const mockToken = 'valid.jwt.token';
      const mockKid = 'test-key-id';
      const mockDecodedPayload = {
        sub: 'user-123',
        verified_credentials: [
          {
            address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
            chain: 'solana',
          },
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: mockKid, alg: 'RS256' },
        payload: mockDecodedPayload,
        signature: 'mock-signature',
      } as jwt.Jwt);

      mockJwksClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => mockPublicKey,
      } as unknown as ReturnType<JwksClient['getSigningKey']> extends Promise<
        infer T
      >
        ? T
        : never);

      jest
        .spyOn(jwt, 'verify')
        .mockImplementation(() => mockDecodedPayload as jwt.JwtPayload);

      const result = await service.verifyToken(mockToken);

      expect(result.verified_credentials?.[0]?.address).toBe(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      );
    });

    it('should extract wallet address from verified_account', async () => {
      const mockToken = 'valid.jwt.token';
      const mockKid = 'test-key-id';
      const mockDecodedPayload = {
        sub: 'user-123',
        verified_account: {
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: mockKid, alg: 'RS256' },
        payload: mockDecodedPayload,
        signature: 'mock-signature',
      } as jwt.Jwt);

      mockJwksClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => mockPublicKey,
      } as unknown as ReturnType<JwksClient['getSigningKey']> extends Promise<
        infer T
      >
        ? T
        : never);

      jest
        .spyOn(jwt, 'verify')
        .mockImplementation(() => mockDecodedPayload as jwt.JwtPayload);

      const result = await service.verifyToken(mockToken);

      expect(result.verified_account?.address).toBe(
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      );
    });

    it('should rethrow non-JWT errors', async () => {
      const mockToken = 'error.token';
      const mockKid = 'test-key-id';

      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: mockKid, alg: 'RS256' },
        payload: {},
        signature: 'mock-signature',
      } as jwt.Jwt);

      // Simulate unexpected error
      mockJwksClient.getSigningKey.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'Authentication service temporarily unavailable',
      );
    });

    it('should reject token with missing kid header', async () => {
      const mockToken = 'no.kid.token';

      // Mock jwt.decode to return token without kid
      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { alg: 'RS256' }, // No kid field
        payload: { sub: 'user-123' },
        signature: 'mock-signature',
      } as jwt.Jwt);

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'Invalid token: missing key identifier',
      );
    });

    it('should reject token with null kid header', async () => {
      const mockToken = 'null.kid.token';

      // Mock jwt.decode to return token with null kid
      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: null, alg: 'RS256' },
        payload: { sub: 'user-123' },
        signature: 'mock-signature',
      } as unknown as jwt.Jwt);

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'Invalid token: missing key identifier',
      );
    });

    it('should reject token with non-string kid header', async () => {
      const mockToken = 'invalid.kid.token';

      // Mock jwt.decode to return token with numeric kid
      jest.spyOn(jwt, 'decode').mockReturnValue({
        header: { kid: 12345, alg: 'RS256' }, // kid should be string
        payload: { sub: 'user-123' },
        signature: 'mock-signature',
      } as unknown as jwt.Jwt);

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        'Invalid token: missing key identifier',
      );
    });
  });
});
