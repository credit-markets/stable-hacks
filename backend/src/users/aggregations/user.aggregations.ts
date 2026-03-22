import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

/**
 * Result interface for grouping aggregations that count by a single field
 */
export interface GroupCountResult {
  group_key: string | number | null;
  count: number;
}

/**
 * Typed aggregation service for User data using Supabase.
 * Centralizes all aggregation logic and provides type safety
 * for aggregation results.
 */
@Injectable()
export class UserAggregations {
  private readonly logger = new Logger(UserAggregations.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Count users grouped by their KYC ID level.
   * Groups by kyc_id field where null/0 indicates no KYC completed.
   *
   * @returns Array of {group_key: number | null, count: number}
   */
  async countByKycLevel(): Promise<GroupCountResult[]> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('users')
        .select('kyc_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        const kycId = row.kyc_id;
        const key =
          kycId !== null && kycId !== undefined ? String(kycId) : 'null';
        counts[key] = (counts[key] || 0) + 1;
      }

      return Object.entries(counts).map(([key, count]) => ({
        group_key: key === 'null' ? null : Number(key),
        count,
      }));
    } catch (error) {
      this.logger.error('Failed to count users by KYC level', error);
      throw error;
    }
  }

  /**
   * Helper method to convert GroupCountResult array to Record<string, number>.
   * Safely handles null group_key values by converting to 'unknown' key.
   *
   * @param results Array of GroupCountResult from aggregation
   * @param defaultKey Key to use for null group_key values (default: 'unknown')
   * @returns Record mapping group_key to count
   */
  reduceToRecord(
    results: GroupCountResult[],
    defaultKey = 'unknown',
  ): Record<string, number> {
    return results.reduce(
      (acc, curr) => {
        const key =
          curr.group_key !== null ? String(curr.group_key) : defaultKey;
        acc[key] = curr.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Helper method to convert GroupCountResult array to Record<number, number>.
   * Used specifically for KYC level distribution where keys are numbers.
   *
   * @param results Array of GroupCountResult from aggregation
   * @returns Record mapping group_key (as number) to count
   */
  reduceToNumberRecord(results: GroupCountResult[]): Record<number, number> {
    return results.reduce(
      (acc, curr) => {
        const key = curr.group_key !== null ? Number(curr.group_key) : 0;
        acc[key] = curr.count;
        return acc;
      },
      {} as Record<number, number>,
    );
  }
}
