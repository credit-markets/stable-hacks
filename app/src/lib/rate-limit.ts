import { LRUCache } from "lru-cache";

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache<string, RateLimitEntry>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (
      limit: number,
      token: string,
    ): { success: boolean; remaining: number; reset: number } => {
      const now = Date.now();
      const entry = tokenCache.get(token);

      if (!entry) {
        const resetTime = now + options.interval;
        tokenCache.set(token, { count: 1, resetTime });
        return {
          success: true,
          remaining: limit - 1,
          reset: resetTime,
        };
      }

      if (now > entry.resetTime) {
        const resetTime = now + options.interval;
        tokenCache.set(token, { count: 1, resetTime });
        return {
          success: true,
          remaining: limit - 1,
          reset: resetTime,
        };
      }

      if (entry.count >= limit) {
        return { success: false, remaining: 0, reset: entry.resetTime };
      }

      entry.count += 1;
      tokenCache.set(token, entry);
      return {
        success: true,
        remaining: limit - entry.count,
        reset: entry.resetTime,
      };
    },
  };
}

export const authLimiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});
