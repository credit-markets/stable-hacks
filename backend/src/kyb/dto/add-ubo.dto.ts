import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsIn,
} from 'class-validator';

const UBO_ROLES = [
  'ubo',
  'director',
  'signatory',
  'trustee',
  'gp',
  'protector',
] as const;

/**
 * DTO for creating a new UBO record.
 * Fields are optional because users create blank records and fill them
 * inline with auto-save. Completeness is validated on submission via
 * KybWorkflowService.validateCompleteness().
 */
export class AddUboDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country_of_residence?: string;

  @ApiProperty({ enum: UBO_ROLES })
  @IsIn(UBO_ROLES)
  role: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ownership_percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source_of_wealth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_pep?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pep_details?: string;
}
