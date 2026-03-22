import { ApiProperty } from '@nestjs/swagger';

export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
}

export class ServiceHealthDto {
  @ApiProperty({
    description: 'Service name',
    example: 'database',
  })
  name: string;

  @ApiProperty({
    description: 'Service health status',
    enum: HealthStatus,
    example: HealthStatus.UP,
  })
  status: HealthStatus;

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 5,
    required: false,
  })
  responseTime?: number;

  @ApiProperty({
    description: 'Additional service details',
    required: false,
    example: { connected: true, version: '8.0.28' },
  })
  details?: Record<string, any>;

  @ApiProperty({
    description: 'Error message if service is down',
    required: false,
    example: 'Connection timeout',
  })
  error?: string;
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Overall system health status',
    enum: HealthStatus,
    example: HealthStatus.UP,
  })
  status: HealthStatus;

  @ApiProperty({
    description: 'API version',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({
    description: 'Server timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'System uptime in seconds',
    example: 3600,
  })
  uptime: number;

  @ApiProperty({
    description: 'Environment',
    example: 'production',
  })
  environment: string;

  @ApiProperty({
    description: 'Individual service health checks',
    type: [ServiceHealthDto],
  })
  services: ServiceHealthDto[];

  @ApiProperty({
    description: 'System memory usage',
    required: false,
    example: {
      total: 17179869184,
      free: 2147483648,
      used: 15032385536,
      percentage: 87.5,
    },
  })
  memory?: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };

  @ApiProperty({
    description: 'System CPU usage',
    required: false,
    example: {
      cores: 8,
      usage: 45.2,
    },
  })
  cpu?: {
    cores: number;
    usage: number;
  };
}

export class SimpleHealthResponseDto {
  @ApiProperty({
    description: 'Health status',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Server timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}
