import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RiskService } from './risk.service';

@ApiTags('risk')
@ApiBearerAuth('JWT-auth')
@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  // ── Public (no auth) ────────────────────────────────────────────────
  @Get('definitions')
  @ApiOperation({ summary: 'Get risk metric definitions for tooltips' })
  @ApiResponse({ status: 200, description: 'Metric definitions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getDefinitions() {
    return this.riskService.getDefinitions();
  }

  // ── Authenticated ───────────────────────────────────────────────────
  @Get(':pipelineKey/score')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get risk score for a pool' })
  @ApiParam({ name: 'pipelineKey', description: 'Pool pipeline key' })
  @ApiResponse({ status: 200, description: 'Risk score' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getScore(@Param('pipelineKey') pipelineKey: string) {
    return this.riskService.getScore(pipelineKey);
  }

  @Get(':pipelineKey/monthly')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get monthly risk time series' })
  @ApiParam({ name: 'pipelineKey', description: 'Pool pipeline key' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Monthly risk data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMonthly(
    @Param('pipelineKey') pipelineKey: string,
    @Query('limit') limit?: number,
  ) {
    return this.riskService.getMonthly(pipelineKey, limit ? +limit : 60);
  }
}
