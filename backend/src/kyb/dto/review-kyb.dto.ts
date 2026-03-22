import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class ReviewKybDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(16)
  risk_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  risk_band?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewer_notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  edd_required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  edd_notes?: string;
}
