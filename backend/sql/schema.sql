-- Credit Markets — Supabase Schema (Source of Truth)
-- All CREATE TABLE / VIEW / FUNCTION statements in one file.
-- Apply via Supabase SQL Editor or MCP apply_migration.
-- Spec: docs/marketplace-dashboard-mvp-requirements.md §7-9
--
-- Last synced with live DB: 2026-03-17

-- ============================================================
-- §9.1 CORE TABLES
-- ============================================================

-- Actors (companies, banks, individuals in the responsibility chain)
CREATE TABLE IF NOT EXISTS actors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,  -- 'individual', 'company', 'bank', 'platform'
  wallet_address  TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Managers (fund management companies)
CREATE TABLE IF NOT EXISTS managers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES actors(id),
  company_name    TEXT NOT NULL,
  overview        TEXT,
  logo_path       TEXT,
  website         TEXT,
  owner_address   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pools (derived read model)
CREATE TABLE IF NOT EXISTS pools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key    TEXT UNIQUE,
  fund_id         UUID,
  on_chain_address TEXT UNIQUE,
  status          TEXT NOT NULL DEFAULT 'draft',
  version         INTEGER DEFAULT 1,

  -- Term Sheet
  title           TEXT NOT NULL,
  description     TEXT,
  logo_path       TEXT,
  asset_class     TEXT NOT NULL,
  asset_class_detail TEXT,
  share_class     TEXT NOT NULL DEFAULT 'senior',
  share_class_description TEXT,
  currency        TEXT NOT NULL DEFAULT 'usd_hedged',
  currency_description TEXT,
  target_return_rate NUMERIC,
  target_return_unit TEXT DEFAULT 'percent_pa',
  target_return_net_of_fees BOOLEAN DEFAULT TRUE,
  target_return_description TEXT,
  management_fee_rate NUMERIC,
  management_fee_unit TEXT DEFAULT 'percent_pa',
  investment_horizon_value INTEGER,
  investment_horizon_unit TEXT,
  redemption_notice_days INTEGER,
  redemption_format TEXT,
  lockup_period_days INTEGER DEFAULT 0,
  subordination_level NUMERIC,
  subordination_description TEXT,
  min_rating      TEXT,
  max_concentration_per_debtor NUMERIC,
  eligibility_other TEXT[],
  registrar       TEXT,
  registrar_detail TEXT,
  minimum_investment NUMERIC,
  fund_size       NUMERIC,

  -- Deployment & Investment Window
  start_time      TIMESTAMPTZ,
  investment_window_open BOOLEAN DEFAULT FALSE,
  target_raise_amount NUMERIC,

  -- Manager
  manager_id      UUID REFERENCES actors(id),
  manager_address TEXT,
  manager_name    TEXT,

  -- Docs & Waterfall
  documents       JSONB DEFAULT '[]',
  payment_waterfall JSONB DEFAULT '[]',

  -- FX Hedge (static terms)
  hedge_mechanism TEXT,
  hedge_description TEXT,
  hedge_coverage  NUMERIC,
  hedge_counterparty TEXT,
  hedge_cost_bps  NUMERIC,
  hedge_roll_frequency TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  deployed_at     TIMESTAMPTZ,
  funded_at       TIMESTAMPTZ,
  matured_at      TIMESTAMPTZ,

  -- Rejection
  rejection_reason TEXT,
  rejected_by     TEXT,

  -- Pool type & visibility
  pool_type       TEXT NOT NULL DEFAULT 'fidc',
  is_visible      BOOLEAN NOT NULL DEFAULT FALSE,
  fund_cnpj_display TEXT,

  -- SVS-11 on-chain
  vault_id        BIGINT,
  asset_mint      TEXT,
  attester_address TEXT,
  authority_address TEXT,
  nav_oracle_address TEXT,
  price_per_share NUMERIC,

  -- CHECK constraints
  CHECK (status IN ('draft','pending_review','under_review','approved','rejected','deploying','deployed','open','funded','ongoing','completed','closed')),
  CHECK (pool_type IN ('fidc','tidc')),
  CHECK (asset_class IN ('healthcare_receivables','sme_receivables','agro_receivables','tidc_receivables','mixed')),
  CHECK (share_class IN ('senior','junior','mezzanine')),
  CHECK (currency IN ('usd_hedged','brl','usdc')),
  CHECK (hedge_mechanism IN ('ndf','b3_futures','options','none')),
  CHECK (investment_horizon_unit IN ('months','years')),
  CHECK (registrar IN ('cerc','cip','b3'))
);

