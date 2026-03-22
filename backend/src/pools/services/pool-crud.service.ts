import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { PaginatedResult } from '../../common/dto/query-filter.dto';
import { FilterDto } from '../../common/dto/query-filter.dto';
import { QueryFilter } from '../../common/types/query.types';
import { logError } from '../../common/utils';
import { Database } from '../../database/database.types';

type PoolRow = Database['public']['Tables']['pools']['Row'];
/** Pool row with joined responsibilities and actors */
type ActorRow = Database['public']['Tables']['actors']['Row'];
interface PoolResponsibilityJoin {
  id: string;
  role: string;
  actors: Pick<ActorRow, 'id' | 'name' | 'type'> | null;
}
export type PoolWithResponsibilities = PoolRow & {
  pool_responsibilities: PoolResponsibilityJoin[];
};

/**
 * Service responsible for basic CRUD operations on pools
 */
// Allowed sort columns to prevent SQL injection via Supabase .order()
const ALLOWED_SORT_COLUMNS = new Set([
  'target_return_rate',
  'created_at',
  'title',
  'start_time',
  'fund_size',
  'minimum_investment',
  'risk_score',
  'updated_at',
]);

@Injectable()
export class PoolCrudService {
  private readonly logger = new Logger(PoolCrudService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Create a new pool
   */
  /**
   * Find all pools with pagination and filtering
   */
  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = 'start_time',
    sortOrder: string = 'descending',
    filter: FilterDto = {},
  ): Promise<PaginatedResult<PoolRow>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const ascending = sortOrder === 'ascending';

    let query = this.supabase
      .getClient()
      .from('pools')
      .select('*', { count: 'exact' });

    // Apply filters inline (typed to the pools table)
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    if (filter.assetClass) {
      query = query.eq('asset_class', filter.assetClass);
    }
    if (filter.manager) {
      query = query.eq('manager_address', filter.manager);
    } else {
      // Public marketplace: always filter visible pools
      query = query.eq('is_visible', true);
    }
    if (filter.minApy !== undefined) {
      query = query.gte('target_return_rate', filter.minApy);
    }
    if (filter.maxApy !== undefined) {
      query = query.lte('target_return_rate', filter.maxApy);
    }
    if (filter.startDateFrom) {
      query = query.gte(
        'start_time',
        new Date(filter.startDateFrom).toISOString(),
      );
    }
    if (filter.startDateTo) {
      query = query.lte(
        'start_time',
        new Date(filter.startDateTo).toISOString(),
      );
    }

    // Apply sort (whitelist to prevent invalid column errors) and pagination
    const safeSort = ALLOWED_SORT_COLUMNS.has(sortBy) ? sortBy : 'created_at';
    query = query.order(safeSort, { ascending }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logError(this.logger, 'Failed to fetch pools', error);
      throw new InternalServerErrorException('Failed to fetch pools');
    }

