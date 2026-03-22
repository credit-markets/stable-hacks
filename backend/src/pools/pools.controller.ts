import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UseGuards,
  Logger,
  Delete,
} from '@nestjs/common';
import { PoolsService } from './pools.service';
import { UpdatePoolDto } from './dto/update-pool.dto';
import { ActivatePoolDto } from './dto/activate-pool.dto';
import { UpdatePoolVisibilityDto } from './dto/update-pool-visibility.dto';
import {
  BuildInvestTxDto,
  BuildRedeemTxDto,
  BuildDrawDownTxDto,
  BuildRepayTxDto,
  InvestorAddressDto,
  RejectInvestmentDto,
  UpdateAttesterDto,
} from './dto/pool-transaction.dto';
import { QueryFilterDto } from '../common/dto/query-filter.dto';
import { NavHistoryQueryDto } from '../common/dto/nav-history-query.dto';
import { QueryFilter } from '../common/types/query.types';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PoolManagerGuard } from '../auth/guards/pool-manager.guard';
import { ManagersService } from '../managers/managers.service';
import {
  AuthenticatedUser,
  ExtractedUserCredentials,
} from '../common/decorators/authenticated-user.decorator';
import { logError } from '../common/utils';
import {
  PoolDeploymentService,
  InvestmentRequestSummary,
  RedemptionRequestSummary,
} from './services/pool-deployment.service';
import { PoolOnChainService } from './services/pool-onchain.service';
import { SOLANA_CONFIG } from '../blockchain/solana-config';

@ApiTags('pools')
@ApiBearerAuth('JWT-auth')
@Controller('pools')
export class PoolsController {
  private readonly logger = new Logger(PoolsController.name);

