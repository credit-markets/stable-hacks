import { ApiProperty } from '@nestjs/swagger';

export class PortfolioRiskSummaryDto {
  @ApiProperty() investor_address: string;
  @ApiProperty() position_count: number;
  @ApiProperty() total_invested: number;
  @ApiProperty() weighted_default_rate: number | null;
  @ApiProperty() weighted_expected_loss: number | null;
  @ApiProperty() weighted_wal_years: number | null;
  @ApiProperty() min_distance_to_impairment: number | null;
  @ApiProperty() weighted_subordination: number | null;
  @ApiProperty() concentration_hhi: number;
  @ApiProperty()
  positions: Array<{
    pool_id: string;
    pipeline_key: string | null;
    amount: number;
    weight: number;
    default_rate: number | null;
    distance_to_impairment: number | null;
    subordination_ratio: number | null;
    wal_years: number | null;
    expected_loss_proxy: number | null;
  }>;
}
