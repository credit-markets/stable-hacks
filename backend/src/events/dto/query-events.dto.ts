import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEventsDto {
  @ApiProperty({ required: false, description: 'Filter by event type' })
  @IsOptional()
  @IsString()
  event_type?: string;

  @ApiProperty({
    required: false,
    enum: ['investor', 'manager', 'admin', 'system', 'partner'],
  })
  @IsOptional()
  @IsString()
  actor_type?: string;

  @ApiProperty({
    required: false,
    description: 'Events after this date (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601()
  date_from?: string;

  @ApiProperty({
    required: false,
    description: 'Events before this date (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601()
  date_to?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
