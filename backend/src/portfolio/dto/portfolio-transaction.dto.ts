import { ApiProperty } from '@nestjs/swagger';

export class PortfolioTransactionDto {
  @ApiProperty({ description: 'Event UUID' })
  id: string;

  @ApiProperty({
    description: 'Lifecycle event type',
    enum: [
      'investment.requested',
      'investment.settled',
      'investment.claimed',
      'investment.rejected',
      'investment.cancelled',
      'withdrawal.requested',
      'withdrawal.settled',
      'withdrawal.claimed',
      'withdrawal.cancelled',
    ],
  })
  eventType: string;

  @ApiProperty({ description: 'Pool UUID' })
  poolId: string;

  @ApiProperty({ description: 'Pool display title' })
  poolTitle: string;

  @ApiProperty({ description: 'Token symbol (e.g. USDC)' })
  tokenSymbol: string;

  @ApiProperty({
    description: 'Investment amount (human-readable, decimal-divided)',
    nullable: true,
  })
  amount: number | null;

  @ApiProperty({ description: 'Share count (human-readable)', nullable: true })
  shares: number | null;

  @ApiProperty({ description: 'Solana transaction ID', nullable: true })
  chainTxId: string | null;

  @ApiProperty({ description: 'Event timestamp' })
  createdAt: string;
}
