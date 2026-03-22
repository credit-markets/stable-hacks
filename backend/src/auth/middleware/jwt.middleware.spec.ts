import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtMiddleware } from './jwt.middleware';
import { JwksVerificationService } from '../services/jwks-verification.service';

describe('JwtMiddleware', () => {
  let middleware: JwtMiddleware;
  let jwksVerificationService: JwksVerificationService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockDecodedToken = {
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

  beforeEach(async () => {
    mockRequest = {
      headers: {},
      cookies: {},
    };
    mockResponse = {};
    mockNext = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtMiddleware,
        {
          provide: JwksVerificationService,
          useValue: {
            verifyToken: jest.fn(),
          },
        },
        {
          provide: 'ConfigService',
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<JwtMiddleware>(JwtMiddleware);
    jwksVerificationService = module.get<JwksVerificationService>(
      JwksVerificationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should extract token from Authorization Bearer header', async () => {
      const mockToken = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const verifyTokenSpy = jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockResolvedValue(mockDecodedToken);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(verifyTokenSpy).toHaveBeenCalledWith(mockToken);
      expect(mockRequest.userCredentials).toBeDefined();
      expect(mockRequest.userCredentials?.address).toBe(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      );
      expect(mockRequest.token).toBe(mockToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fall back to DYNAMIC_JWT_TOKEN cookie', async () => {
      const mockToken = 'cookie.jwt.token';
      mockRequest.cookies = {
        DYNAMIC_JWT_TOKEN: mockToken,
      };

      const verifyTokenSpy = jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockResolvedValue(mockDecodedToken);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(verifyTokenSpy).toHaveBeenCalledWith(mockToken);
      expect(mockRequest.userCredentials).toBeDefined();
      expect(mockRequest.token).toBe(mockToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      mockRequest.headers = {};
      mockRequest.cookies = {};

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow('Missing auth token');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockToken = 'invalid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockRejectedValue(new UnauthorizedException('Invalid token'));

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach userCredentials with address, sub, email to request', async () => {
      const mockToken = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const expectedDecoded = {
        ...mockDecodedToken,
        sub: 'user-456',
        email: 'user@example.com',
      };

      jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockResolvedValue(expectedDecoded);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.userCredentials).toBeDefined();
      expect(mockRequest.userCredentials?.address).toBe(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      );
      expect(mockRequest.userCredentials?.sub).toBe('user-456');
      expect(mockRequest.userCredentials?.email).toBe('user@example.com');
      expect(mockRequest.userCredentials?.verified_credentials).toEqual(
        expectedDecoded.verified_credentials,
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() on successful verification', async () => {
      const mockToken = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockResolvedValue(mockDecodedToken);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should extract address from verified_account if verified_credentials is missing', async () => {
      const mockToken = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const decodedWithVerifiedAccount = {
        sub: 'user-123',
        email: 'test@example.com',
        verified_account: {
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockResolvedValue(decodedWithVerifiedAccount);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.userCredentials?.address).toBe(
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prioritize verified_credentials over verified_account', async () => {
      const mockToken = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const decodedWithBoth = {
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
        verified_account: {
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockResolvedValue(decodedWithBoth);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Should use verified_credentials[0].address
      expect(mockRequest.userCredentials?.address).toBe(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass through token with missing address (guard handles DB fallback)', async () => {
      const mockToken = 'no.address.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const decodedWithoutCredentials = {
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockResolvedValue(decodedWithoutCredentials);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.userCredentials).toBeDefined();
      expect(mockRequest.userCredentials?.address).toBe('');
      expect(mockRequest.userCredentials?.sub).toBe('user-123');
    });

    it('should prefer Authorization header over cookie', async () => {
      const headerToken = 'header.jwt.token';
      const cookieToken = 'cookie.jwt.token';

      mockRequest.headers = {
        authorization: `Bearer ${headerToken}`,
      };
      mockRequest.cookies = {
        DYNAMIC_JWT_TOKEN: cookieToken,
      };

      const verifyTokenSpy = jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockResolvedValue(mockDecodedToken);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Should use header token, not cookie token
      expect(verifyTokenSpy).toHaveBeenCalledWith(headerToken);
      expect(mockRequest.token).toBe(headerToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for unexpected errors', async () => {
      const mockToken = 'error.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      jest
        .spyOn(jwksVerificationService, 'verifyToken')
        .mockRejectedValue(new Error('Unexpected database error'));

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow('Invalid or expired authentication token');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed Authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };
      mockRequest.cookies = {};

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow('Missing auth token');
    });
  });
});
