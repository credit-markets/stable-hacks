import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

@Injectable()
export class NotaFiscalItemsService {
  private readonly logger = new Logger(NotaFiscalItemsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async findByPool(
    poolId: string,
    options?: { status?: string; page?: number; pageSize?: number },
  ) {
    const client = this.supabaseService.getClient();
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('nota_fiscal_items')
      .select('*', { count: 'exact' })
      .eq('pool_id', poolId)
      .order('data_vencimento', { ascending: true })
      .range(from, to);

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error, count } = await query;
    if (error) {
      this.logger.error('Database operation failed', {
        code: error.code,
        message: error.message,
      });
      throw new InternalServerErrorException('Database operation failed');
    }
    const total = count ?? 0;
    return {
      data: data ?? [],
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(itemId: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('nota_fiscal_items')
      .select('*')
      .eq('id', itemId)
      .single();
    if (error)
      throw new NotFoundException(`Nota fiscal item ${itemId} not found`);
    return data;
  }

  async getAggregates(poolId: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('nota_fiscal_items')
      .select(
        'valor_nominal, valor_aquisicao, taxa_desconto, status, data_vencimento',
      )
      .eq('pool_id', poolId);

    if (error) {
      this.logger.error('Database operation failed', {
        code: error.code,
        message: error.message,
      });
      throw new InternalServerErrorException('Database operation failed');
    }
    if (!data?.length) return null;

    const totalItems = data.length;
    const totalFaceValue = data.reduce(
      (sum, item) => sum + Number(item.valor_nominal),
      0,
    );
    const totalAcquisitionValue = data.reduce(
      (sum, item) => sum + Number(item.valor_aquisicao),
      0,
    );

    const itemsWithRate = data.filter((item) => item.taxa_desconto != null);
    const avgDiscountRate =
      itemsWithRate.length > 0
        ? itemsWithRate.reduce(
            (sum, item) => sum + Number(item.taxa_desconto),
            0,
          ) / itemsWithRate.length
        : 0;

    const effectiveYield =
      totalAcquisitionValue > 0
        ? ((totalFaceValue - totalAcquisitionValue) / totalAcquisitionValue) *
          100
        : 0;

    const now = new Date();
    const maturityBuckets = {
      within_30d: 0,
      within_60d: 0,
      within_90d: 0,
      beyond_90d: 0,
    };
    for (const item of data) {
      if (item.status !== 'active') continue;
      const dueDate = new Date(item.data_vencimento);
      const daysToMaturity = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysToMaturity <= 30) maturityBuckets.within_30d++;
      else if (daysToMaturity <= 60) maturityBuckets.within_60d++;
      else if (daysToMaturity <= 90) maturityBuckets.within_90d++;
      else maturityBuckets.beyond_90d++;
    }

    const statusBreakdown: Record<string, number> = {};
    for (const item of data) {
      statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
    }

    return {
      total_items: totalItems,
      total_face_value: totalFaceValue,
      total_acquisition_value: totalAcquisitionValue,
      avg_discount_rate: avgDiscountRate,
      effective_yield: effectiveYield,
      maturity_distribution: maturityBuckets,
      status_breakdown: statusBreakdown,
    };
  }
}
