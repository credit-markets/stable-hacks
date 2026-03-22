import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';

export class ActivatePoolDto {
  @ApiProperty({ description: 'Pipeline key identifier' })
  @IsNotEmpty()
  @IsString()
  pipeline_key: string;

  @ApiProperty({
    description: 'Pool title (overrides pipeline default if set)',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Minimum investment amount for this listing',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_investment?: number;

  @ApiProperty({
    description: 'Fund size (CM allocation from this FIDC)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fund_size?: number;

  @ApiProperty({ description: 'Manager wallet address' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Invalid Solana address',
  })
  manager_address: string;

  @ApiProperty({ description: 'Asset mint address (e.g., USDC mint)' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Invalid Solana address',
  })
  asset_mint: string;
}
