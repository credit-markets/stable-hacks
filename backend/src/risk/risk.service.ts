import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { logError } from '../common/utils';
import { RISK_METRIC_DEFINITIONS } from './risk-definitions';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Look up the pool_type for a given pipeline_key.
   * Throws NotFoundException if no pool matches.
   */
  private async getPoolType(pipelineKey: string): Promise<'fidc' | 'tidc'> {
    const { data, error } = await this.supabase
      .getClient()
      .from('pools')
      .select('pool_type')
      .eq('pipeline_key', pipelineKey)
      .single();

    if (error || !data) {
      if (error && error.code !== 'PGRST116') {
        logError(this.logger, 'Failed to lookup pool type', error, {
          pipelineKey,
        });
      }
      throw new NotFoundException(
        `Pool not found for pipeline_key: ${pipelineKey}`,
      );
    }

    return data.pool_type as 'fidc' | 'tidc';
  }

  /**
   * Get the risk score for a pool, dispatching to the correct table
   * based on pool_type (FIDC vs TIDC).
   */
  async getScore(pipelineKey: string) {
    const poolType = await this.getPoolType(pipelineKey);
    const table = poolType === 'fidc' ? 'risk_fidc_scores' : 'risk_tidc_scores';

    const { data, error } = await this.supabase
      .getClient()
      .from(table)
      .select('*')
      .eq('pipeline_key', pipelineKey)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logError(this.logger, `Failed to fetch score from ${table}`, error, {
          pipelineKey,
        });
        throw new InternalServerErrorException('Failed to fetch risk score');
      }
      throw new NotFoundException(
        `Risk score not found for pipeline_key: ${pipelineKey}`,
      );
    }
    if (!data) {
      throw new NotFoundException(
        `Risk score not found for pipeline_key: ${pipelineKey}`,
      );
    }

    return { ...data, pool_type: poolType };
  }

  /**
   * Get monthly risk time series for a pool, dispatching to the correct
   * table based on pool_type (FIDC vs TIDC).
   */
  async getMonthly(pipelineKey: string, limit: number = 60) {
    limit = Math.min(Math.max(limit || 60, 1), 120);
    const poolType = await this.getPoolType(pipelineKey);
    const table =
      poolType === 'fidc' ? 'risk_fidc_monthly' : 'risk_tidc_monthly';

    const { data, error } = await this.supabase
      .getClient()
      .from(table)
      .select('*')
      .eq('pipeline_key', pipelineKey)
      .order('reference_month', { ascending: false })
      .limit(limit);

    if (error) {
      logError(
        this.logger,
        `Failed to fetch monthly data from ${table}`,
        error,
        { pipelineKey },
      );
      throw new InternalServerErrorException(
        'Failed to fetch monthly risk data',
      );
    }

    return data ?? [];
  }

  /**
   * Return static metric definitions for UI tooltips.
   */
  getDefinitions() {
    return RISK_METRIC_DEFINITIONS;
  }
}
