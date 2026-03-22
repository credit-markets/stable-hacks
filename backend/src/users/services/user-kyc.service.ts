import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { logError } from '../../common/utils';
import { Database } from '../../database/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

export interface KycInfo {
  kycId: number;
  kycAttestation: string;
  completedAt?: Date;
}

/**
 * Service responsible for KYC-related operations
 */
@Injectable()
export class UserKycService {
  private readonly logger = new Logger(UserKycService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Fetch the latest KYB submission for a user
   */
  async findLatestKybForUser(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('kyb_submissions')
      .select('legal_name, status, risk_score, risk_band')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logError(this.logger, 'Failed to fetch KYB for user', error, { userId });
      return null;
    }
    return data;
  }

  /**
   * Batch fetch the latest KYB submission for multiple users.
   * Uses a single query with DISTINCT ON to avoid N+1.
   */
  async findLatestKybForUsers(userIds: string[]): Promise<
    Map<
      string,
      {
        legal_name: string | null;
        status: string | null;
        risk_score: number | null;
        risk_band: string | null;
      }
    >
  > {
    if (userIds.length === 0) return new Map();

    const { data, error } = await this.supabase
      .getClient()
      .from('kyb_submissions')
      .select('user_id, legal_name, status, risk_score, risk_band')
      .in('user_id', userIds)
      .order('user_id')
      .order('created_at', { ascending: false });

    if (error) {
      logError(this.logger, 'Failed to batch fetch KYB data', error, {
        count: userIds.length,
      });
      return new Map();
    }

    // Keep only the first (most recent) entry per user_id
    const result = new Map<
      string,
      {
        legal_name: string | null;
        status: string | null;
        risk_score: number | null;
        risk_band: string | null;
      }
    >();
    for (const row of data ?? []) {
      if (!result.has(row.user_id)) {
        result.set(row.user_id, {
          legal_name: row.legal_name,
          status: row.status,
          risk_score: row.risk_score,
          risk_band: row.risk_band,
        });
      }
    }
    return result;
  }

  /**
   * Update KYC information for a user
   */
  async updateKycInfo(
    userId: string,
    kycId: number,
    kycAttestation: string,
  ): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .update({
        kyc_id: kycId,
        kyc_attestation: kycAttestation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.logger.error(`Failed to update KYC info: ${error.message}`);
      return null;
    }

    return data;
  }

  /**
   * Get KYC information for a user
   */
  async getKycInfo(userId: string): Promise<KycInfo | null> {
    const client = this.supabase.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('kyc_id, kyc_attestation')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('User not found');
      }
      throw new NotFoundException('User not found');
    }

    if (!user.kyc_id || !user.kyc_attestation) {
      return null;
    }

    return {
      kycId: user.kyc_id,
      kycAttestation: user.kyc_attestation,
    };
  }

  /**
   * Check if user has completed KYC
   */
  async hasCompletedKyc(userId: string): Promise<boolean> {
    const client = this.supabase.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('kyc_id, kyc_attestation')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // User not found
      logError(this.logger, 'Failed to check KYC completion', error, {
        userId,
      });
      throw new InternalServerErrorException('Failed to verify KYC status');
    }

    if (!user) return false;

    return !!(user.kyc_id && user.kyc_attestation);
  }

  /**
   * Get user's KYC level
   */
  async getKycLevel(userId: string): Promise<number> {
    const client = this.supabase.getClient();
    const { data: user, error } = await client
      .from('users')
      .select('kyc_id')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return 0; // User not found
      logError(this.logger, 'Failed to get KYC level', error, { userId });
      throw new InternalServerErrorException('Failed to retrieve KYC level');
    }

    if (!user) return 0;

    return user.kyc_id || 0;
  }

  /**
   * Validate if user meets KYC requirements
   */
  async validateKycRequirement(
    userId: string,
    requiredLevel: number,
  ): Promise<boolean> {
    const kycLevel = await this.getKycLevel(userId);
    return kycLevel >= requiredLevel;
  }

  /**
   * Clear KYC information (for testing or admin purposes)
   */
  async clearKycInfo(userId: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .update({
        kyc_id: null,
        kyc_attestation: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.logger.error(`Failed to clear KYC info: ${error.message}`);
      return null;
    }

    return data;
  }

  /**
   * Get all users with a specific KYC level
   */
  async getUsersByKycLevel(kycLevel: number): Promise<UserRow[]> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('kyc_id', kycLevel);

    if (error) {
      this.logger.error(`Failed to get users by KYC level: ${error.message}`);
      return [];
    }

    return data ?? [];
  }

  /**
   * Get users with KYC pending (registered but no KYC)
   */
  async getUsersPendingKyc(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ users: UserRow[]; total: number }> {
    const client = this.supabase.getClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await client
      .from('users')
      .select('*', { count: 'exact' })
      .or(
        'kyc_id.is.null,kyc_id.eq.0,kyc_attestation.is.null,kyc_attestation.eq.',
      )
      .range(from, to);

    if (error) {
      this.logger.error(`Failed to get users pending KYC: ${error.message}`);
      return { users: [], total: 0 };
    }

    return { users: data ?? [], total: count ?? 0 };
  }

  /**
   * Get KYC statistics
   */
  async getKycStatistics(): Promise<{
    totalUsers: number;
    completedKyc: number;
    pendingKyc: number;
    kycLevelDistribution: Record<number, number>;
  }> {
    const client = this.supabase.getClient();

    // Get all users with their kyc_id to compute distribution
    const [totalResult, allUsersResult] = await Promise.all([
      client.from('users').select('*', { count: 'exact', head: true }),
      client.from('users').select('kyc_id'),
    ]);

    const totalUsers = totalResult.count ?? 0;
    const users = allUsersResult.data ?? [];

    // Build KYC level distribution from user data
    const kycLevelDistribution: Record<number, number> = {};
    for (const user of users) {
      const level = user.kyc_id ?? 0;
      kycLevelDistribution[level] = (kycLevelDistribution[level] ?? 0) + 1;
    }

    const completedKyc = Object.entries(kycLevelDistribution)
      .filter(([level]) => parseInt(level) > 0)
      .reduce((sum, [, count]) => sum + count, 0);

    const pendingKyc = kycLevelDistribution[0] ?? 0;

    return {
      totalUsers,
      completedKyc,
      pendingKyc,
      kycLevelDistribution,
    };
  }

  /**
   * Bulk update KYC information (for admin operations)
   */
  async bulkUpdateKyc(
    updates: Array<{
      userId: string;
      kycId: number;
      kycAttestation: string;
    }>,
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        const result = await this.updateKycInfo(
          update.userId,
          update.kycId,
          update.kycAttestation,
        );
        if (result) {
          updated++;
        } else {
          failed++;
        }
      } catch (error) {
        logError(
          this.logger,
          `Failed to update KYC for user ${update.userId}`,
          error,
        );
        failed++;
      }
    }

    return { updated, failed };
  }

  /**
   * Check if KYC attestation is valid
   */
  isKycAttestationValid(attestation: string): boolean {
    // This is a placeholder for actual attestation validation logic
    // In a real implementation, this would verify the attestation
    // against the blockchain or external KYC provider
    return !!(attestation && attestation.length > 0);
  }

  /**
   * Get users by KYC attestation
   */
  async getUserByKycAttestation(attestation: string): Promise<UserRow | null> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('kyc_attestation', attestation)
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to find user by KYC attestation: ${error.message}`,
      );
      return null;
    }

    return data;
  }
}
