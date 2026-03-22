import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateManagerDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  company_name: string;

  @ApiPropertyOptional({ description: 'Company overview (markdown)' })
  @IsString()
  @IsOptional()
  overview?: string;

  @ApiPropertyOptional({ description: 'Company logo path' })
  @IsString()
  @IsOptional()
  logo_path?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsUrl()
  @IsOptional()
  website?: string;
}
