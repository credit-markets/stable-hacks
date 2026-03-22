import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { HealthService } from './health.service';
import {
  HealthResponseDto,
  SimpleHealthResponseDto,
} from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Simple health check endpoint
   * Used for basic monitoring and uptime checks
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simple health check',
    description:
      'Returns a simple OK status if the API is responding. Used for basic monitoring.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    type: SimpleHealthResponseDto,
  })
  health(): SimpleHealthResponseDto {
    return this.healthService.checkSimpleHealth();
  }

  /**
   * Kubernetes liveness probe endpoint
   * Returns 200 if the application is alive
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Kubernetes liveness probe endpoint. Returns 200 if the application is alive and running.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      example: {
        status: 'alive',
        uptime: 3600,
      },
    },
  })
  liveness() {
    return this.healthService.checkLiveness();
  }

  /**
   * Kubernetes readiness probe endpoint
   * Returns 200 if the application is ready to serve traffic
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Kubernetes readiness probe endpoint. Returns 200 if the application is ready to serve traffic, 503 otherwise.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      example: {
        status: 'ready',
        ready: true,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
    schema: {
      example: {
        status: 'not_ready',
        ready: false,
      },
    },
  })
  async readiness() {
    const result = await this.healthService.checkReadiness();

    if (!result.ready) {
      // Return 503 Service Unavailable if not ready
      throw new ServiceUnavailableException('Service not ready');
    }

    return result;
  }

  /**
   * Comprehensive health check endpoint
   * Returns detailed information about system and service health
   */
  @Get('detailed')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detailed health check',
    description: `Returns comprehensive health information including:
    - Overall system status
    - Individual service health (Database, Redis, Storage, Blockchain)
    - System metrics (CPU, Memory)
    - Application uptime
    
    Status values:
    - UP: All services are healthy
    - DEGRADED: Some non-critical services are down
    - DOWN: Critical services are down`,
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async detailedHealth(): Promise<HealthResponseDto> {
    return this.healthService.checkHealth();
  }

  /**
   * Ping endpoint - simplest possible health check
   * Not documented in Swagger
   */
  @Get('ping')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  ping() {
    return 'pong';
  }
}
