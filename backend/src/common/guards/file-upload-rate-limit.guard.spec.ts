import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FileUploadRateLimitGuard } from './file-upload-rate-limit.guard';

describe('FileUploadRateLimitGuard', () => {
  let guard: FileUploadRateLimitGuard;
  let module: TestingModule;

  const mockRequest = {
    userCredentials: undefined as unknown,
  };

  const createMockExecutionContext = (
    request = mockRequest,
  ): ExecutionContext =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    }) as unknown as ExecutionContext;

  const createGuard = async (): Promise<FileUploadRateLimitGuard> => {
    module = await Test.createTestingModule({
      providers: [
        FileUploadRateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    return module.get<FileUploadRateLimitGuard>(FileUploadRateLimitGuard);
  };

  beforeEach(async () => {
    // Reset mock request
    mockRequest.userCredentials = undefined;
    guard = await createGuard();
  });

  afterEach(() => {
    // Clean up the guard to stop the interval
    if (guard) {
      guard.onModuleDestroy();
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('rate limiting enforcement', () => {
    it('should allow first request for a user', () => {
      const request = {
        userCredentials: {
          address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
          verified_credentials: [
            { address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests up to the limit (10 per minute)', () => {
      const request = {
        userCredentials: {
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          verified_credentials: [
            { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should throw 429 Too Many Requests when limit is exceeded', () => {
      const request = {
        userCredentials: {
          address: 'BPFLoaderUpgradeab1e11111111111111111111111',
          verified_credentials: [
            { address: 'BPFLoaderUpgradeab1e11111111111111111111111' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        guard.canActivate(context);
      }

      // 11th request should fail
      expect(() => guard.canActivate(context)).toThrow(HttpException);
      expect(() => guard.canActivate(context)).toThrow(
        'Too many upload requests. Maximum 10 uploads per minute allowed.',
      );
    });

    it('should pass exactly 10 requests (boundary test)', () => {
      const request = {
        userCredentials: {
          address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
          verified_credentials: [
            { address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make exactly 10 requests - all should pass
      const results: boolean[] = [];
      for (let i = 0; i < 10; i++) {
        const result = guard.canActivate(context);
        results.push(result);
      }

      // All 10 requests should have passed
      expect(results.length).toBe(10);
      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should fail on exactly the 11th request (boundary test)', () => {
      const request = {
        userCredentials: {
          address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          verified_credentials: [
            { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make exactly 10 requests - all should pass
      for (let i = 0; i < 10; i++) {
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      }

      // The 11th request should fail with 429
      try {
        guard.canActivate(context);
        fail('Expected HttpException to be thrown on 11th request');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.TOO_MANY_REQUESTS,
        );
        expect((error as HttpException).message).toBe(
          'Too many upload requests. Maximum 10 uploads per minute allowed.',
        );
      }
    });

    it('should throw with correct HTTP status code (429)', () => {
      const request = {
        userCredentials: {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          verified_credentials: [
            { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        guard.canActivate(context);
      }

      try {
        guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    });

    it('should track rate limits per user independently', () => {
      const request1 = {
        userCredentials: {
          address: 'So11111111111111111111111111111111111111112',
          verified_credentials: [
            { address: 'So11111111111111111111111111111111111111112' },
          ],
        },
      };
      const request2 = {
        userCredentials: {
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          verified_credentials: [
            { address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          ],
        },
      };
      const context1 = createMockExecutionContext(request1);
      const context2 = createMockExecutionContext(request2);

      // User 1 makes 10 requests
      for (let i = 0; i < 10; i++) {
        guard.canActivate(context1);
      }

      // User 2 should still be able to make requests
      const result = guard.canActivate(context2);
      expect(result).toBe(true);

      // User 1 should be rate limited
      expect(() => guard.canActivate(context1)).toThrow(HttpException);
    });

    it('should throw UnauthorizedException when no userCredentials present', () => {
      const request = {
        userCredentials: undefined,
      };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Authentication required for file uploads',
      );
    });

    it('should throw ForbiddenException when no address available', () => {
      const request = {
        userCredentials: {
          // No address or verified_credentials
          sub: 'user-123',
        },
      };
      const context = createMockExecutionContext(request);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should use address from userCredentials.address as fallback', () => {
      const address = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
      const request = {
        userCredentials: {
          address: address,
          // No verified_credentials
        },
      };
      const context = createMockExecutionContext(request);

      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        guard.canActivate(context);
      }

      // Should be rate limited
      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });
  });

  describe('cleanup interval', () => {
    it('should clean up expired entries after window expires', () => {
      // Use real timers for guard creation, then switch to fake timers
      guard.onModuleDestroy(); // Clean up previous guard
      jest.useFakeTimers();
      guard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      const request = {
        userCredentials: {
          address: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
          verified_credentials: [
            { address: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make some requests
      for (let i = 0; i < 5; i++) {
        guard.canActivate(context);
      }

      // Advance time past the window (1 minute) and cleanup interval (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);

      // Trigger cleanup
      guard.cleanup();

      // User should be able to make requests again (store entry was cleaned up)
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should only clean up expired entries', () => {
      guard.onModuleDestroy();
      jest.useFakeTimers();
      guard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      const request1 = {
        userCredentials: {
          address: 'SysvarC1ock11111111111111111111111111111111',
          verified_credentials: [
            { address: 'SysvarC1ock11111111111111111111111111111111' },
          ],
        },
      };
      const request2 = {
        userCredentials: {
          address: 'SysvarRent111111111111111111111111111111111',
          verified_credentials: [
            { address: 'SysvarRent111111111111111111111111111111111' },
          ],
        },
      };
      const context1 = createMockExecutionContext(request1);
      const context2 = createMockExecutionContext(request2);

      // First user makes requests
      for (let i = 0; i < 8; i++) {
        guard.canActivate(context1);
      }

      // Advance time past the window
      jest.advanceTimersByTime(61 * 1000);

      // Second user makes requests (will have fresh window)
      for (let i = 0; i < 8; i++) {
        guard.canActivate(context2);
      }

      // Cleanup (should only remove first user's expired entry)
      guard.cleanup();

      // First user should have a fresh window
      const result1 = guard.canActivate(context1);
      expect(result1).toBe(true);

      // Second user should still be tracked (still has 2 requests left)
      const result2 = guard.canActivate(context2);
      expect(result2).toBe(true);
    });

    it('should start automatic cleanup interval on construction', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const existingCallCount = setIntervalSpy.mock.calls.length;

      // Create a new guard instance to check interval creation
      const newGuard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      // setInterval should have been called for cleanup
      expect(setIntervalSpy.mock.calls.length).toBeGreaterThan(
        existingCallCount,
      );

      // Clean up
      newGuard.onModuleDestroy();
    });
  });

  describe('concurrent request handling', () => {
    it('should handle concurrent requests from same user correctly', () => {
      const request = {
        userCredentials: {
          address: 'Vote111111111111111111111111111111111111111',
          verified_credentials: [
            { address: 'Vote111111111111111111111111111111111111111' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Simulate sequential requests (canActivate is synchronous)
      const results: boolean[] = [];
      const errors: Error[] = [];

      // Make 15 requests (5 should fail)
      for (let i = 0; i < 15; i++) {
        try {
          const result = guard.canActivate(context);
          results.push(result);
        } catch (error) {
          errors.push(error as Error);
        }
      }

      // 10 should succeed, 5 should fail
      expect(results.length).toBe(10);
      expect(results.every((r) => r === true)).toBe(true);
      expect(errors.length).toBe(5);
      errors.forEach((error) => {
        expect(error).toBeInstanceOf(HttpException);
      });
    });

    it('should increment request count atomically', () => {
      const request = {
        userCredentials: {
          address: 'Stake11111111111111111111111111111111111111',
          verified_credentials: [
            { address: 'Stake11111111111111111111111111111111111111' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make exactly the limit number of requests
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 12; i++) {
        try {
          if (guard.canActivate(context)) {
            successCount++;
          }
        } catch {
          errorCount++;
        }
      }

      // Should have exactly 10 successes and 2 failures
      expect(successCount).toBe(10);
      expect(errorCount).toBe(2);
    });
  });

  describe('limit reset after window', () => {
    it('should reset limit after window expires', () => {
      guard.onModuleDestroy();
      jest.useFakeTimers();
      guard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      const request = {
        userCredentials: {
          address: 'Config1111111111111111111111111111111111111',
          verified_credentials: [
            { address: 'Config1111111111111111111111111111111111111' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Use up all requests
      for (let i = 0; i < 10; i++) {
        guard.canActivate(context);
      }

      // Should be rate limited
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      // Advance time past the 1-minute window
      jest.advanceTimersByTime(60 * 1000 + 1);

      // Should be able to make requests again
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should reset counter to 1 when window expires', () => {
      guard.onModuleDestroy();
      jest.useFakeTimers();
      guard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      const request = {
        userCredentials: {
          address: 'Feature111111111111111111111111111111111111',
          verified_credentials: [
            { address: 'Feature111111111111111111111111111111111111' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        guard.canActivate(context);
      }

      // Advance time past the window
      jest.advanceTimersByTime(60 * 1000 + 1);

      // Make new request (should reset counter to 1)
      guard.canActivate(context);

      // Should be able to make 9 more requests (10 - 1)
      for (let i = 0; i < 9; i++) {
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      }

      // 11th request should fail
      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should create new window with correct reset time', () => {
      guard.onModuleDestroy();
      jest.useFakeTimers();
      guard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      const request = {
        userCredentials: {
          address: 'NativeLoader1111111111111111111111111111111',
          verified_credentials: [
            { address: 'NativeLoader1111111111111111111111111111111' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // First request creates new window
      guard.canActivate(context);

      // Check that window will expire in about 1 minute
      jest.advanceTimersByTime(59 * 1000);

      // Should still be tracking (window not expired)
      for (let i = 0; i < 9; i++) {
        guard.canActivate(context);
      }

      // Should be rate limited before window expires
      expect(() => guard.canActivate(context)).toThrow(HttpException);

      // Advance past window
      jest.advanceTimersByTime(2000);

      // Should work again
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('module lifecycle', () => {
    it('should clear interval on module destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      guard.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle onModuleDestroy when interval is not set', () => {
      // Create a guard and manually clear the interval
      const newGuard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      // Clear the interval first
      newGuard.onModuleDestroy();

      // Calling again should not throw
      expect(() => newGuard.onModuleDestroy()).not.toThrow();
    });
  });

  describe('cleanup method', () => {
    it('should not log when no entries are cleaned', () => {
      guard.onModuleDestroy();
      jest.useFakeTimers();
      guard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      // Make a request with fresh timestamp
      const request = {
        userCredentials: {
          address: 'ComputeBudget111111111111111111111111111111',
          verified_credentials: [
            { address: 'ComputeBudget111111111111111111111111111111' },
          ],
        },
      };
      const context = createMockExecutionContext(request);

      // Make 2 requests
      guard.canActivate(context); // Request 1
      guard.canActivate(context); // Request 2

      // Call cleanup immediately (entry should not be expired)
      guard.cleanup();

      // After cleanup (no entries removed), continue making requests
      // We've made 2 requests, can make 8 more (total 10)
      for (let i = 0; i < 8; i++) {
        guard.canActivate(context);
      }

      // 11th request should fail
      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should remove all expired entries', () => {
      guard.onModuleDestroy();
      jest.useFakeTimers();
      guard = new FileUploadRateLimitGuard({
        getAllAndOverride: jest.fn(),
      } as unknown as Reflector);

      const addresses = [
        'Ed25519SigVerify111111111111111111111111111',
        'KeccakSecp256k11111111111111111111111111111',
        'SysvarEpochSchedu1e111111111111111111111111',
      ];

      // Make requests for multiple users
      addresses.forEach((address) => {
        const request = {
          userCredentials: {
            address,
            verified_credentials: [{ address }],
          },
        };
        const context = createMockExecutionContext(request);
        guard.canActivate(context);
      });

      // Advance time past window
      jest.advanceTimersByTime(61 * 1000);

      // Cleanup should remove all expired entries
      guard.cleanup();

      // All users should be able to make requests again (fresh window)
      addresses.forEach((address) => {
        const request = {
          userCredentials: {
            address,
            verified_credentials: [{ address }],
          },
        };
        const context = createMockExecutionContext(request);
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });
});