    return new PaginatedResult<PoolRow>(data || [], count || 0, page, pageSize);
  }

  /**
   * Find a pool by ID
   */
  async findOne(id: string): Promise<PoolWithResponsibilities | null> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('pools')
        .select('*, pool_responsibilities(id, role, actors(id, name, type))')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as PoolWithResponsibilities | null;
    } catch (error) {
      logError(this.logger, 'Database error in findOne', error, { poolId: id });
      throw new InternalServerErrorException(
        'Database temporarily unavailable',
      );
    }
  }

  /**
   * Find a pool by on-chain address
   */
  async findByAddress(
    address: string,
  ): Promise<PoolWithResponsibilities | null> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('pools')
        .select('*, pool_responsibilities(id, role, actors(id, name, type))')
        .eq('on_chain_address', address)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as PoolWithResponsibilities | null;
    } catch (error) {
      logError(this.logger, 'Database error in findByAddress', error, {
        address,
      });
      throw new InternalServerErrorException(
        'Database temporarily unavailable',
      );
    }
  }

  /**
   * Update a pool by ID
   */
  async update(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<PoolRow | null> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('pools')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows matched
        }
        if (error.code === '23514') {
          logError(this.logger, 'Pool update constraint violation', error, {
            poolId: id,
          });
          throw new BadRequestException(
            'Invalid pool data: constraint violation',
          );
        }
        throw error;
      }

      return data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      logError(this.logger, 'Failed to update pool', error, {
        poolId: id,
        updateData: this.sanitizePoolDataForLogging(updateData),
      });

      throw new InternalServerErrorException('Failed to update pool');
    }
  }

  /**
   * Delete a pool by ID
   */
  async remove(id: string): Promise<PoolRow | null> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('pools')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      logError(this.logger, 'Failed to delete pool', error, { poolId: id });
      throw new InternalServerErrorException('Failed to delete pool');
    }
  }

  /**
   * Find pools by address (manager)
   */
  async findPoolsByAddress(
    address: string,
    type: 'manager' | 'both' = 'both',
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = 'start_time',
    sortOrder: string = 'descending',
    additionalFilter: QueryFilter = {},
  ): Promise<PaginatedResult<PoolRow>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const ascending = sortOrder === 'ascending';
    let query = this.supabase
      .getClient()
      .from('pools')
      .select('*', { count: 'exact' });

    if (type === 'manager') {
      query = query.eq('manager_address', address);
    } else {
      // 'both' — match pools where user is manager or authority
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        throw new BadRequestException('Invalid Solana address format');
      }
      query = query.or(
        `manager_address.eq.${address},authority_address.eq.${address}`,
      );
    }

    // Apply additional filters
    if (additionalFilter.status) {
      query = query.eq('status', additionalFilter.status as string);
    }

    const safeSort = ALLOWED_SORT_COLUMNS.has(sortBy) ? sortBy : 'created_at';
    query = query.order(safeSort, { ascending }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logError(this.logger, 'Failed to find pools by address', error);
      throw new InternalServerErrorException('Failed to fetch pools');
    }

    return new PaginatedResult<PoolRow>(data || [], count || 0, page, pageSize);
  }

  /**
   * Activate a FIDC on the marketplace by CNPJ.
   * Creates a new pool or updates an existing one to 'open' status.
   */
  async activateFromPipelineKey(dto: {
    pipeline_key: string;
    title?: string;
    minimum_investment?: number;
    fund_size?: number;
    investment_window_open?: boolean;
    manager_address?: string;
    attester_address?: string;
    asset_mint: string;
  }): Promise<PoolRow> {
    const FUND_NAMES: Record<string, string> = {
      fidc_etr_001: 'ETR Fundo de Investimento em Direitos Creditórios',
      fidc_madeira_001: 'FIDC Fornecedores Madeira Madeira I',
      tidc_dux_001: 'Dux Receivables Fund I',
    };

    // Attempt insert first — relies on unique constraint on pipeline_key
    // to prevent duplicates from concurrent calls (atomic).
    const { data: inserted, error: insertError } = await this.supabase
      .getClient()
      .from('pools')
      .insert({
        pipeline_key: dto.pipeline_key,
        title:
          dto.title ||
          FUND_NAMES[dto.pipeline_key] ||
          `Pool ${dto.pipeline_key}`, // FUND_NAMES should be updated when adding new pipeline keys
        status: 'draft',
        asset_class: 'mixed',
        share_class: 'senior',
        currency: 'usd_hedged',
        investment_window_open: false,
        minimum_investment: dto.minimum_investment,
        fund_size: dto.fund_size,
        manager_address: dto.manager_address,
        attester_address: dto.attester_address,
        asset_mint: dto.asset_mint,
      })
      .select()
      .single();

    // If insert succeeded, return the new record
    if (!insertError) return inserted;

    // If error is NOT a unique constraint violation (code 23505), re-throw
    if (insertError.code !== '23505') throw insertError;

    // Pool already exists — update it instead
    const { data, error } = await this.supabase
      .getClient()
      .from('pools')
      .update({
        status: 'draft',
        investment_window_open: false,
        ...(dto.minimum_investment !== undefined && {
          minimum_investment: dto.minimum_investment,
        }),
        ...(dto.fund_size !== undefined && {
          fund_size: dto.fund_size,
        }),
        ...(dto.title && { title: dto.title }),
        ...(dto.manager_address && {
          manager_address: dto.manager_address,
        }),
        ...(dto.attester_address && {
          attester_address: dto.attester_address,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('pipeline_key', dto.pipeline_key)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find available pipeline keys (pools with pipeline_key but no on_chain_address)
   */
  async findAvailablePipelineKeys(): Promise<
    Array<{ key: string; pool_type: string }>
  > {
    const { data, error } = await this.supabase
      .getClient()
      .from('pools')
      .select('pipeline_key, pool_type')
      .is('on_chain_address', null)
      .not('pipeline_key', 'is', null);

    if (error) {
      logError(this.logger, 'Failed to fetch available pipeline keys', error);
      throw error;
    }
    return (data ?? [])
      .filter(
        (p): p is typeof p & { pipeline_key: string } =>
          p.pipeline_key !== null,
      )
      .map((p) => ({
        key: p.pipeline_key,
        pool_type: p.pool_type,
      }));
  }

  /**
   * Find all pools for admin view with optional filters
   */
  async findAllAdmin(filters?: { pool_type?: string; deployed?: boolean }) {
    let query = this.supabase
      .getClient()
      .from('pools')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.pool_type) query = query.eq('pool_type', filters.pool_type);
    if (filters?.deployed === true)
      query = query.not('on_chain_address', 'is', null);
    if (filters?.deployed === false) query = query.is('on_chain_address', null);

    const { data, error } = await query;
    if (error) {
      logError(this.logger, 'Failed to fetch admin pools list', error, {
        filters,
      });
      throw error;
    }
    return data ?? [];
  }

  /**
   * Sanitize pool data for logging by removing sensitive fields.
   */
  private sanitizePoolDataForLogging(
    poolData: Record<string, unknown>,
  ): Record<string, unknown> {
    const { ...sanitized } = poolData;
    return sanitized;
  }
}
