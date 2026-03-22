import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
  Query,
} from '@nestjs/common';
import { ManagersService } from './managers.service';
import {
  CreateManagerDto,
  UpdateManagerDto,
  ManagerDto,
  ManagerFilterDto,
} from './dto';
import { RegisterManagerDto } from './dto/register-manager.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  ExtractedUserCredentials,
} from '../common/decorators/authenticated-user.decorator';
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
import { PaginatedResult } from '../common/dto/query-filter.dto';

@ApiTags('managers')
@ApiBearerAuth('JWT-auth')
@Controller('managers')
export class ManagersController {
  private readonly logger = new Logger(ManagersController.name);

  constructor(private readonly ManagersService: ManagersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new manager profile' })
  @ApiResponse({
    status: 201,
    description: 'The manager profile has been successfully created',
    type: ManagerDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @Body() createManagerDto: CreateManagerDto,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ): Promise<ManagerDto> {
    const manager = await this.ManagersService.create(
      createManagerDto,
      account,
    );

    return manager as unknown as ManagerDto;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get the authenticated user's manager profile" })
  @ApiResponse({
    status: 200,
    description: 'The manager profile has been successfully retrieved',
    type: ManagerDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMyProfile(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ): Promise<ManagerDto> {
    const manager = await this.ManagersService.findByOwner(account);

    return manager as unknown as ManagerDto;
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all manager profiles (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all manager profiles with pagination',
    type: PaginatedResult,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiQuery({ type: ManagerFilterDto })
  async findAll(@Query() filter: ManagerFilterDto) {
    const { managers, total } = await this.ManagersService.findAll(filter);

    return new PaginatedResult(
      managers,
      total,
      filter.page || 1,
      filter.pageSize || 10,
    );
  }

  @Get('address/:address')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a manager profile by owner address' })
  @ApiParam({ name: 'address', description: 'Owner blockchain address' })
  @ApiResponse({
    status: 200,
    description: 'The manager profile has been successfully retrieved',
    type: ManagerDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 404, description: 'Manager not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findByAddress(@Param('address') address: string): Promise<ManagerDto> {
    const manager = await this.ManagersService.findByOwner(address);
    return manager as unknown as ManagerDto;
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post('admin/register')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Register a new manager wallet (admin only)' })
  @ApiBody({ type: RegisterManagerDto })
  @ApiResponse({ status: 201, description: 'Manager registered' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async registerManager(@Body() dto: RegisterManagerDto) {
    return this.ManagersService.registerByAdmin(dto.wallet_address);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Remove manager (admin only)' })
  @ApiParam({ name: 'id', description: 'Manager profile ID' })
  @ApiResponse({ status: 200, description: 'Manager removed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async removeManagerByAdmin(@Param('id') id: string) {
    return this.ManagersService.removeByAdmin(id);
  }

  // ==================== INSTANCE ENDPOINTS ====================

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a manager profile by ID' })
  @ApiParam({ name: 'id', description: 'Manager profile ID' })
  @ApiResponse({
    status: 200,
    description: 'The manager profile has been successfully retrieved',
    type: ManagerDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 404, description: 'Manager not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(@Param('id') id: string): Promise<ManagerDto> {
    const manager = await this.ManagersService.findById(id);
    return manager as unknown as ManagerDto;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a manager profile' })
  @ApiParam({ name: 'id', description: 'Manager profile ID' })
  @ApiBody({ type: UpdateManagerDto })
  @ApiResponse({
    status: 200,
    description: 'The manager profile has been successfully updated',
    type: ManagerDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 404, description: 'Manager not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async update(
    @Param('id') id: string,
    @Body() updateManagerDto: UpdateManagerDto,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ): Promise<ManagerDto> {
    const manager = await this.ManagersService.update(
      id,
      updateManagerDto,
      account,
    );

    return manager as unknown as ManagerDto;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a manager profile' })
  @ApiParam({ name: 'id', description: 'Manager profile ID' })
  @ApiResponse({
    status: 200,
    description: 'The manager profile has been successfully deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 404, description: 'Manager not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async remove(
    @Param('id') id: string,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    await this.ManagersService.remove(id, account);

    return {
      message: 'Manager profile successfully deleted',
    };
  }
}