CREATE INDEX IF NOT EXISTS idx_pools_status ON pools(status);
CREATE INDEX IF NOT EXISTS idx_pools_manager_address ON pools(manager_address);
CREATE INDEX IF NOT EXISTS idx_pools_visible_status ON pools(is_visible, status);

-- Nota Fiscal Items (TIDC receivables)
CREATE TABLE IF NOT EXISTS nota_fiscal_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id         UUID NOT NULL REFERENCES pools(id),
  pipeline_key    TEXT NOT NULL,
  cedente         TEXT NOT NULL,
  sacado          TEXT NOT NULL,
  valor_aquisicao NUMERIC NOT NULL,
  valor_nominal   NUMERIC NOT NULL,
  valor_pago      NUMERIC,
  data_emissao    DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  taxa_desconto   NUMERIC,
  payment_schedule JSONB DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'active',
  external_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (EOA wallet address from Dynamic Labs, no smart accounts)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account         TEXT NOT NULL,
  provider_id     TEXT,
  dynamic_identifier TEXT,
  kyc_id          INTEGER,
  kyc_attestation TEXT,
  referral_id     TEXT UNIQUE NOT NULL,
  referred_by     TEXT,
  notifications   JSONB DEFAULT '{"transactions": true, "opportunities": true, "news": true}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_account ON users (account);

-- OTPs
CREATE TABLE IF NOT EXISTS otps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  code            INTEGER NOT NULL,
  verified        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tokens
CREATE TABLE IF NOT EXISTS tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  address         TEXT NOT NULL,
  decimals        INTEGER NOT NULL,
  icon            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- §7.3 EXECUTION EVENT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS execution_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  correlation_id  UUID NOT NULL,
  actor_id        TEXT NOT NULL,
  actor_type      TEXT NOT NULL
    CHECK (actor_type IN ('investor','facilitator','admin','system','partner','manager','attester','oracle')),
  target_type     TEXT NOT NULL,
  target_id       TEXT NOT NULL,
  payload         JSONB NOT NULL,
  chain_tx_id     TEXT,
  chain_confirmed BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_events_target ON execution_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_correlation ON execution_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_actor ON execution_events(actor_id, event_type);
CREATE INDEX IF NOT EXISTS idx_execution_events_created_at ON execution_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_events_actor_type ON execution_events(actor_type);
CREATE INDEX IF NOT EXISTS idx_execution_events_event_type ON execution_events(event_type);

-- ============================================================
-- §8.4 NAV PRICE HISTORY (oracle price tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS nav_price_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id         UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  price           BIGINT NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL,
  chain_tx_id     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_nav_price_pool_tx UNIQUE (pool_id, chain_tx_id)
);

CREATE INDEX IF NOT EXISTS idx_nav_price_history_pool_time
  ON nav_price_history (pool_id, recorded_at DESC);

-- ============================================================
-- §8.5 RESPONSIBILITY MODEL
-- ============================================================

CREATE TABLE IF NOT EXISTS pool_responsibilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id         UUID NOT NULL REFERENCES pools(id),
  role            TEXT NOT NULL,
  actor_id        UUID NOT NULL REFERENCES actors(id),
  assigned_by     TEXT NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  revocation_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pool_responsibility_active
  ON pool_responsibilities(pool_id, role, actor_id)
  WHERE revoked_at IS NULL;

