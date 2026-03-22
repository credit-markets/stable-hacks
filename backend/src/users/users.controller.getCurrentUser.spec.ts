import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseService } from '../database/supabase.service';
import { AuthGuardService } from '../auth/services/auth-guard.service';
import { JwksVerificationService } from '../auth/services/jwks-verification.service';
import { ExtractedUserCredentials } from '../common/decorators/authenticated-user.decorator';
import { UserDocument } from './schemas/user.schema';

/**
 * Test suite for UsersController.getCurrentUser method
 * Tests the /users/me endpoint which is protected by JwtAuthGuard
 */
describe('UsersController - getCurrentUser (/users/me)', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    findByAddress: jest.fn(),
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

  const mockJwtService = {
    verify: jest.fn(),
    sign: jest.fn(),
  };

  const mockAuthGuardService = {
    findUserAuthorizedCredentials: jest.fn(),
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
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    const createMockUserCredentials = (
      address = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
    ): ExtractedUserCredentials => ({
      account: address,
      userCredentials: {
        address,
        sub: 'user-123',
        email: 'test@example.com',
        verified_credentials: [
          {
            address,
            chain: 'solana',
            id: 'cred-123',
            wallet_name: 'Phantom',
            wallet_provider: 'phantom',
          },
        ],
        userId: 'user-123',
      },
    });

    const createMockUser = () => ({
      id: 'user-id-123',
      account: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
      referral_id: 'ref-123',
      type: 'individual',
      notifications: {
        transactions: true,
        opportunities: true,
        news: true,
      },
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    });

    it('should return current user data for authenticated request', async () => {
      const mockAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const mockCredentials = createMockUserCredentials(mockAddress);
      const mockUser = createMockUser() as unknown as UserDocument;
      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(mockCredentials);

      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
      expect(result).toEqual(mockUser);
    });

    it('should return 404 when user not found in database', async () => {
      const mockAddress = 'NonExistentAddr1111111111111111111111111111';
      const mockCredentials = createMockUserCredentials(mockAddress);

      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(null);

      await expect(controller.getCurrentUser(mockCredentials)).rejects.toThrow(
        NotFoundException,
      );

      await expect(controller.getCurrentUser(mockCredentials)).rejects.toThrow(
        `User not found for address: ${mockAddress}`,
      );

      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
    });

    it('should use account address from userCredentials correctly', async () => {
      const mockAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      const mockCredentials: ExtractedUserCredentials = {
        account: mockAddress,
        userCredentials: {
          address: mockAddress,
          sub: 'user-456',
          email: 'another@example.com',
          verified_credentials: [
            {
              address: mockAddress,
              chain: 'solana',
              id: 'cred-456',
              wallet_name: 'Solflare',
              wallet_provider: 'solflare',
            },
          ],
          userId: 'user-456',
        },
      };
      const mockUser = createMockUser() as unknown as UserDocument;
      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(mockCredentials);

      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
      expect(result).toEqual(mockUser);
    });

    it('should handle InternalServerErrorException for database errors', async () => {
      const mockAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const mockCredentials = createMockUserCredentials(mockAddress);

      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getCurrentUser(mockCredentials)).rejects.toThrow(
        InternalServerErrorException,
      );

      await expect(controller.getCurrentUser(mockCredentials)).rejects.toThrow(
        'Failed to retrieve current user',
      );

      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
    });

    it('should preserve NotFoundException when thrown', async () => {
      const mockAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const mockCredentials = createMockUserCredentials(mockAddress);

      jest
        .spyOn(usersService, 'findByAddress')
        .mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.getCurrentUser(mockCredentials)).rejects.toThrow(
        NotFoundException,
      );

      await expect(controller.getCurrentUser(mockCredentials)).rejects.toThrow(
        'User not found',
      );
    });

    it('should return complete user object with all fields', async () => {
      const mockAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const mockCredentials = createMockUserCredentials(mockAddress);
      const completeUser = {
        id: 'user-id-123',
        account: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
        referral_id: 'ref-123',
        type: 'individual',
        notifications: {
          transactions: true,
          opportunities: true,
          news: true,
        },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-06-01T00:00:00.000Z',
      };

      jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(completeUser as unknown as UserDocument);

      const result = await controller.getCurrentUser(mockCredentials);

      expect(result).toEqual(completeUser);
    });

    it('should work with different wallet types', async () => {
      const mockAddress = 'BPFLoaderUpgradeab1e11111111111111111111111';
      const mockCredentials: ExtractedUserCredentials = {
        account: mockAddress,
        userCredentials: {
          address: mockAddress,
          sub: 'user-789',
          email: 'emailwallet@example.com',
          verified_credentials: [
            {
              address: mockAddress,
              chain: 'solana',
              id: 'cred-789',
              wallet_name: 'Email',
              wallet_provider: 'dynamic',
            },
          ],
          userId: 'user-789',
        },
      };
      const mockUser = {
        id: 'user-id-789',
        account: 'BPFLoaderUpgradeab1e11111111111111111111111',
        referral_id: 'ref-789',
        type: 'individual',
        notifications: {
          transactions: true,
          opportunities: true,
          news: true,
        },
        created_at: '2024-03-01T00:00:00.000Z',
        updated_at: '2024-03-01T00:00:00.000Z',
      };

      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(mockUser as unknown as UserDocument);

      const result = await controller.getCurrentUser(mockCredentials);

      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
      expect(result).toEqual(mockUser);
    });

    it('should handle case-sensitive address lookup', async () => {
      const mockAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'; // Mixed case
      const mockCredentials = createMockUserCredentials(mockAddress);
      const mockUser = createMockUser() as unknown as UserDocument;

      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(mockCredentials);

      // Should call with exact address from credentials
      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
      expect(result).toEqual(mockUser);
    });
  });

  describe('JwtAuthGuard Integration', () => {
    /**
     * Note: These tests document the expected behavior when JwtAuthGuard is applied.
     * The actual guard is not tested here, but the controller expects the request
     * to have userCredentials attached by the guard before reaching the handler.
     */

    it('should expect account address to be extracted from JWT by guard', async () => {
      const mockAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const mockCredentials: ExtractedUserCredentials = {
        account: mockAddress,
        userCredentials: {
          address: mockAddress,
          sub: 'dynamic-user-id',
          email: 'user@example.com',
          verified_credentials: [
            {
              address: mockAddress,
              chain: 'solana',
              id: 'cred-id',
              wallet_name: 'Phantom',
              wallet_provider: 'phantom',
            },
          ],
        },
      };
      const mockUser = {
        id: 'db-user-id',
        account: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
        referral_id: 'ref-id',
        type: 'individual',
        notifications: {
          transactions: true,
          opportunities: true,
          news: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(mockUser as unknown as UserDocument);

      await controller.getCurrentUser(mockCredentials);

      // Verify the address from JWT credentials is used
      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
    });

    it('should handle user credentials from verified_account field', async () => {
      const mockAddress = '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT';
      const mockCredentials: ExtractedUserCredentials = {
        account: mockAddress,
        userCredentials: {
          address: mockAddress,
          sub: 'user-999',
          verified_account: {
            address: mockAddress,
          },
          verified_credentials: [],
        },
      };
      const mockUser = {
        id: 'user-id-999',
        account: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        referral_id: 'ref-999',
        type: 'individual',
        notifications: {
          transactions: true,
          opportunities: true,
          news: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const findByAddressSpy = jest
        .spyOn(usersService, 'findByAddress')
        .mockResolvedValue(mockUser as unknown as UserDocument);

      const result = await controller.getCurrentUser(mockCredentials);

      expect(findByAddressSpy).toHaveBeenCalledWith(mockAddress);
      expect(result).toEqual(mockUser);
    });
  });
});
