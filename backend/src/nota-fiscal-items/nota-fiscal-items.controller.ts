import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotaFiscalItemsService } from './nota-fiscal-items.service';

@ApiTags('nota-fiscal-items')
@ApiBearerAuth('JWT-auth')
@Controller('nota-fiscal-items')
export class NotaFiscalItemsController {
  constructor(private readonly nfService: NotaFiscalItemsService) {}

  @Get('pool/:poolId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get nota fiscal items for a pool (paginated)' })
  @ApiParam({ name: 'poolId', description: 'Pool ID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of nota fiscal items',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'settled', 'overdue', 'defaulted'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findByPool(
    @Param('poolId') poolId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.nfService.findByPool(poolId, {
      status,
      page: page ? +page : undefined,
      pageSize: pageSize ? +pageSize : undefined,
    });
  }

  @Get('pool/:poolId/aggregates')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get aggregate statistics for pool nota fiscal items',
  })
  @ApiParam({ name: 'poolId', description: 'Pool ID' })
  @ApiResponse({ status: 200, description: 'Aggregate statistics' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAggregates(@Param('poolId') poolId: string) {
    return this.nfService.getAggregates(poolId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single nota fiscal item' })
  @ApiParam({ name: 'id', description: 'Nota fiscal item ID' })
  @ApiResponse({ status: 200, description: 'Nota fiscal item details' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(@Param('id') id: string) {
    return this.nfService.findOne(id);
  }
}
