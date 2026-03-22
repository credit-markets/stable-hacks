import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterManagerDto {
  @ApiProperty({ description: 'Wallet address of the new manager' })
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Invalid Solana address',
  })
  wallet_address: string;
}
