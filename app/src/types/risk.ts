// ── Shared base ─────────────────────────────────────────────────────────

export interface PoolRiskScoreBase {
  pipeline_key: string;
  pool_type: "fidc" | "tidc";
  reference_date: string;
  score_risco: number;
  faixa_risco: "Baixo" | "Moderado" | "Alto" | "Elevado" | "Crítico";
  confidence_tier: 1 | 2 | 3 | 4;
  confidence_label: string;
  alerta_deterioracao: boolean;
  n_months_total: number;
}

// ── FIDC score ──────────────────────────────────────────────────────────

export interface FidcRiskScore extends PoolRiskScoreBase {
  pool_type: "fidc";
  score_risco_global: number;
  pdd_prevista_ensemble: number;
  delta_pdd: number;
  cluster_id: number;
  cluster_risk_label: string;
  f1: number;
  f2: number;
  f3: number;
  pdd_ratio: number;
  inad_total_ratio: number;
  default_stock_ratio: number;
  leverage_ratio: number;
  liquidity_ratio: number;
  mean_rentab: number;
  std_rentab: number;
  pct_negative: number;
  pct_below_cdi: number;
  max_drawdown: number;
  sharpe_ratio: number;
}

// ── TIDC score ──────────────────────────────────────────────────────────

export interface TidcRiskScore extends PoolRiskScoreBase {
  pool_type: "tidc";
  collection_rate: number;
  default_ratio: number;
  overdue_ratio: number;
  on_time_payment_ratio: number;
  distance_to_loss: number;
  expected_loss_proxy: number;
  effective_yield: number;
  mean_monthly_yield: number;
  sacado_top5_pct: number;
  cedente_top5_pct: number;
}

export type PoolRiskScore = FidcRiskScore | TidcRiskScore;

// ── FIDC monthly ────────────────────────────────────────────────────────

export interface FidcMonthly {
  pipeline_key: string;
  reference_month: string;
  vl_ativo: number | null;
  vl_carteira: number | null;
  vl_disp: number | null;
  pdd_ratio: number | null;
  inad_total_ratio: number | null;
  default_stock_ratio: number | null;
  inad_early_ratio: number | null;
  inad_mid_ratio: number | null;
  inad_severe_ratio: number | null;
  leverage_ratio: number | null;
  liquidity_ratio: number | null;
  recompra_ratio: number | null;
  senior_return_mes: number | null;
  subordination_ratio: number | null;
  wal_years: number | null;
  cedente_top1_pct: number | null;
  scr_share_ig: number | null;
}

// ── TIDC monthly ────────────────────────────────────────────────────────

export interface TidcMonthly {
  pipeline_key: string;
  reference_month: string;
  total_items: number;
  total_face_value: number;
  total_acquisition_value: number;
  avg_discount_rate: number | null;
  effective_yield: number | null;
  advance_rate: number | null;
  sacado_effective_n: number | null;
  sacado_top5_pct: number | null;
  cedente_effective_n: number | null;
  cedente_top5_pct: number | null;
  collection_rate: number | null;
  overdue_ratio: number | null;
  default_ratio: number | null;
  inad_early_ratio: number | null;
  inad_mid_ratio: number | null;
  inad_severe_ratio: number | null;
  wal_days: number | null;
  on_time_payment_ratio: number | null;
  distance_to_loss: number | null;
}

// ── Metric definitions (for tooltips) ───────────────────────────────────

export interface MetricDefinition {
  label: string;
  description: string;
  goodRange?: string;
  source?: string;
}

export type MetricDefinitions = Record<string, MetricDefinition>;
