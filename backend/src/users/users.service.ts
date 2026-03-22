import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Database } from '../database/database.types';

type UserUpdate = Database['public']['Tables']['users']['Update'];
import { UserCrudService } from './services/user-crud.service';
import { UserAuthService } from '../common/services/user-auth.service';
import { UserDynamicService } from './services/user-dynamic.service';
import { UserKycService } from './services/user-kyc.service';
import { UserFilterDto } from './dto/user-filter.dto';

/**
 * Main orchestrator service for user operations
 * Delegates to specialized services for specific functionality
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly userCrudService: UserCrudService,
    private readonly userAuthService: UserAuthService,
    private readonly userDynamicService: UserDynamicService,
    private readonly userKycService: UserKycService,
  ) {}

  // ==================== DELEGATED CRUD OPERATIONS ====================

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    filter?: UserFilterDto,
    sortBy: string = 'created_at',
    sortOrder: 'ascending' | 'descending' = 'descending',
  ): Promise<{ users: UserDocument[]; total: number }> {
    return this.userCrudService.findAll(
      page,
      pageSize,
      filter as Record<string, unknown>,
      sortBy,
      sortOrder,
    );
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userCrudService.findById(id);
  }

  async findByAddress(address: string): Promise<UserDocument | null> {
    return this.userCrudService.findByAddress(address);
  }

  // ==================== DELEGATED AUTH OPERATIONS ====================

  async findByAuthorizedAddress(address: string): Promise<UserDocument | null> {
    return this.userAuthService.findByAuthorizedAddress(address);
  }

  async findByAuthorizedId(id: string): Promise<UserDocument | null> {
    return this.userAuthService.findByAuthorizedId(id);
  }

  // ==================== USER CREATION ====================

  async create(
    account: string,
    providerId: string,
    dynamicIdentifier: string,
    referredBy?: string,
  ): Promise<UserDocument> {
    return this.userCrudService.create(
      account,
      providerId,
      dynamicIdentifier,
      referredBy,
    );
  }

  // ==================== DELEGATED KYC OPERATIONS ====================

  async findLatestKybForUser(userId: string) {
    return this.userKycService.findLatestKybForUser(userId);
  }

  async findLatestKybForUsers(userIds: string[]) {
    return this.userKycService.findLatestKybForUsers(userIds);
  }

  async updateKycInfo(
    userId: string,
    kycId: number,
    kycAttestation: string,
  ): Promise<UserDocument | null> {
    return this.userKycService.updateKycInfo(userId, kycId, kycAttestation);
  }

  async updateNotificationSettings(
    userId: string,
    transactions: boolean,
    opportunities: boolean,
    news: boolean,
  ): Promise<UserDocument | null> {
    return this.userCrudService.updateNotificationSettings(
      userId,
      transactions,
      opportunities,
      news,
    );
  }

  async createUser(
    createUserDto: CreateUserDto,
    authenticatedAddress: string,
  ): Promise<UserDocument> {
    // Extract wallet info from authorized array (legacy) or fall back to authenticated address
    const walletAddress =
      createUserDto.authorized?.[0]?.address ?? authenticatedAddress;
    const providerId = createUserDto.authorized?.[0]?.id ?? '';
    const dynamicIdentifier =
      createUserDto.authorized?.[0]?.email ?? authenticatedAddress;

    // Check if wallet address already exists
    const existingUser =
      await this.userAuthService.findByAuthorizedAddress(walletAddress);
    if (existingUser) {
      throw new ConflictException('Wallet address already used');
    }

    // Check if the authenticated user exists
    const authenticatedUser =
      await this.userAuthService.findByAuthorizedAddress(authenticatedAddress);

    // If authenticated user exists, return the existing user
    if (authenticatedUser) {
      return authenticatedUser;
    }

    const accountAddress = walletAddress;

    // Create a new user
    const newUser = await this.userCrudService.create(
      accountAddress,
      providerId,
      dynamicIdentifier,
      createUserDto.referred_by,
    );

    const newUserId = String(newUser.id);

    // Update notification settings if provided
    if (createUserDto.notifications) {
      await this.userCrudService.updateNotificationSettings(
        newUserId,
        createUserDto.notifications.transactions ?? true,
        createUserDto.notifications.opportunities ?? true,
        createUserDto.notifications.news ?? true,
      );
    }

    // Return the updated user
    const updatedUser = await this.userCrudService.findById(newUserId);
    if (!updatedUser) {
      throw new InternalServerErrorException('Failed to retrieve created user');
    }
    return updatedUser;
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    authenticatedAddress: string,
    isAdmin: boolean = false,
  ): Promise<UserDocument> {
    // Find the user to update
    const user = await this.userCrudService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate user access
    const hasAccess = await this.userAuthService.validateUserAccess(
      userId,
      authenticatedAddress,
      isAdmin,
    );
    if (!hasAccess) {
      throw new UnauthorizedException(
        'You are not authorized to update this user profile',
      );
    }

    // Build update data
    const updateData: UserUpdate = {};

    if (updateUserDto.notifications) {
      const existingNotifications =
        user.notifications &&
        typeof user.notifications === 'object' &&
        !Array.isArray(user.notifications)
          ? (user.notifications as Record<string, boolean>)
          : {};
      updateData.notifications = {
        ...existingNotifications,
        ...updateUserDto.notifications,
      };
    }

    // Update the user
    const updatedUser = await this.userCrudService.update(userId, updateData);
    if (!updatedUser) {
      throw new InternalServerErrorException('Failed to update user');
    }
    return updatedUser;
  }
}
