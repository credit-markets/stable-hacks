import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

@Injectable()
export class RiskAlertsService {
  private readonly logger = new Logger(RiskAlertsService.name);

  constructor(private supabase: SupabaseService) {}

  async checkAlerts(
    pipelineKey: string,
  ): Promise<{ hasAlert: boolean; details?: Record<string, unknown> }> {
    const client = this.supabase.getClient();

    // Lookup pool type
    const { data: pool } = await client
      .from('pools')
      .select('pool_type')
      .eq('pipeline_key', pipelineKey)
      .single();

    if (!pool) throw new NotFoundException(`Pool not found: ${pipelineKey}`);

    const table =
      pool.pool_type === 'tidc' ? 'risk_tidc_scores' : 'risk_fidc_scores';
    const { data: score } = await client
      .from(table)
      .select('alerta_deterioracao, score_risco, faixa_risco')
      .eq('pipeline_key', pipelineKey)
      .single();

    if (!score) return { hasAlert: false };

    return {
      hasAlert: score.alerta_deterioracao ?? false,
      details: score.alerta_deterioracao
        ? { score_risco: score.score_risco, faixa_risco: score.faixa_risco }
        : undefined,
    };
  }
}