-- ─── KYB (Know Your Business) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyb_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  manager_id      UUID REFERENCES managers(id),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','under_review','approved','rejected','revoked','resubmission_requested')),
  jurisdiction    TEXT,
  company_name    TEXT,
  registration_number TEXT,
  company_type    TEXT,
  incorporation_date DATE,
  registered_address TEXT,
  operating_address TEXT,
  industry_sector TEXT,
  business_description TEXT,
  annual_revenue  TEXT,
  employee_count  TEXT,
  website         TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  representations JSONB,
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  rejection_reason TEXT,
  risk_score      INTEGER,
  risk_notes      TEXT,
  attestation_tx  TEXT,
  attestation_pda TEXT,
  attestation_expires_at TIMESTAMPTZ,
  resubmission_checklist TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kyb_ubos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES kyb_submissions(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  nationality     TEXT,
  date_of_birth   DATE,
  ownership_pct   NUMERIC,
  role            TEXT,
  document_type   TEXT,
  document_number TEXT,
  pep_status      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kyb_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES kyb_submissions(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kyb_wallet_declarations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES kyb_submissions(id) ON DELETE CASCADE,
  wallet_address  TEXT NOT NULL,
  wallet_type     TEXT NOT NULL DEFAULT 'solana',
  purpose         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  role            TEXT NOT NULL,
  granted_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tvl_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id         UUID NOT NULL REFERENCES pools(id),
  tvl             NUMERIC NOT NULL,
  total_shares    NUMERIC NOT NULL,
  price_per_share NUMERIC NOT NULL,
  event_type      TEXT NOT NULL,
  chain_tx_id     TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tvl_snapshots_pool_recorded ON tvl_snapshots(pool_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tvl_snapshots_recorded ON tvl_snapshots(recorded_at DESC);

-- ============================================================
-- §9.2 RISK INDEX TABLES (populated by Python pipeline)
-- ============================================================

-- MT1: Returns (monthly time-series)
CREATE TABLE IF NOT EXISTS risk_returns_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key    TEXT NOT NULL,
  reference_month DATE NOT NULL,
  tranche_class   TEXT NOT NULL,
  class_return_mean_pct NUMERIC,
  class_return_median_pct NUMERIC,
  class_return_std_pct NUMERIC,
  series_count    INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pipeline_key, reference_month, tranche_class)
);

-- MT1: Returns (full-history summary per tranche)
CREATE TABLE IF NOT EXISTS risk_returns_summary (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key    TEXT NOT NULL,
  tranche_class   TEXT NOT NULL,
  return_mean_pct NUMERIC,
  return_median_pct NUMERIC,
  annualized_return_pct NUMERIC,
  volatility_pct  NUMERIC,
  downside_volatility_pct NUMERIC,
  sharpe_ratio    NUMERIC,
  max_drawdown_pct NUMERIC,
  worst_month_pct NUMERIC,
  positive_month_ratio NUMERIC,
  observations    INTEGER,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pipeline_key, tranche_class)
);

-- MT2: Credit risk (monthly balance sheet solvency)
CREATE TABLE IF NOT EXISTS risk_credit_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key    TEXT NOT NULL,
  reference_month DATE NOT NULL,
  total_assets    NUMERIC,
  credit_portfolio NUMERIC,
  cash            NUMERIC,
  performing_credit NUMERIC,
  overdue_credit  NUMERIC,
  defaulted_credit NUMERIC,
  in_recovery_credit NUMERIC,
  recovered_credit NUMERIC,
  loss_absorption_capacity NUMERIC,
  non_performing_ratio NUMERIC,
  distressed_credit_ratio NUMERIC,
  cash_to_default_coverage NUMERIC,
  cash_to_distressed_ratio NUMERIC,
  collateralization_ratio NUMERIC,
  subordination_ratio NUMERIC,
  credit_intensity NUMERIC,
  liquidity_buffer_ratio NUMERIC,
  performing_ratio NUMERIC,
  default_rate    NUMERIC,
  default_rate_volatility_12m NUMERIC,
  default_rate_mean_12m NUMERIC,
  default_rate_trend_12m NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pipeline_key, reference_month)
);

-- MT3: Portfolio quality (monthly)
CREATE TABLE IF NOT EXISTS risk_portfolio_quality_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key    TEXT NOT NULL,
  reference_month DATE NOT NULL,
  expected_loss_proxy NUMERIC,
  investment_grade_ratio NUMERIC,
  speculative_grade_ratio NUMERIC,
  default_grade_ratio NUMERIC,
  rated_exposure_ratio NUMERIC,
  cedente_effective_n NUMERIC,
  cedente_top9_total NUMERIC,
  sector_effective_n NUMERIC,
  sector_hhi      NUMERIC,
  wal_days        NUMERIC,
  wal_years       NUMERIC,
  maturing_90d_ratio NUMERIC,
  maturing_180d_ratio NUMERIC,
  long_term_ratio NUMERIC,
  stage1_ratio    NUMERIC,
  stage2_ratio    NUMERIC,
  stage3_ratio    NUMERIC,
  avg_default_age_days NUMERIC,
  expected_loss_from_defaults NUMERIC,
  distance_to_impairment NUMERIC,
  senior_expected_loss_proxy NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pipeline_key, reference_month)
);

