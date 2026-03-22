import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { Database } from '../../database/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

/**
 * Service responsible for authentication-related user operations.
 * All lookups query the `users` table directly (no user_wallets).
 */
@Injectable()
export class UserAuthService {
  private readonly logger = new Logger(UserAuthService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Find a user by dynamic_identifier (email for email auth)
   */
  async findByAuthorizedEmail(email: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('dynamic_identifier', email)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.logger.error('Failed to query user by email', error);
      throw new InternalServerErrorException('User lookup failed');
    }

    return user;
  }

  /**
   * Find a user by account address (case-sensitive)
   */
  async findByAuthorizedAddress(address: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('account', address)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.logger.error('Failed to query user by address', error);
      throw new InternalServerErrorException('User lookup failed');
    }

    return user;
  }

  /**
   * Find a user by Dynamic Labs provider ID (JWT sub)
   */
  async findByAuthorizedId(id: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('provider_id', id)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.logger.error('Failed to query user by provider ID', error);
      throw new InternalServerErrorException('User lookup failed');
    }

    return user;
  }

  /**
   * Validate user access for a specific operation
   */
  async validateUserAccess(
    userId: string,
    address: string,
    isAdmin: boolean = false,
  ): Promise<boolean> {
    if (isAdmin) {
      return true;
    }

    const client = this.supabase.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('account', address)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false;
      this.logger.error('Failed to validate user access', error);
      throw new InternalServerErrorException('User lookup failed');
    }

    return !!user;
  }

  /**
   * Get authenticated user with validation
   */
  async getAuthenticatedUser(address: string): Promise<UserRow> {
    const user = await this.findByAuthorizedAddress(address);
    if (!user) {
      throw new UnauthorizedException('User not found or not authenticated');
    }
    return user;
  }
}
