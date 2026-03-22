/**
 * Centralized React Query Configuration
 *
 * This file defines standard query settings to ensure consistency across the application.
 * Use these configs as the default settings for your useQuery hooks.
 *
 * USAGE GUIDE:
 * - "realtime": For data that changes frequently (e.g., portfolio values, market prices)
 *   Use when users expect near real-time updates and frequent refetches are acceptable
 *
 * - "standard": For most queries (e.g., pool listings, user data, general information)
 *   Use as the default for most API calls unless you have a specific reason otherwise
 *
 * - "static": For data that rarely changes (e.g., contract ABIs, static configurations)
 *   Use for lookup tables, reference data, or other infrequently-updated information
 *
 * EXAMPLE USAGE:
 * ```typescript
 * import { QUERY_CONFIGS } from "@/config/queryDefaults";
 *
 * export function useMyData() {
 *   return useQuery({
 *     queryKey: ["my-data"],
 *     queryFn: fetchMyData,
 *     ...QUERY_CONFIGS.standard, // Spread the config
 *   });
 * }
 * ```
 */

export const QUERY_CONFIGS = {
  realtime: {
    staleTime: 30_000, // 30 seconds - for frequently changing data like portfolio
    gcTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
  },
  standard: {
    staleTime: 60_000, // 1 minute - for most queries
    gcTime: 300_000, // 5 minutes
    refetchOnWindowFocus: false,
  },
  static: {
    staleTime: 300_000, // 5 minutes - for rarely changing data
    gcTime: 600_000, // 10 minutes
    refetchOnWindowFocus: false,
  },
} as const;

export type QueryConfigType = keyof typeof QUERY_CONFIGS;
