import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManagerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  company_name: string;

  @ApiPropertyOptional()
  overview?: string;

  @ApiPropertyOptional()
  logo_path?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiProperty()
  owner_address: string;

  @ApiProperty({ description: 'ISO timestamp' })
  created_at: string;

  @ApiProperty({ description: 'ISO timestamp' })
  updated_at: string;
}
