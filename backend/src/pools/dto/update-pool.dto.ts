import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsIn,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

class DocumentDto {
  @ApiProperty({ description: 'Document title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Document storage path' })
  @IsString()
  path: string;
}

class PaymentWaterfallStepDto {
  @ApiProperty({ description: 'Waterfall step name' })
  @IsString()
  step: string;

  @ApiProperty({ description: 'Step description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Flat UpdatePoolDto matching the Supabase pools table Update type.
 * Replaces the legacy nested poolInfo structure from the MongoDB era.
 * All fields are optional for PATCH semantics.
 */
export class UpdatePoolDto {
  // --- Core info ---

  @ApiProperty({ description: 'Pool title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Pool description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Pool status',
    required: false,
    enum: [
      'draft',
      'pending_review',
      'under_review',
      'approved',
      'rejected',
      'deploying',
      'deployed',
      'open',
      'funded',
      'ongoing',
      'completed',
      'closed',
    ],
  })
  @IsOptional()
  @IsIn([
    'draft',
    'pending_review',
    'under_review',
    'approved',
    'rejected',
    'deploying',
    'deployed',
    'open',
    'funded',
    'ongoing',
    'completed',
    'closed',
  ])
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  status?: string;

  @ApiProperty({
    description: 'Asset class (e.g. receivables)',
    required: false,
  })
  @IsOptional()
  @IsString()
  asset_class?: string;

  @ApiProperty({ description: 'Asset class detail', required: false })
  @IsOptional()
  @IsString()
  asset_class_detail?: string;

  @ApiProperty({
    description: 'Share class (senior, junior, mezzanine)',
    required: false,
  })
  @IsOptional()
  @IsString()
  share_class?: string;

  @ApiProperty({ description: 'Share class description', required: false })
  @IsOptional()
  @IsString()
  share_class_description?: string;

  @ApiProperty({ description: 'Logo storage path', required: false })
  @IsOptional()
  @IsString()
  logo_path?: string;

  @ApiProperty({ description: 'Minimum credit rating', required: false })
  @IsOptional()
  @IsString()
  min_rating?: string;

  @ApiProperty({ description: 'Pool type (fidc, tidc)', required: false })
  @IsOptional()
  @IsString()
  pool_type?: string;

  @ApiProperty({
    description: 'Pool visibility on marketplace',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_visible?: boolean;

  @ApiProperty({ description: 'Fund CNPJ display value', required: false })
  @IsOptional()
  @IsString()
  fund_cnpj_display?: string;

  // --- Financial terms ---

  @ApiProperty({ description: 'Target raise amount', required: false })
  @IsOptional()
  @IsNumber()
  target_raise_amount?: number;

  @ApiProperty({ description: 'Minimum investment amount', required: false })
  @IsOptional()
  @IsNumber()
  minimum_investment?: number;

  @ApiProperty({ description: 'Target return rate', required: false })
  @IsOptional()
  @IsNumber()
  target_return_rate?: number;

  @ApiProperty({
    description: 'Target return unit (e.g. % p.a.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  target_return_unit?: string;

  @ApiProperty({
    description: 'Whether target return is net of fees',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  target_return_net_of_fees?: boolean;

  @ApiProperty({ description: 'Target return description', required: false })
  @IsOptional()
  @IsString()
  target_return_description?: string;

  @ApiProperty({ description: 'Management fee rate', required: false })
  @IsOptional()
  @IsNumber()
  management_fee_rate?: number;

  @ApiProperty({ description: 'Management fee unit', required: false })
  @IsOptional()
  @IsString()
  management_fee_unit?: string;

  @ApiProperty({ description: 'Fund size', required: false })
  @IsOptional()
  @IsNumber()
  fund_size?: number;

  // --- Duration & redemption ---

  @ApiProperty({ description: 'Investment horizon value', required: false })
  @IsOptional()
  @IsNumber()
  investment_horizon_value?: number;

  @ApiProperty({
    description: 'Investment horizon unit (months, years)',
    required: false,
  })
  @IsOptional()
  @IsString()
  investment_horizon_unit?: string;

  @ApiProperty({
    description: 'Redemption notice period in days',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  redemption_notice_days?: number;

  @ApiProperty({ description: 'Redemption format', required: false })
  @IsOptional()
  @IsString()
  redemption_format?: string;

  @ApiProperty({ description: 'Lockup period in days', required: false })
  @IsOptional()
  @IsNumber()
  lockup_period_days?: number;

  // --- Currency ---

  @ApiProperty({
    description: 'Currency (usd_hedged, brl, usdc)',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Currency description', required: false })
  @IsOptional()
  @IsString()
  currency_description?: string;

  // --- Risk & eligibility ---

  @ApiProperty({ description: 'Subordination level', required: false })
  @IsOptional()
  @IsNumber()
  subordination_level?: number;

  @ApiProperty({ description: 'Subordination description', required: false })
  @IsOptional()
  @IsString()
  subordination_description?: string;

  @ApiProperty({ description: 'Max concentration per debtor', required: false })
  @IsOptional()
  @IsNumber()
  max_concentration_per_debtor?: number;

  @ApiProperty({
    description: 'Other eligibility criteria',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibility_other?: string[];

  @ApiProperty({ description: 'Registrar (cerc, cip, b3)', required: false })
  @IsOptional()
  @IsString()
  registrar?: string;

  @ApiProperty({ description: 'Registrar detail', required: false })
  @IsOptional()
  @IsString()
  registrar_detail?: string;

  // --- Hedge ---

  @ApiProperty({ description: 'Hedge mechanism', required: false })
  @IsOptional()
  @IsString()
  hedge_mechanism?: string;

  @ApiProperty({ description: 'Hedge description', required: false })
  @IsOptional()
  @IsString()
  hedge_description?: string;

  @ApiProperty({ description: 'Hedge coverage percentage', required: false })
  @IsOptional()
  @IsNumber()
  hedge_coverage?: number;

  @ApiProperty({ description: 'Hedge counterparty', required: false })
  @IsOptional()
  @IsString()
  hedge_counterparty?: string;

  @ApiProperty({ description: 'Hedge cost in basis points', required: false })
  @IsOptional()
  @IsNumber()
  hedge_cost_bps?: number;

  @ApiProperty({ description: 'Hedge roll frequency', required: false })
  @IsOptional()
  @IsString()
  hedge_roll_frequency?: string;

  // --- Documents ---

  @ApiProperty({
    description: 'Pool documents',
    required: false,
    type: [DocumentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @ApiProperty({
    description: 'Payment waterfall steps',
    required: false,
    type: [PaymentWaterfallStepDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentWaterfallStepDto)
  payment_waterfall?: PaymentWaterfallStepDto[];

  // --- Manager ---

  @ApiProperty({ description: 'Manager ID', required: false })
  @IsOptional()
  @IsString()
  manager_id?: string;

  @ApiProperty({ description: 'Manager wallet address', required: false })
  @IsOptional()
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, {
    message: 'Invalid Solana address format for manager_address',
  })
  manager_address?: string;

  @ApiProperty({ description: 'Manager display name', required: false })
  @IsOptional()
  @IsString()
  manager_name?: string;

  // --- Dates ---

  @ApiProperty({ description: 'Pool start time', required: false })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiProperty({
    description: 'Whether investment window is open',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  investment_window_open?: boolean;
}