  constructor(
    private readonly poolsService: PoolsService,
    private readonly managersService: ManagersService,
    private readonly poolDeploymentService: PoolDeploymentService,
    private readonly poolOnChainService: PoolOnChainService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all pools with pagination and filtering' })
  @ApiQuery({ type: QueryFilterDto })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter pools by status (e.g., open, pending, closed, all)',
  })
  @ApiQuery({
    name: 'includeAll',
    required: false,
    type: 'boolean',
    description:
      'Include all pools regardless of status (overrides status filter)',
  })
  @ApiResponse({ status: 200, description: 'Pools retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllPools(@Query() queryFilterDto: QueryFilterDto) {
    try {
      const { page, pageSize, sortBy, sortOrder, filter } = queryFilterDto;

      return this.poolsService.findAll(
        page,
        pageSize,
        sortBy,
        sortOrder,
        filter || {},
      );
    } catch (error) {
      this.logger.error('Failed to fetch pools', error);
      throw new InternalServerErrorException('An internal error occurred');
    }
  }

  @Get('/manager')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get pools managed by the authenticated manager',
  })
  @ApiQuery({
    name: 'type',
    enum: ['manager', 'both'],
    required: false,
    description: 'Filter by field type (manager or both)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter pools by status (e.g., open, pending, closed, all)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Page size (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by (default: startTime)',
  })
  @ApiQuery({
    name: 'sortOrder',
    enum: ['ascending', 'descending'],
    required: false,
    description: 'Sort order (default: descending)',
  })
  @ApiResponse({ status: 200, description: 'Pools retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getManagerPools(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Query('type') type?: 'manager' | 'both',
    @Query() queryFilterDto?: QueryFilterDto,
  ) {
    try {
      const {
        page = 1,
        pageSize = 10,
        sortBy = 'startTime',
        sortOrder = 'descending',
      } = queryFilterDto || {};

      // Build additional filter based on status if provided
      const additionalFilter: QueryFilter = {};

      return this.poolsService.findPoolsByAddress(
        account,
        type ?? 'both',
        page,
        pageSize,
        sortBy,
        sortOrder,
        additionalFilter,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to fetch manager pools', error);
      throw new InternalServerErrorException('An internal error occurred');
    }
  }

  @Get('/by-id/:id')
  @ApiOperation({ summary: 'Get pool by ID' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Pool retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPoolById(@Param('id') id: string) {
    try {
      const result = await this.poolsService.findOneWithEnhancedData(id);
      if (!result) {
        throw new NotFoundException('Pool not found');
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch pool', error);
      throw new InternalServerErrorException('An internal error occurred');
    }
  }

  @Get('/by-address/:address')
  @ApiOperation({ summary: 'Get pool by blockchain address' })
  @ApiParam({ name: 'address', description: 'Pool blockchain address' })
  @ApiResponse({ status: 200, description: 'Pool retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPoolByAddress(@Param('address') address: string) {
    try {
      const result =
        await this.poolsService.findByAddressWithEnhancedData(address);
      if (!result) {
        throw new NotFoundException('Pool not found');
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch pool by address', error);
      throw new InternalServerErrorException('An internal error occurred');
    }
  }

  @Get('/by-address/:address/id')
  @ApiOperation({ summary: 'Get pool database ID by blockchain address' })
  @ApiParam({ name: 'address', description: 'Pool blockchain address' })
  @ApiResponse({
    status: 200,
    description: 'Pool ID retrieved successfully',
    schema: { type: 'object', properties: { poolId: { type: 'string' } } },
  })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPoolIdByAddress(@Param('address') address: string) {
    try {
      const poolId = await this.poolsService.getPoolIdByAddress(address);
      if (!poolId) {
        throw new NotFoundException('Pool not found');
      }
      return { poolId };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch pool ID by address', error);
      throw new InternalServerErrorException('An internal error occurred');
    }
  }

  @Patch('/by-id/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update pool by ID' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: UpdatePoolDto })
  @ApiResponse({ status: 200, description: 'Pool updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updatePoolById(
    @Param('id') id: string,
    @Body() updatePoolDto: UpdatePoolDto,
  ) {
    try {
      // Just verify the pool exists
      const pool = await this.poolsService.findOne(id);
      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      // Update the pool by ID - flat DTO maps directly to Supabase columns
      const updatedPool = await this.poolsService.update(
        id,
        updatePoolDto as Record<string, unknown>,
      );

      if (!updatedPool) {
        throw new InternalServerErrorException('Failed to update pool');
      }

      return {
        message: 'Pool updated',
        poolId: id,
        updatedFields: Object.keys(updatePoolDto),
      };
    } catch (error) {
      logError(this.logger, 'Error updating pool', error, { poolId: id });
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to update pool', error);
      throw new InternalServerErrorException('An internal error occurred');
    }
  }

  // ==================== NEW ADMIN ENDPOINTS ====================

  @Get('admin/pipeline-keys')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'List available pipeline keys (not deployed)' })
  @ApiResponse({
    status: 200,
    description: 'Available pipeline keys with pool type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAvailablePipelineKeys() {
    return {
      pipeline_keys: await this.poolsService.findAvailablePipelineKeys(),
    };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'List all pools (admin view with on-chain data)' })
  @ApiQuery({ name: 'pool_type', required: false, enum: ['fidc', 'tidc'] })
  @ApiQuery({ name: 'deployed', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Admin pool list retrieved' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAdminPools(
    @Query('pool_type') poolType?: string,
    @Query('deployed') deployed?: string,
  ) {
    return this.poolsService.findAllAdminWithOnChain({
      pool_type: poolType,
      deployed:
        deployed === 'true' ? true : deployed === 'false' ? false : undefined,
    });
  }

  @Post('/admin/activate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Activate a pool on the marketplace by pipeline key',
  })
  @ApiBody({ type: ActivatePoolDto })
  @ApiResponse({ status: 201, description: 'Pool activated' })
  @ApiResponse({ status: 400, description: 'No pipeline data for key' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async activatePool(
    @Body() dto: ActivatePoolDto,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    try {
      return await this.poolsService.activateFromPipelineKey(dto, account);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to activate pool', error);
      throw new InternalServerErrorException('An internal error occurred');
    }
  }

  @Get('/admin/redemption-requests')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Get pending redemption requests (cross-pool admin view)',
  })
  @ApiQuery({
    name: 'poolId',
    required: false,
    description: 'Filter by pool ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Redemption requests retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAdminRedemptionRequests(@Query('poolId') poolId?: string) {
    return this.poolsService.getRedemptionRequests(poolId);
  }

  @Patch(':id/visibility')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Toggle pool marketplace visibility (admin only)' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: UpdatePoolVisibilityDto })
  @ApiResponse({ status: 200, description: 'Visibility updated' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateVisibility(
    @Param('id') id: string,
    @Body() dto: UpdatePoolVisibilityDto,
  ) {
    return this.poolsService.updateVisibility(id, dto.is_visible);
  }

  // ==================== NOTA FISCAL ITEMS ENDPOINTS ====================
  // Nota fiscal item endpoints have been moved to the NotaFiscalItemsController
  // See nota-fiscal-items module for NF item management endpoints

  // --- Solana transaction builders -----------------------------------------

  @Post(':id/deploy/build-tx')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Build unsigned initialize_pool transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildDeployTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
  ) {
    const pool = await this.poolsService.findOne(id);
    if (!pool) throw new NotFoundException('Pool not found');
    if (!pool.asset_mint) {
      throw new NotFoundException('Pool missing asset_mint — cannot deploy');
    }
    if (!pool.manager_address) {
      throw new BadRequestException(
        'Pool missing manager_address — configure before deploying',
      );
    }
    return this.poolDeploymentService.buildInitializePoolTx({
      poolId: id,
      authorityAddress: account,
      assetMint: pool.asset_mint,
      managerAddress: pool.manager_address,
      minimumInvestment: pool.minimum_investment || 0,
      maxStaleness: 3600,
      navOracle: this.poolOnChainService.getOraclePda(),
      oracleProgram: SOLANA_CONFIG.MOCK_ORACLE_PROGRAM_ID,
      attester: pool.attester_address || SOLANA_CONFIG.MOCK_SAS_PROGRAM_ID,
      attestationProgram: SOLANA_CONFIG.MOCK_SAS_PROGRAM_ID,
    });
  }

  @Post(':id/open-window/build-tx')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({
    summary: 'Build unsigned open_investment_window transaction',
  })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildOpenWindowTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
  ) {
    return this.poolDeploymentService.buildOpenWindowTx({
      poolId: id,
      managerAddress: account,
    });
  }

  @Post(':id/close-window/build-tx')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({
    summary: 'Build unsigned close_investment_window transaction',
  })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildCloseWindowTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
  ) {
    return this.poolDeploymentService.buildCloseWindowTx({
      poolId: id,
      managerAddress: account,
    });
  }

  @Post(':id/update-attester/build-tx')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Build unsigned update_attester transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: UpdateAttesterDto })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildUpdateAttesterTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
    @Body() dto: UpdateAttesterDto,
  ) {
    return this.poolDeploymentService.buildUpdateAttesterTx({
      poolId: id,
      authorityAddress: account,
      newAttester: dto.newAttester,
      newAttestationProgram: dto.newAttestationProgram,
    });
  }

  // --- Investment flow -----------------------------------------------------

  @Post(':id/invest/build-tx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Build unsigned request_deposit transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: BuildInvestTxDto })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildInvestTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
    @Body() dto: BuildInvestTxDto,
  ) {
    return this.poolDeploymentService.buildRequestDepositTx({
      poolId: id,
      investorAddress: account,
      amount: dto.amount,
    });
  }

  @Post(':id/invest/cancel/build-tx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Build unsigned cancel_deposit transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildCancelInvestTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
  ) {
    return this.poolDeploymentService.buildCancelDepositTx({
      poolId: id,
      investorAddress: account,
    });
  }

  @Post(':id/invest/claim/build-tx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Build unsigned claim_deposit transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildClaimDepositTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
  ) {
    return this.poolDeploymentService.buildClaimDepositTx({
      poolId: id,
      investorAddress: account,
    });
  }

  @Post(':id/invest/approve/build-tx')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({ summary: 'Build unsigned approve_deposit transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: InvestorAddressDto })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildApproveInvestTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
    @Body() dto: InvestorAddressDto,
  ) {
    return this.poolDeploymentService.buildApproveDepositTx({
      poolId: id,
      managerAddress: account,
      investorAddress: dto.investorAddress,
    });
  }

  @Post(':id/invest/reject/build-tx')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({ summary: 'Build unsigned reject_deposit transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: RejectInvestmentDto })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildRejectInvestTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
    @Body() dto: RejectInvestmentDto,
  ) {
    return this.poolDeploymentService.buildRejectDepositTx({
      poolId: id,
      managerAddress: account,
      investorAddress: dto.investorAddress,
      reasonCode: dto.reasonCode,
    });
  }

  // --- Redemption flow -----------------------------------------------------

  @Post(':id/redeem/build-tx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Build unsigned request_redeem transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: BuildRedeemTxDto })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildRedeemTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
    @Body() dto: BuildRedeemTxDto,
  ) {
    return this.poolDeploymentService.buildRequestRedeemTx({
      poolId: id,
      investorAddress: account,
      shares: dto.shares,
    });
  }

  @Post(':id/redeem/approve/build-tx')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({ summary: 'Build unsigned approve_redeem transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: InvestorAddressDto })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildApproveRedeemTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
    @Body() dto: InvestorAddressDto,
  ) {
    return this.poolDeploymentService.buildApproveRedeemTx({
      poolId: id,
      managerAddress: account,
      investorAddress: dto.investorAddress,
    });
  }

  @Post(':id/redeem/cancel/build-tx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Build unsigned cancel_redeem transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildCancelRedeemTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
  ) {
    return this.poolDeploymentService.buildCancelRedeemTx({
      poolId: id,
      investorAddress: account,
    });
  }

  @Post(':id/redeem/claim/build-tx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Build unsigned claim_redemption transaction' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildClaimRedemptionTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
  ) {
    return this.poolDeploymentService.buildClaimRedemptionTx({
      poolId: id,
      investorAddress: account,
    });
  }

  // --- Manager draw-down / repay ---------------------------------------------

  @Post(':id/draw-down/build-tx')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({ summary: 'Build unsigned draw_down transaction (manager)' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: BuildDrawDownTxDto })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildDrawDownTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
    @Body() dto: BuildDrawDownTxDto,
  ) {
    return this.poolDeploymentService.buildDrawDownTx({
      poolId: id,
      managerAddress: account,
      amount: dto.amount,
    });
  }

  @Post(':id/repay/build-tx')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({ summary: 'Build unsigned repay transaction (manager)' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiBody({ type: BuildRepayTxDto })
  @ApiResponse({ status: 200, description: 'Unsigned transaction returned' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async buildRepayTx(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
    @Body() dto: BuildRepayTxDto,
  ) {
    return this.poolDeploymentService.buildRepayTx({
      poolId: id,
      managerAddress: account,
      amount: dto.amount,
    });
  }

  // --- Pool transaction history ------------------------------------------------

  @Get(':id/transactions')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({ summary: 'Get transaction history for a pool' })
  @ApiParam({ name: 'id', description: 'Pool UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by event category (investment, withdrawal, pool)',
  })
  @ApiResponse({ status: 200, description: 'Pool transactions returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPoolTransactions(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('type') type?: string,
  ) {
    return this.poolsService.getPoolTransactions(
      id,
      Number(page) || 1,
      Number(size) || 20,
      type,
    );
  }

  // --- NAV history ----------------------------------------------------------

  @Get(':id/nav-history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get NAV price history for a pool' })
  @ApiParam({ name: 'id', description: 'Pool UUID' })
  @ApiResponse({
    status: 200,
    description: 'NAV history retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getNavHistory(
    @Param('id') id: string,
    @Query() query: NavHistoryQueryDto,
  ) {
    return this.poolsService.getNavHistory(id, {
      from: query.from,
      to: query.to,
      limit: query.limit,
    });
  }

  @Get(':id/investor/balance-states')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Get investor balance states (free shares, locked shares, claimable USDC, wallet USDC)',
  })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Balance states returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getInvestorBalanceStates(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Param('id') id: string,
  ) {
    try {
      return await this.poolOnChainService.getInvestorBalanceStates(
        id,
        account,
      );
    } catch (error) {
      logError(this.logger, 'Failed to get investor balance states', error, {
        poolId: id,
      });
      throw new InternalServerErrorException(
        'Failed to get investor balance states',
      );
    }
  }

  // --- Manager approval queues ----------------------------------------------

  @Get(':id/investment-requests')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({ summary: 'Get investment requests for a pool' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (pending)',
  })
  @ApiResponse({ status: 200, description: 'Investment requests returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getInvestmentRequests(
    @Param('id') id: string,
    @Query('status') status?: string,
  ): Promise<InvestmentRequestSummary[]> {
    return this.poolDeploymentService.getInvestmentRequests(id, status);
  }

  @Get(':id/redemption-requests')
  @UseGuards(JwtAuthGuard, PoolManagerGuard)
  @ApiOperation({ summary: 'Get redemption requests for a pool' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (pending)',
  })
  @ApiResponse({ status: 200, description: 'Redemption requests returned' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires pool manager role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getRedemptionRequests(
    @Param('id') id: string,
    @Query('status') status?: string,
  ): Promise<RedemptionRequestSummary[]> {
    return this.poolDeploymentService.getRedemptionRequests(id, status);
  }

  // --- End Solana transaction builders --------------------------------------

  @Delete('/:poolId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete a pool' })
  @ApiParam({ name: 'poolId', description: 'Pool ID to delete' })
  @ApiResponse({ status: 200, description: 'Pool deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot delete deployed pool',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Pool not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deletePool(@Param('poolId') poolId: string) {
    try {
      const pool = await this.poolsService.findOne(poolId);
      if (!pool) {
        throw new NotFoundException(`Pool with ID ${poolId} not found`);
      }

      // Block deletion of deployed pools to prevent on-chain/off-chain divergence
      if (pool.on_chain_address) {
        throw new BadRequestException(
          `Cannot delete deployed pool ${poolId}. The pool has an on-chain address (${pool.on_chain_address}). ` +
            'Decommission the pool on-chain first before deleting from the database.',
        );
      }

      await this.poolsService.remove(poolId);

      return {
        message: 'Pool deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Failed to delete pool', error);
      throw new InternalServerErrorException('An internal error occurred');
    }
  }
}
