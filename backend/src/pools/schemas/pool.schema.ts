export type PoolStatus =
  | 'draft'
  | 'pending_review'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'deploying'
  | 'deployed'
  | 'open'
  | 'funded'
  | 'ongoing'
  | 'completed'
  | 'closed';

export type ShareClass = 'senior' | 'junior' | 'mezzanine';
export type PoolCurrency = 'usd_hedged' | 'brl' | 'usdc';
export type InvestmentHorizonUnit = 'months' | 'years';
export type Registrar = 'cerc' | 'cip' | 'b3';
export type HedgeMechanism = 'ndf' | 'b3_futures' | 'options' | 'none';

export interface Pool {
  id: string;
  pipeline_key?: string;
  fund_id?: string;
  on_chain_address?: string;
  status: PoolStatus;
  version: number;
  title: string;
  description?: string;
  logo_path?: string;
  asset_class: string;
  asset_class_detail?: string;
  share_class?: ShareClass;
  share_class_description?: string;
  currency?: PoolCurrency;
  currency_description?: string;
  target_return_rate?: number;
  target_return_unit?: string;
  target_return_net_of_fees?: boolean;
  target_return_description?: string;
  management_fee_rate?: number;
  management_fee_unit?: string;
  investment_horizon_value?: number;
  investment_horizon_unit?: InvestmentHorizonUnit;
  redemption_notice_days?: number;
  redemption_format?: string;
  lockup_period_days?: number;
  subordination_level?: number;
  subordination_description?: string;
  min_rating?: string;
  max_concentration_per_debtor?: number;
  eligibility_other?: string[];
  registrar?: Registrar;
  registrar_detail?: string;
  minimum_investment?: number;
  fund_size?: number;
  start_time?: string;
  investment_window_open?: boolean;
  manager_id?: string;
  manager_address?: string;
  manager_name?: string;
  documents?: Array<{ title: string; path: string }>;
  payment_waterfall?: Array<{ step: string; description?: string }>;
  hedge_mechanism?: HedgeMechanism;
  hedge_description?: string;
  hedge_coverage?: number;
  hedge_counterparty?: string;
  hedge_cost_bps?: number;
  hedge_roll_frequency?: string;
  created_at: string;
  updated_at: string;
  // Legacy fields — no longer set by current workflow but kept for historical data
  submitted_at?: string;
  approved_at?: string;
  deployed_at?: string;
  funded_at?: string;
  matured_at?: string;
  rejection_reason?: string;
  rejected_by?: string;

  // Pool type & visibility
  pool_type: string;
  is_visible: boolean;
  fund_cnpj_display?: string;

  // SVS-11 on-chain
  vault_id?: number;
  asset_mint?: string;
  target_raise_amount?: number;
}

export type PoolDocument = Pool;
