import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  ForbiddenException,
  UnauthorizedException,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitStore {
  [userKey: string]: {
    requests: number;
    resetTime: number;
  };
}

/**
 * Rate limiting guard specifically for file uploads
 * Prevents abuse by limiting upload frequency per user
 * Automatically cleans up expired entries to prevent memory leaks
 */
@Injectable()
export class FileUploadRateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(FileUploadRateLimitGuard.name);
  private readonly store: RateLimitStore = {};
  private readonly windowMs = 60 * 1000; // 1 minute window
  private readonly maxRequests = 10; // Max 10 uploads per minute per user
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // Cleanup every 5 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor(private reflector: Reflector) {
    // Start automatic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);
  }

  canActivate(context: ExecutionContext): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userCredentials = request.userCredentials;

    if (!userCredentials) {
      this.logger.error(
        'FileUploadRateLimitGuard: JwtAuthGuard must run before this guard',
      );
      throw new UnauthorizedException(
        'Authentication required for file uploads',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userKey =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      userCredentials.verified_credentials?.[0]?.address ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      userCredentials.address;
    if (!userKey) {
      this.logger.warn(
        'Rate limit guard: unable to resolve user address for rate limiting',
      );
      throw new ForbiddenException('Unable to verify rate limit identity');
    }

    const now = Date.now();

    const userLimit = this.store[userKey as string];

    // Initialize or reset if window expired
    if (!userLimit || now > userLimit.resetTime) {
      this.store[userKey as string] = {
        requests: 1,
        resetTime: now + this.windowMs,
      };
      return true;
    }

    // Atomic increment BEFORE check to prevent race conditions
    const newCount = ++userLimit.requests;

    // Check if limit exceeded (after increment for atomicity)
    if (newCount > this.maxRequests) {
      throw new HttpException(
        `Too many upload requests. Maximum ${this.maxRequests} uploads per minute allowed.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Lifecycle hook to clean up interval on module destruction
   * Prevents resource leaks when the application shuts down
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Cleanup expired entries from the rate limit store
   * Automatically called every 5 minutes to prevent memory leaks
   * Can also be called manually if needed
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    Object.keys(this.store).forEach((key) => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
        cleanedCount++;
      }
    });

    // Log cleanup stats for monitoring (only if entries were cleaned)
    if (cleanedCount > 0) {
      this.logger.debug('Cleaned up expired rate limit entries', {
        cleanedCount,
        activeEntries: Object.keys(this.store).length,
      });
    }
  }
}