-- MT4: Registry (static fund + manager)
CREATE TABLE IF NOT EXISTS risk_registry_static (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key    TEXT UNIQUE NOT NULL,
  fund_age_years  NUMERIC,
  is_active       BOOLEAN,
  fund_lifetime_years NUMERIC,
  manager_fund_count INTEGER,
  manager_active_fund_count INTEGER,
  manager_track_record_years NUMERIC,
  manager_survival_ratio NUMERIC,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MT5: Portfolio flows (monthly)
CREATE TABLE IF NOT EXISTS risk_portfolio_flow_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key    TEXT NOT NULL,
  reference_month DATE NOT NULL,
  equity          NUMERIC,
  pl_growth_rate  NUMERIC,
  pl_volatility_12m NUMERIC,
  origination_volume NUMERIC,
  repurchased_volume NUMERIC,
  substituted_volume NUMERIC,
  net_portfolio_expansion NUMERIC,
  bad_acquisition_ratio NUMERIC,
  delinquent_acquisition_ratio NUMERIC,
  performing_acquisition_ratio NUMERIC,
  repurchase_ratio NUMERIC,
  substitution_ratio NUMERIC,
  origination_to_pl_ratio NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pipeline_key, reference_month)
);

-- TIDC: Nota Fiscal risk metrics (monthly)
CREATE TABLE IF NOT EXISTS risk_nf_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key    TEXT NOT NULL,
  reference_month DATE NOT NULL,
  total_items     INTEGER,
  total_face_value NUMERIC,
  total_acquisition_value NUMERIC,
  avg_discount_rate NUMERIC,
  effective_yield NUMERIC,
  advance_rate    NUMERIC,
  sacado_effective_n NUMERIC,
  sacado_top5_pct NUMERIC,
  cedente_effective_n NUMERIC,
  cedente_top5_pct NUMERIC,
  maturing_30d_ratio NUMERIC,
  maturing_60d_ratio NUMERIC,
  maturing_90d_ratio NUMERIC,
  long_term_ratio NUMERIC,
  avg_remaining_days NUMERIC,
  collection_rate NUMERIC,
  overdue_ratio   NUMERIC,
  default_ratio   NUMERIC,
  on_time_payment_ratio NUMERIC,
  distance_to_loss NUMERIC,
  expected_loss_proxy NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pipeline_key, reference_month)
);

-- ============================================================
-- §9.2b RISK MODEL v2 TABLES (replaces old risk_credit_monthly etc.)
-- ============================================================

-- FIDC Risk Scores (one row per fund, latest snapshot)
CREATE TABLE IF NOT EXISTS risk_fidc_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key          TEXT NOT NULL UNIQUE,
  cnpj_fundo            TEXT NOT NULL,
  reference_date        DATE NOT NULL,
  score_risco           NUMERIC NOT NULL,
  score_risco_global    NUMERIC NOT NULL,
  faixa_risco           TEXT NOT NULL CHECK (faixa_risco IN ('Baixo','Moderado','Alto','Elevado','Crítico')),
  pdd_prevista_ensemble NUMERIC,
  delta_pdd             NUMERIC,
  alerta_deterioracao   BOOLEAN DEFAULT FALSE,
  confidence_tier       INTEGER NOT NULL CHECK (confidence_tier BETWEEN 1 AND 4),
  confidence_label      TEXT NOT NULL,
  cluster_id            INTEGER,
  cluster_risk_label    TEXT,
  f1                    NUMERIC,
  f2                    NUMERIC,
  f3                    NUMERIC,
  pdd_ratio             NUMERIC,
  inad_total_ratio      NUMERIC,
  default_stock_ratio   NUMERIC,
  leverage_ratio        NUMERIC,
  liquidity_ratio       NUMERIC,
  mean_rentab           NUMERIC,
  std_rentab            NUMERIC,
  pct_negative          NUMERIC,
  pct_below_cdi         NUMERIC,
  max_drawdown          NUMERIC,
  sharpe_ratio          NUMERIC,
  n_months_total        INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- FIDC Monthly Time-Series
CREATE TABLE IF NOT EXISTS risk_fidc_monthly (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key          TEXT NOT NULL,
  cnpj_fundo            TEXT NOT NULL,
  reference_month       DATE NOT NULL,
  vl_ativo              NUMERIC,
  vl_carteira           NUMERIC,
  vl_disp               NUMERIC,
  pdd_ratio             NUMERIC,
  inad_total_ratio      NUMERIC,
  default_stock_ratio   NUMERIC,
  inad_early_ratio      NUMERIC,
  inad_mid_ratio        NUMERIC,
  inad_severe_ratio     NUMERIC,
  leverage_ratio        NUMERIC,
  liquidity_ratio       NUMERIC,
  recompra_ratio        NUMERIC,
  senior_return_mes     NUMERIC,
  subordination_ratio   NUMERIC,
  wal_years             NUMERIC,
  cedente_top1_pct      NUMERIC,
  scr_share_ig          NUMERIC,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pipeline_key, reference_month)
);

