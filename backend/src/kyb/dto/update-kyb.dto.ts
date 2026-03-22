import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsIn,
} from 'class-validator';

const ENTITY_TYPES = ['company', 'fund', 'trust', 'foundation'] as const;

export class UpdateKybDto {
  // Step 1
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(ENTITY_TYPES)
  entity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_regulated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regulator_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  license_number?: string;

  // Step 2A
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legal_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trading_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registration_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_of_incorporation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registered_address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  business_activity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  // Step 2B
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownership_structure_description?: string;

  // Step 2C
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source_of_funds?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source_of_wealth?: string;

  // Step 2D
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  has_pep?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pep_details?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  has_rca?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rca_details?: string;

  // Step 2E-2F
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sanctions_declaration?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  adverse_media_declaration?: boolean;

  // Funding route
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  funding_route_declaration?: string;

  // Step 4
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  authorized_signatory_declaration?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  accuracy_declaration?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ongoing_reporting_declaration?: boolean;

  // Step tracking
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  step_completed?: number;
}
