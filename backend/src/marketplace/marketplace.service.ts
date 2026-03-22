import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { TVLResponse } from './interfaces/tvl.interface';
import { SupabaseService } from '../database/supabase.service';
import { logError } from '../common/utils';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getTVLDayData(): Promise<TVLResponse> {
    const client = this.supabase.getClient();

    // Current TVL: latest snapshot per pool, summed
    const { data: latestSnapshots, error: latestError } =
      await client.rpc('get_current_tvl');

    if (latestError) {
      logError(this.logger, 'Failed to fetch current TVL', latestError);
      throw new InternalServerErrorException('Failed to fetch TVL data');
    }

    const totalTVL = latestSnapshots?.[0]?.total_tvl ?? 0;

    // Historical: daily aggregates
    const { data: dailyData, error: dailyError } =
      await client.rpc('get_daily_tvl');

    if (dailyError) {
      logError(this.logger, 'Failed to fetch daily TVL', dailyError);
      throw new InternalServerErrorException('Failed to fetch TVL history');
    }

    const tvldayDatas = (dailyData || []).map((row, i) => ({
      id: String(i),
      tvl: String(row.tvl),
      timestamp: String(new Date(row.day).getTime() / 1000),
    }));

    return {
      totalTVL: String(totalTVL),
      tvldayDatas,
    };
  }
}
