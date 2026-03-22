import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      // Default rate limit
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    },
  ],
};

// Specific rate limits for different endpoints
export const RATE_LIMITS = {
  // File upload endpoints - more restrictive
  FILE_UPLOAD: {
    ttl: 300000, // 5 minutes
    limit: 10, // 10 uploads per 5 minutes
  },

  // Portfolio refresh - prevent abuse
  PORTFOLIO_REFRESH: {
    ttl: 60000, // 1 minute
    limit: 5, // 5 refreshes per minute
  },

  // General API endpoints
  DEFAULT: {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },
} as const;
