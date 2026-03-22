import { logger } from "@/lib/logger";
import type { Pool } from "@/services/api";
import { getPool } from "@/services/poolService";
import axios from "axios";
import { cache } from "react";

/**
 * Cached pool fetcher for server components.
 * Deduplicates identical requests within the same render cycle.
 * Used by both generateMetadata and page components to avoid data waterfalls.
 *
 * @param poolIdOrAddress - Pool ID or blockchain address (0x...)
 * @returns Pool data
 * @throws Error if pool not found or request fails
 *
 * @example
 * ```typescript
 * // In generateMetadata
 * const pool = await getCachedPool(address);
 *
 * // In page component - returns cached result from metadata call
 * const pool = await getCachedPool(address);
 * ```
 */
export const getCachedPool = cache(
  async (poolIdOrAddress: string): Promise<Pool> => {
    try {
      return await getPool(poolIdOrAddress);
    } catch (error) {
      logger.error("Failed to fetch pool", error, {
        poolIdOrAddress,
        isBlockchainAddress: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(
          poolIdOrAddress,
        ),
      });

      // Create user-friendly errors for error boundary
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 404) {
          const notFoundError = new Error(`Pool not found: ${poolIdOrAddress}`);
          notFoundError.name = "PoolNotFoundError";
          throw notFoundError;
        }
        if (status && status >= 500) {
          const serverError = new Error("Server error while loading pool");
          serverError.name = "PoolServerError";
          throw serverError;
        }
      }

      // Re-throw with additional context
      if (error instanceof Error) {
        error.message = `Failed to load pool ${poolIdOrAddress}: ${error.message}`;
      }
      throw error;
    }
  },
);
