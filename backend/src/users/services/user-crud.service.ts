import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { sanitizeSearchTerm } from '../../common/utils/search-sanitize.util';
import * as crypto from 'crypto';
import { Database } from '../../database/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

/**
 * Service responsible for basic CRUD operations on users
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
export class UserCrudService {
  private readonly logger = new Logger(UserCrudService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Find all users with pagination and filtering
   */
  async findAll(
    page: number = 1,
    pageSize: number = 10,
    filter?: Record<string, unknown>,
    sortBy: string = 'created_at',
    sortOrder: 'ascending' | 'descending' = 'descending',
  ): Promise<{ users: UserRow[]; total: number }> {
    const client = this.supabase.getClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build main users query
    let query = client.from('users').select('*', { count: 'exact' });

    if (filter) {
      if (typeof filter.search === 'string') {
        const safeSearch = sanitizeSearchTerm(filter.search);
        query = query.or(
          `account.ilike.%${safeSearch}%,dynamic_identifier.ilike.%${safeSearch}%`,
        );
      }

      if (typeof filter.wallet === 'string') {
        query = query.eq('account', filter.wallet);
      }
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
      throw new BadRequestException('User operation failed');
    }

    return { users: data ?? [], total: count ?? 0 };
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      this.logger.error(`Failed to find user by id: ${error.message}`);
      return null;
    }

    return data;
  }

  /**
   * Find a user by wallet address (case-sensitive — Solana base58)
   */
  async findByAddress(address: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('account', address)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      this.logger.error(`Failed to find user by address: ${error.message}`);
      return null;
    }
    return user ?? null;
  }

  /**
   * Create a new user
   */
  async create(
    account: string,
    providerId: string,
    dynamicIdentifier: string,
    referredBy?: string,
  ): Promise<UserRow> {
    const client = this.supabase.getClient();
    const referralId = this.generateReferralId();

    // Insert user
    const { data: user, error: userError } = await client
      .from('users')
      .insert({
        account,
        referral_id: referralId,
        referred_by: referredBy,
        provider_id: providerId,
        dynamic_identifier: dynamicIdentifier,
      })
      .select()
      .single();

    if (userError) {
      this.logger.error('Failed to create user', {
        code: userError.code,
        message: userError.message,
      });
      throw new BadRequestException('User operation failed');
    }

    return user;
  }

  /**
   * Update a user by ID
   */
  async update(id: string, updateData: UserUpdate): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.logger.error('Failed to update user', {
        code: error.code,
        message: error.message,
      });
      throw new BadRequestException('User operation failed');
    }

    return data;
  }

  /**
   * Delete a user by ID
   */
  async remove(id: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.logger.error(`Failed to delete user: ${error.message}`);
      return null;
    }

    return data;
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    transactions: boolean,
    opportunities: boolean,
    news: boolean,
  ): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .update({
        notifications: { transactions, opportunities, news },
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update notification settings', {
        code: error.code,
        message: error.message,
      });
      throw new BadRequestException('User operation failed');
    }

    return data;
  }

  /**
   * Generate a random 8-character referral ID
   */
  private generateReferralId(): string {
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * Find users by email (searches dynamic_identifier)
   */
  async findByEmail(email: string): Promise<UserRow[]> {
    const client = this.supabase.getClient();
    const { data: users, error } = await client
      .from('users')
      .select('*')
      .ilike('dynamic_identifier', email);
    if (error) {
      this.logger.error(`Failed to find users by email: ${error.message}`);
      return [];
    }
    return users ?? [];
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    kycCompletedCount: number;
  }> {
    const client = this.supabase.getClient();

    const [totalResult, kycResult] = await Promise.all([
      client.from('users').select('*', { count: 'exact', head: true }),
      client
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('kyc_id', 'is', null),
    ]);

    const totalUsers = totalResult.count ?? 0;
    const kycCompletedCount = kycResult.count ?? 0;

    return {
      totalUsers,
      kycCompletedCount,
    };
  }

  /**
   * Bulk operations for user sync
   */
  async bulkCreate(users: Array<Record<string, unknown>>): Promise<UserRow[]> {
    const client = this.supabase.getClient();

    // Map fields: use account directly
    const mapped: UserInsert[] = users.map((u) => ({
      account: typeof u.account === 'string' ? u.account : '',
      referral_id:
        typeof u.referral_id === 'string'
          ? u.referral_id
          : this.generateReferralId(),
      referred_by:
        typeof u.referred_by === 'string' ? u.referred_by : undefined,
      kyc_id: typeof u.kyc_id === 'number' ? u.kyc_id : undefined,
      kyc_attestation:
        typeof u.kyc_attestation === 'string' ? u.kyc_attestation : undefined,
      notifications: u.notifications as UserInsert['notifications'],
    }));

    const { data, error } = await client.from('users').insert(mapped).select();

    if (error) {
      this.logger.error('Failed to bulk create users', {
        code: error.code,
        message: error.message,
      });
      throw new BadRequestException('User operation failed');
    }

    return data ?? [];
  }

  /**
   * Find users created within a date range
   */
  async findUsersCreatedBetween(
    startDate: Date,
    endDate: Date,
  ): Promise<UserRow[]> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      this.logger.error(`Failed to find users by date range: ${error.message}`);
      return [];
    }

    return data ?? [];
  }
}
