import {
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Solana base58 address validation
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class BuildInvestTxDto {
  @ApiProperty({ description: 'Investment amount in token units' })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class BuildRedeemTxDto {
  @ApiProperty({ description: 'Number of shares to redeem' })
  @IsNumber()
  @IsPositive()
  shares: number;
}

export class BuildDrawDownTxDto {
  @ApiProperty({ description: 'Draw down amount in token units' })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class BuildRepayTxDto {
  @ApiProperty({ description: 'Repayment amount in token units' })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class InvestorAddressDto {
  @ApiProperty({ description: 'Investor Solana wallet address' })
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, { message: 'Invalid Solana address' })
  investorAddress: string;
}

export class RejectInvestmentDto {
  @ApiProperty({ description: 'Investor Solana wallet address' })
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, { message: 'Invalid Solana address' })
  investorAddress: string;

  @ApiProperty({ description: 'Rejection reason code' })
  @IsInt()
  @Min(0)
  reasonCode: number;
}

export class UpdateAttesterDto {
  @ApiProperty({ description: 'New attester Solana address' })
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, { message: 'Invalid Solana address' })
  newAttester: string;

  @ApiProperty({ description: 'New attestation program Solana address' })
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, { message: 'Invalid Solana address' })
  newAttestationProgram: string;
}
