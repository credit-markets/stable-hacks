import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Param,
  HttpStatus,
  HttpCode,
  Res,
  InternalServerErrorException,
  Logger,
  HttpException,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { SupabaseService } from '../database/supabase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  ExtractedUserCredentials,
} from '../common/decorators/authenticated-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  PaginatedResult,
  QueryFilterDto,
} from '../common/dto/query-filter.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserDocument } from './schemas/user.schema';
import { logError } from '../common/utils';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  private readonly isProduction: boolean;
  private readonly authorityAddress: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    this.authorityAddress = this.configService.getOrThrow<string>('AUTHORITY');
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'wallet', required: false, type: String })
  async getAllUsers(
    @Query() queryFilterDto: QueryFilterDto,
    @Query('search') search?: string,
    @Query('wallet') wallet?: string,
  ): Promise<PaginatedResult<UserDocument>> {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'created_at',
      sortOrder = 'descending',
    } = queryFilterDto;

    // Create filter object
    const filter: UserFilterDto = {
      search,
      wallet,
    };

    try {
      const { users, total } = await this.usersService.findAll(
        page,
        pageSize,
        filter,
        sortBy,
        sortOrder,
      );
      const kybMap = await this.usersService.findLatestKybForUsers(
        users.map((u) => u.id),
      );
      const enriched = users.map((user) => ({
        ...user,
        kyb: kybMap.get(user.id) ?? null,
      }));
      return new PaginatedResult(enriched, total, page, pageSize);
    } catch (error) {
      logError(this.logger, 'Error retrieving users', error, {
        page,
        pageSize,
        filter,
      });
      throw new InternalServerErrorException('Failed to retrieve users');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Current user retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCurrentUser(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    try {
      const user = await this.usersService.findByAddress(account);

      if (!user) {
        throw new NotFoundException(`User not found for address: ${account}`);
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      logError(this.logger, 'Error retrieving current user', error, {
        account,
      });

      throw new InternalServerErrorException('Failed to retrieve current user');
    }
  }

  @Get('me/roles')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current user role flags (admin, manager, attester)',
  })
  @ApiResponse({ status: 200, description: 'Role flags returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMyRoles(@AuthenticatedUser() { account }: ExtractedUserCredentials) {
    const isAdmin = account === this.authorityAddress;
    const supabase = this.supabaseService.getClient();

    try {
      const [managerProfileResult, managedPoolsResult, attesterResult] =
        await Promise.all([
          supabase
            .from('managers')
            .select('id')
            .eq('owner_address', account)
            .limit(1),
          supabase.from('pools').select('id').eq('manager_address', account),
          supabase
            .from('pools')
            .select('id')
            .eq('attester_address', account)
            .limit(1),
        ]);

      if (managerProfileResult.error) throw managerProfileResult.error;
      if (managedPoolsResult.error) throw managedPoolsResult.error;
      if (attesterResult.error) throw attesterResult.error;

      return {
        isAdmin,
        isManager:
          !!managerProfileResult.data && managerProfileResult.data.length > 0,
        isAttester: !!attesterResult.data && attesterResult.data.length > 0,
        managedPoolIds: (managedPoolsResult.data ?? []).map((p) => p.id),
      };
    } catch (error) {
      logError(this.logger, 'Failed to fetch user roles', error, { account });
      throw new InternalServerErrorException(
        'Failed to fetch role information',
      );
    }
  }

  @Get(':address')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user by wallet address' })
  @ApiParam({ name: 'address', description: 'Wallet address of the user' })
  @ApiResponse({ status: 200, description: 'User found successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only access own profile',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserByAddress(
    @Param('address') address: string,
    @AuthenticatedUser()
    { account }: ExtractedUserCredentials,
  ) {
    try {
      const isAdmin = account === this.authorityAddress;

      if (isAdmin) {
        const user = await this.usersService.findByAddress(address);
        if (!user) {
          throw new HttpException('User not found', HttpStatus.NO_CONTENT);
        }
        return user;
      }

      // Non-admin: can only access their own profile
      if (address !== account) {
        throw new ForbiddenException('You can only access your own profile');
      }

      const user = await this.usersService.findByAddress(address);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NO_CONTENT);
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      logError(this.logger, 'Error retrieving user by address', error, {
        requestedAddress: address,
        authenticatedAddress: account,
      });

      throw new InternalServerErrorException('Failed to retrieve user');
    }
  }

  // Additional admin endpoint to get user by ID
  @Get('id/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const kyb = await this.usersService.findLatestKybForUser(user.id);
    return { ...user, kyb };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @AuthenticatedUser() { account, userCredentials }: ExtractedUserCredentials,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Create the user
    const user = await this.usersService.createUser(createUserDto, account);

    // Set auth cookie if available
    if (userCredentials.token) {
      const authCookieData = JSON.stringify({
        token: userCredentials.token,
      });

      response.cookie('ina-auth', authCookieData, {
        maxAge: 86400000, // 24 hours in milliseconds
        httpOnly: true, // Prevents JavaScript access - mitigates XSS attacks
        secure: this.isProduction, // HTTPS only in production
        sameSite: 'strict', // CSRF protection - cookie only sent with same-site requests
        path: '/',
      });
    }

    // Return the created user
    return user;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @AuthenticatedUser()
    { account }: ExtractedUserCredentials,
  ) {
    const isAdmin = account === this.authorityAddress;

    const updatedUser = await this.usersService.updateUser(
      id,
      updateUserDto,
      account,
      isAdmin,
    );

    return {
      message: 'User updated successfully',
      user: updatedUser,
    };
  }
}
