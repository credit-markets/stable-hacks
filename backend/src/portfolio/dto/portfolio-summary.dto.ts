import { ApiProperty } from '@nestjs/swagger';

export class PortfolioPositionDto {
  @ApiProperty({
    description: 'Pool UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  poolId: string;

  @ApiProperty({
    description: 'Pool display title',
    example: 'FIDC Agro Senior',
  })
  poolTitle: string;

  @ApiProperty({
    description: 'Pool logo path',
    example: '/logos/fidc-agro.png',
    nullable: true,
  })
  logoPath: string | null;

  @ApiProperty({ description: 'Risk pipeline key', example: 'fidc-agro-001' })
  pipelineKey: string;

  @ApiProperty({ description: 'Asset class', example: 'credit_receivables' })
  assetClass: string;

  @ApiProperty({ description: 'Pool type: fidc or tidc', example: 'fidc' })
  poolType: string;

  @ApiProperty({ description: 'Total amount invested (USD)', example: 50000 })
  invested: number;

  @ApiProperty({
    description: 'Price per share from oracle',
    example: 1.0234,
    nullable: true,
  })
  pricePerShare: number | null;

  @ApiProperty({
    description: 'Current value = shares * NAV (USD)',
    example: 51170,
  })
  currentValue: number;

  @ApiProperty({ description: 'Percentage of total portfolio', example: 45.2 })
  share: number;

  @ApiProperty({
    description: 'Last twelve months return (%)',
    example: 12.5,
    nullable: true,
  })
  ltmReturn: number | null;

  @ApiProperty({
    description: 'Credit score 0-100',
    example: 78,
    nullable: true,
  })
  creditScore: number | null;

  @ApiProperty({
    description: 'Confidence rating tier 1-4',
    example: 2,
    nullable: true,
  })
  ratingTier: number | null;

  @ApiProperty({ description: 'Deposit currency', example: 'usdc' })
  depositCurrency: string;
}

export class PortfolioAllocationDto {
  @ApiProperty({
    description: 'Asset class name',
    example: 'credit_receivables',
  })
  assetClass: string;

  @ApiProperty({ description: 'Percentage of total portfolio', example: 65.3 })
  percentage: number;

  @ApiProperty({ description: 'Dollar amount (USD)', example: 65000 })
  amount: number;
}

export class PortfolioSummaryDto {
  @ApiProperty({
    description: 'Total amount invested across all positions (USD)',
    example: 100000,
  })
  totalInvested: number;

  @ApiProperty({
    description: 'Current portfolio value (USD)',
    example: 103500,
  })
  currentValue: number;

  @ApiProperty({ description: 'Unrealized profit/loss (USD)', example: 3500 })
  unrealizedPnl: number;

  @ApiProperty({
    description: 'Investment-weighted average LTM return (%)',
    example: 11.2,
  })
  weightedAvgReturn: number;

  @ApiProperty({
    description: 'Investment-weighted credit score 0-100',
    example: 72,
    nullable: true,
  })
  weightedCreditScore: number | null;

  @ApiProperty({
    description: 'Individual position details',
    type: [PortfolioPositionDto],
  })
  positions: PortfolioPositionDto[];

  @ApiProperty({
    description: 'Allocation breakdown by asset class',
    type: [PortfolioAllocationDto],
  })
  allocation: PortfolioAllocationDto[];
}
