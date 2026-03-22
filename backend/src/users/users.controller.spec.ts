import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { Reflector } from '@nestjs/core';
import { AuthGuardService } from '../auth/services/auth-guard.service';
import { JwksVerificationService } from '../auth/services/jwks-verification.service';
import { UserDocument } from './schemas/user.schema';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    findByAddress: jest.fn(),
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      }),
    }),
  };

  const mockReflector = {
    get: jest.fn(),
    getAll: jest.fn(),
    getAllAndOverride: jest.fn(),
    getAllAndMerge: jest.fn(),
  };

  const mockAuthGuardService = {
    extractAndVerifyToken: jest.fn(),
    attachUserCredentials: jest.fn(),
  };

  const mockJwksVerificationService = {
    verifyToken: jest.fn().mockResolvedValue({
      sub: 'test-user-id',
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
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'AUTHORITY')
        return '896g47TLVYnc5coDnoeSVV33Fa9Uognuuavh1wykCbcr';
      throw new Error(`Configuration key "${key}" does not exist`);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AuthGuardService,
          useValue: mockAuthGuardService,
        },
        {
          provide: JwksVerificationService,
          useValue: mockJwksVerificationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'USER_LOOKUP_SERVICE',
          useValue: {
            findByAuthorizedId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  const createMockUserCredentials = (
    address = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
  ) => ({
    account: address,
    userCredentials: {
      address,
      verified_credentials: [
        {
          address,
          chain: 'solana',
          id: 'cred-123',
          wallet_name: 'Test Wallet',
          wallet_provider: 'dynamic',
        },
      ],
      userId: 'user-123',
    },
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return current user data for authenticated request', async () => {
      const mockAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const mockCredentials = createMockUserCredentials(mockAddress);
      const mockUser = {
        id: 'user-id-123',
        account: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        referral_id: 'ref-123',
        type: 'individual',
      };

      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(mockUser as unknown as UserDocument);

      const result = await controller.getCurrentUser(mockCredentials);

      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
      expect(result).toEqual(mockUser);
    });

    it('should return 404 when user not found', async () => {
      const mockAddress = 'NonExistentAddr1111111111111111111111111111';
      const mockCredentials = createMockUserCredentials(mockAddress);

      jest.spyOn(usersService, 'findByAddress').mockResolvedValue(null);

      await expect(controller.getCurrentUser(mockCredentials)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database errors', async () => {
      const mockCredentials = createMockUserCredentials();

      jest
        .spyOn(usersService, 'findByAddress')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getCurrentUser(mockCredentials)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
