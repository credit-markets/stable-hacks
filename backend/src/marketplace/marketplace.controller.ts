import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { TVLResponse } from './interfaces/tvl.interface';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { getErrorMessage } from '../common/utils';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Public()
  @Get('tvl')
  @ApiOperation({ summary: 'Get Total Value Locked (TVL) day data' })
  @ApiResponse({
    status: 200,
    description: 'TVL data retrieved successfully',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getTVLDayData(): Promise<TVLResponse> {
    try {
      return await this.marketplaceService.getTVLDayData();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: getErrorMessage(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
