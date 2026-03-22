import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as os from 'os';
import {
  HealthStatus,
  HealthResponseDto,
  ServiceHealthDto,
  SimpleHealthResponseDto,
} from './dto/health-response.dto';
import { SupabaseStorageService } from '../common/services/supabase-storage.service';
import { SolanaService } from '../blockchain/solana.service';
import { SupabaseService } from '../database/supabase.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private cpuUsageCache: {
    value: { cores: number; usage: number };
    timestamp: number;
  } | null = null;
  private readonly CPU_CACHE_TTL = 5000; // Cache CPU usage for 5 seconds

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    @Optional() @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Optional() private readonly supabaseStorageService: SupabaseStorageService,
    @Optional() private readonly solanaService: SolanaService,
  ) {}

  /**
   * Simple health check - returns minimal status
   */
  checkSimpleHealth(): SimpleHealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Liveness probe - checks if the application is alive
   */
  checkLiveness(): { status: string; uptime: number } {
    return {
      status: 'alive',
      uptime: this.getUptime(),
    };
  }

  /**
   * Readiness probe - checks if the application is ready to serve requests
   */
  async checkReadiness(): Promise<{ status: string; ready: boolean }> {
    const isDatabaseReady = await this.checkDatabase();
    const ready = isDatabaseReady.status === HealthStatus.UP;

    return {
      status: ready ? 'ready' : 'not_ready',
      ready,
    };
  }

  /**
   * Comprehensive health check - returns detailed system status
   */
  async checkHealth(): Promise<HealthResponseDto> {
    const services: ServiceHealthDto[] = [];

    // Check database
    const dbHealth = await this.checkDatabase();
    services.push(dbHealth);

    // Check Redis (if configured)
    const redisHealth = await this.checkRedis();
    if (redisHealth) {
      services.push(redisHealth);
    }

    // Check Supabase Storage (if configured)
    const storageHealth = await this.checkSupabaseStorage();
    if (storageHealth) {
      services.push(storageHealth);
    }

    // Check external APIs
    const blockchainHealth = await this.checkBlockchainConnection();
    services.push(blockchainHealth);

    // Determine overall status
    const overallStatus = this.determineOverallStatus(services);

    return {
      status: overallStatus,
      version: this.configService.get<string>('npm_package_version', '1.0.0'),
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      services,
      memory: this.getMemoryUsage(),
      cpu: this.getCpuUsage(),
    };
  }

  /**
   * Check Supabase (PostgreSQL) connection health
   */
  private async checkDatabase(): Promise<ServiceHealthDto> {
    const startTime = Date.now();

    try {
      const { error } = await this.supabaseService
        .getClient()
        .from('users')
        .select('id', { count: 'exact', head: true });

      if (error) {
        this.logger.error('Database health check failed', error);
        return {
          name: 'supabase',
          status: HealthStatus.DOWN,
          responseTime: Date.now() - startTime,
          error: 'Database query failed',
        };
      }

      const responseTime = Date.now() - startTime;

      return {
        name: 'supabase',
        status: HealthStatus.UP,
        responseTime,
        details: { connected: true },
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        name: 'supabase',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        error: 'Database connection failed',
      };
    }
  }

  /**
   * Check Redis connection health
   */
  private async checkRedis(): Promise<ServiceHealthDto | null> {
    // Check if cache manager is available (uses in-memory cache)
    if (!this.cacheManager) {
      return null;
    }

    const startTime = Date.now();
    const timeout = 3000; // 3 second timeout

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Redis health check timeout')),
          timeout,
        );
      });

      // Test cache operations
      const testKey = 'health:check';
      const testValue = { timestamp: Date.now() };

      const healthCheckPromise = (async () => {
        await this.cacheManager.set(testKey, testValue, 1000);
        const retrieved = await this.cacheManager.get(testKey);
        await this.cacheManager.del(testKey);
        return retrieved;
      })();

      await Promise.race([healthCheckPromise, timeoutPromise]);

      return {
        name: 'cache',
        status: HealthStatus.UP,
        responseTime: Date.now() - startTime,
        details: { configured: true },
      };
    } catch (error) {
      return {
        name: 'cache',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : 'Cache connection failed',
      };
    }
  }

  /**
   * Check Supabase Storage health
   */
  private async checkSupabaseStorage(): Promise<ServiceHealthDto | null> {
    if (!this.supabaseStorageService) {
      return null;
    }

    const startTime = Date.now();
    const timeout = 5000; // 5 second timeout

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Supabase Storage health check timeout')),
          timeout,
        );
      });

      // Try to list files in the root to verify access
      const healthCheckPromise = (async () => {
        await this.supabaseStorageService.fileExists('health-check-probe');
        return true;
      })();

      await Promise.race([healthCheckPromise, timeoutPromise]);

      return {
        name: 'supabase-storage',
        status: HealthStatus.UP,
        responseTime: Date.now() - startTime,
        details: { configured: true },
      };
    } catch (error) {
      return {
        name: 'supabase-storage',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error
            ? error.message
            : 'Supabase Storage connection failed',
      };
    }
  }

  /**
   * Check Solana RPC connection
   */
  private async checkBlockchainConnection(): Promise<ServiceHealthDto> {
    const startTime = Date.now();
    const timeout = 5000; // 5 second timeout

    try {
      if (!this.solanaService) {
        return {
          name: 'solana-rpc',
          status: HealthStatus.DEGRADED,
          error: 'Solana service not initialized',
        };
      }

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Solana health check timeout')),
          timeout,
        );
      });

      // Make an actual RPC call to check connectivity
      const healthCheckPromise = (async () => {
        const connection = this.solanaService.getConnection();
        const slot = await connection.getSlot();
        return slot;
      })();

      const slot = await Promise.race([healthCheckPromise, timeoutPromise]);

      return {
        name: 'solana-rpc',
        status: HealthStatus.UP,
        responseTime: Date.now() - startTime,
        details: {
          configured: true,
          latestSlot: slot?.toString(),
        },
      };
    } catch (error) {
      return {
        name: 'solana-rpc',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'RPC connection failed',
      };
    }
  }

  /**
   * Determine overall system status based on service health
   */
  private determineOverallStatus(services: ServiceHealthDto[]): HealthStatus {
    const criticalServices = ['supabase']; // Services that must be UP
    const importantServices = ['solana-rpc']; // Services that should be UP

    // Check critical services
    for (const service of services) {
      if (
        criticalServices.includes(service.name) &&
        service.status === HealthStatus.DOWN
      ) {
        return HealthStatus.DOWN;
      }
    }

    // Check important services
    for (const service of services) {
      if (
        importantServices.includes(service.name) &&
        service.status === HealthStatus.DOWN
      ) {
        return HealthStatus.DEGRADED;
      }
    }

    // Check if any service is degraded
    if (services.some((s) => s.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.UP;
  }

  /**
   * Get system memory usage
   */
  private getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percentage = (used / total) * 100;

    return {
      total,
      free,
      used,
      percentage: Math.round(percentage * 10) / 10,
    };
  }

  /**
   * Get system CPU usage with caching
   */
  private getCpuUsage() {
    const now = Date.now();

    // Return cached value if still valid
    if (
      this.cpuUsageCache &&
      now - this.cpuUsageCache.timestamp < this.CPU_CACHE_TTL
    ) {
      return this.cpuUsageCache.value;
    }

    // Use process.cpuUsage() for more accurate Node.js process metrics
    const cpus = os.cpus();
    const usage = process.cpuUsage();

    // Calculate percentage based on elapsed time and CPU time
    const totalCPUTime = (usage.user + usage.system) / 1000; // Convert to ms
    const elapsedTime = process.uptime() * 1000; // Convert to ms
    const cpuPercent = (totalCPUTime / elapsedTime / cpus.length) * 100;

    const result = {
      cores: cpus.length,
      usage: Math.round(cpuPercent * 10) / 10,
    };

    // Cache the result
    this.cpuUsageCache = {
      value: result,
      timestamp: now,
    };

    return result;
  }

  /**
   * Get application uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}