-- TIDC Risk Scores (one row per fund, latest snapshot)
CREATE TABLE IF NOT EXISTS risk_tidc_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key          TEXT NOT NULL UNIQUE,
  reference_date        DATE NOT NULL,
  score_risco           NUMERIC NOT NULL,
  faixa_risco           TEXT NOT NULL CHECK (faixa_risco IN ('Baixo','Moderado','Alto','Elevado','Crítico')),
  alerta_deterioracao   BOOLEAN DEFAULT FALSE,
  confidence_tier       INTEGER NOT NULL CHECK (confidence_tier BETWEEN 1 AND 4),
  confidence_label      TEXT NOT NULL,
  collection_rate       NUMERIC,
  default_ratio         NUMERIC,
  overdue_ratio         NUMERIC,
  on_time_payment_ratio NUMERIC,
  distance_to_loss      NUMERIC,
  expected_loss_proxy   NUMERIC,
  effective_yield       NUMERIC,
  mean_monthly_yield    NUMERIC,
  sacado_top5_pct       NUMERIC,
  cedente_top5_pct      NUMERIC,
  n_months_total        INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- TIDC Monthly Time-Series
CREATE TABLE IF NOT EXISTS risk_tidc_monthly (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key            TEXT NOT NULL,
  reference_month         DATE NOT NULL,
  total_items             INTEGER,
  total_face_value        NUMERIC,
  total_acquisition_value NUMERIC,
  avg_discount_rate       NUMERIC,
  effective_yield         NUMERIC,
  advance_rate            NUMERIC,
  sacado_effective_n      NUMERIC,
  sacado_top5_pct         NUMERIC,
  cedente_effective_n     NUMERIC,
  cedente_top5_pct        NUMERIC,
  collection_rate         NUMERIC,
  overdue_ratio           NUMERIC,
  default_ratio           NUMERIC,
  inad_early_ratio        NUMERIC,
  inad_mid_ratio          NUMERIC,
  inad_severe_ratio       NUMERIC,
  wal_days                NUMERIC,
  on_time_payment_ratio   NUMERIC,
  distance_to_loss        NUMERIC,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pipeline_key, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_risk_fidc_monthly_pk_month ON risk_fidc_monthly(pipeline_key, reference_month DESC);
CREATE INDEX IF NOT EXISTS idx_risk_tidc_monthly_pk_month ON risk_tidc_monthly(pipeline_key, reference_month DESC);

-- ============================================================
-- §9.3 VIEWS & DERIVED TABLES
-- ============================================================

-- risk_current: latest risk snapshot per fund (joins all 5 MT tables)
CREATE OR REPLACE VIEW risk_current AS
SELECT DISTINCT ON (c.pipeline_key)
  c.pipeline_key,
  c.reference_month,
  -- MT2: Credit Risk
  c.default_rate,
  c.non_performing_ratio,
  c.subordination_ratio,
  c.collateralization_ratio,
  c.loss_absorption_capacity,
  c.liquidity_buffer_ratio,
  c.performing_ratio,
  c.credit_intensity,
  c.default_rate_trend_12m,
  c.default_rate_volatility_12m,
  c.cash_to_default_coverage,
  c.cash_to_distressed_ratio,
  c.distressed_credit_ratio,
  -- MT3: Portfolio Quality
  q.distance_to_impairment,
  q.expected_loss_proxy,
  q.senior_expected_loss_proxy,
  q.investment_grade_ratio,
  q.speculative_grade_ratio,
  q.default_grade_ratio,
  q.rated_exposure_ratio,
  q.wal_years,
  q.wal_days,
  q.maturing_90d_ratio,
  q.maturing_180d_ratio,
  q.long_term_ratio,
  q.cedente_effective_n,
  q.cedente_top9_total,
  q.sector_effective_n,
  q.sector_hhi,
  q.stage1_ratio,
  q.stage2_ratio,
  q.stage3_ratio,
  q.avg_default_age_days,
  q.expected_loss_from_defaults,
  -- MT1: Returns (summary, not monthly)
  s.annualized_return_pct,
  s.volatility_pct,
  s.downside_volatility_pct,
  s.sharpe_ratio,
  s.max_drawdown_pct,
  s.worst_month_pct,
  s.positive_month_ratio,
  s.observations AS return_observations,
  -- MT4: Registry (static)
  r.fund_age_years,
  r.is_active,
  r.manager_fund_count,
  r.manager_active_fund_count,
  r.manager_track_record_years,
  r.manager_survival_ratio,
  -- MT5: Portfolio Flows
  f.equity,
  f.pl_growth_rate,
  f.pl_volatility_12m,
  f.bad_acquisition_ratio,
  f.delinquent_acquisition_ratio,
  f.performing_acquisition_ratio,
  f.repurchase_ratio,
  f.origination_to_pl_ratio
FROM risk_credit_monthly c
LEFT JOIN risk_portfolio_quality_monthly q
  ON q.pipeline_key = c.pipeline_key AND q.reference_month = c.reference_month
LEFT JOIN risk_returns_summary s
  ON s.pipeline_key = c.pipeline_key AND s.tranche_class = 'senior'
LEFT JOIN risk_registry_static r
  ON r.pipeline_key = c.pipeline_key
LEFT JOIN risk_portfolio_flow_monthly f
  ON f.pipeline_key = c.pipeline_key AND f.reference_month = c.reference_month
ORDER BY c.pipeline_key, c.reference_month DESC;

-- risk_nf_current: latest TIDC NF risk snapshot per fund
CREATE OR REPLACE VIEW risk_nf_current AS
SELECT DISTINCT ON (pipeline_key)
  pipeline_key,
  reference_month,
  total_items,
  total_face_value,
  total_acquisition_value,
  avg_discount_rate,
  effective_yield,
  advance_rate,
  sacado_effective_n,
  sacado_top5_pct,
  cedente_effective_n,
  cedente_top5_pct,
  maturing_30d_ratio,
  maturing_60d_ratio,
  maturing_90d_ratio,
  long_term_ratio,
  avg_remaining_days,
  collection_rate,
  overdue_ratio,
  default_ratio,
  on_time_payment_ratio,
  distance_to_loss,
  expected_loss_proxy
FROM risk_nf_monthly
ORDER BY pipeline_key, reference_month DESC;

-- Pool investment windows (materialized from open/close events)
CREATE TABLE IF NOT EXISTS pool_investment_windows (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id         UUID NOT NULL REFERENCES pools(id),
  window_number   INT NOT NULL,
  opened_at       TIMESTAMPTZ NOT NULL,
  closed_at       TIMESTAMPTZ,
  total_requested NUMERIC DEFAULT 0,
  total_approved  NUMERIC DEFAULT 0,
  total_rejected  NUMERIC DEFAULT 0,
  request_count   INT DEFAULT 0,
  approved_count  INT DEFAULT 0,
  rejected_count  INT DEFAULT 0,
  UNIQUE(pool_id, window_number)
);

-- ============================================================
-- RPC FUNCTIONS (Atomic operations for investment windows)
-- ============================================================

CREATE OR REPLACE FUNCTION open_investment_window(
  p_pool_id UUID,
  p_opened_at TIMESTAMPTZ
) RETURNS void AS $$
BEGIN
  INSERT INTO pool_investment_windows (pool_id, window_number, opened_at)
  VALUES (
    p_pool_id,
    COALESCE(
      (SELECT MAX(window_number) FROM pool_investment_windows WHERE pool_id = p_pool_id),
      0
    ) + 1,
    p_opened_at
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_window_requested(
  p_pool_id UUID,
  p_amount NUMERIC
) RETURNS void AS $$
BEGIN
  UPDATE pool_investment_windows
  SET total_requested = total_requested + p_amount,
      request_count = request_count + 1
  WHERE pool_id = p_pool_id
    AND closed_at IS NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_window_approved(
  p_pool_id UUID,
  p_amount NUMERIC
) RETURNS void AS $$
BEGIN
  UPDATE pool_investment_windows
  SET total_approved = total_approved + p_amount,
      approved_count = approved_count + 1
  WHERE pool_id = p_pool_id
    AND closed_at IS NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_window_rejected(
  p_pool_id UUID,
  p_amount NUMERIC
) RETURNS void AS $$
BEGIN
  UPDATE pool_investment_windows
  SET total_rejected = total_rejected + p_amount,
      rejected_count = rejected_count + 1
  WHERE pool_id = p_pool_id
    AND closed_at IS NULL;
END;
$$ LANGUAGE plpgsql;
