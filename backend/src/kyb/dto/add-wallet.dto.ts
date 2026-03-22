import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class AddWalletDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Invalid Solana address',
  })
  wallet_address: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  wallet_label: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  source_description: string;
}
