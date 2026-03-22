import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { IUserLookupService } from '../interfaces';
import { sanitizeSearchTerm } from '../utils/search-sanitize.util';
import { Database } from '../../database/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

/**
 * Dedicated service for user lookup operations used by other modules.
 * All lookups query the `users` table directly (no user_wallets).
 */
// Allowed sort columns to prevent SQL injection via Supabase .order()
const ALLOWED_SORT_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'account',
  'type',
  'investor_classification',
]);

@Injectable()
export class UserQueryService implements IUserLookupService {
  private readonly logger = new Logger(UserQueryService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Find user by account address (case-insensitive)
   */
  async findByAuthorizedAddress(address: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('account', address)
      .limit(1)
      .single();

    return user ?? null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      return null;
    }

    return data;
  }

  /**
   * Find user by Dynamic Labs provider ID
   */
  async findByAuthorizedId(id: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('provider_id', id)
      .limit(1)
      .single();

    return user ?? null;
  }

  /**
   * Find all users with pagination and filtering.
   * Single-phase query on `users` — no user_wallets join.
   */
  async findAll(
    page: number,
    pageSize: number,
    filter?: Record<string, unknown>,
    sortBy: string = 'created_at',
    sortOrder: 'ascending' | 'descending' = 'descending',
  ): Promise<{ users: UserRow[]; total: number }> {
    const client = this.supabase.getClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const filterSearch =
      filter && typeof filter.search === 'string' ? filter.search : undefined;
    const filterType =
      filter && typeof filter.type === 'string' ? filter.type : undefined;
    const filterWallet =
      filter && typeof filter.wallet === 'string' ? filter.wallet : undefined;

    let query = client.from('users').select('*', { count: 'exact' });

    if (filterType) {
      query = query.eq('type', filterType);
    }

    if (filterSearch) {
      const safeSearch = sanitizeSearchTerm(filterSearch);
      query = query.or(
        `account.ilike.%${safeSearch}%,dynamic_identifier.ilike.%${safeSearch}%`,
      );
    }

    if (filterWallet) {
      query = query.eq('account', filterWallet);
    }

    const safeSort = ALLOWED_SORT_COLUMNS.has(sortBy) ? sortBy : 'created_at';

    const { data, error, count } = await query
      .order(safeSort, { ascending: sortOrder === 'ascending' })
      .range(from, to);

    if (error) {
      this.logger.error('Failed to query users', {
        code: error.code,
        message: error.message,
      });
      throw new BadRequestException('Failed to query users');
    }

    return { users: data ?? [], total: count ?? 0 };
  }
}
