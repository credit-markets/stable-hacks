import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  ExtractedUserCredentials,
} from '../common/decorators/authenticated-user.decorator';
import { PortfolioService } from './portfolio.service';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PortfolioSummaryDto } from './dto/portfolio-summary.dto';
import { PortfolioTransactionDto } from './dto/portfolio-transaction.dto';
import { getErrorMessage, logError } from '../common/utils';

@ApiTags('portfolio')
@ApiBearerAuth('JWT-auth')
@Controller('portfolio')
export class PortfolioController {
  private readonly logger = new Logger(PortfolioController.name);

  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get portfolio summary with analytics' })
  @ApiResponse({
    status: 200,
    description:
      'Pre-computed portfolio analytics including positions, allocation, and risk metrics',
    type: PortfolioSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSummary(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ): Promise<PortfolioSummaryDto> {
    try {
      return await this.portfolioService.getSummary(account);
    } catch (error) {
      logError(this.logger, 'Error in getSummary', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to get portfolio summary: ${getErrorMessage(error)}`,
      );
    }
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get paginated transaction history' })
  @ApiQuery({ name: 'page', required: false, type: String, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'size', required: false, type: String, description: 'Page size (default: 10, max: 50)' })
  @ApiResponse({ status: 200, description: 'Paginated transaction history' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getTransactions(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
    @Query('page') page: string = '1',
    @Query('size') size: string = '10',
  ): Promise<{
    data: PortfolioTransactionDto[];
    total: number;
    page: number;
    size: number;
  }> {
    try {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const sizeNum = Math.min(50, Math.max(1, parseInt(size, 10) || 10));
      const result = await this.portfolioService.getTransactions(
        account,
        pageNum,
        sizeNum,
      );
      return { ...result, page: pageNum, size: sizeNum };
    } catch (error) {
      logError(this.logger, 'Error in getTransactions', error);
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(
        `Failed to get transactions: ${getErrorMessage(error)}`,
      );
    }
  }

  @Get('investment-requests')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my pending investment requests' })
  @ApiResponse({
    status: 200,
    description: 'Pending investment requests for authenticated user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMyInvestmentRequests(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    try {
      return await this.portfolioService.getMyInvestmentRequests(account);
    } catch (error) {
      logError(this.logger, 'Error in getMyInvestmentRequests', error);
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(
        `Failed to get investment requests: ${getErrorMessage(error)}`,
      );
    }
  }

  @Get('redemption-requests')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my pending redemption requests' })
  @ApiResponse({
    status: 200,
    description: 'Pending redemption requests for authenticated user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMyRedemptionRequests(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    try {
      return await this.portfolioService.getMyRedemptionRequests(account);
    } catch (error) {
      logError(this.logger, 'Error in getMyRedemptionRequests', error);
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(
        `Failed to get redemption requests: ${getErrorMessage(error)}`,
      );
    }
  }
}
