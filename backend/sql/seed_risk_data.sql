-- Seed data: FIDC Healthcare Receivables Fund
-- Pipeline key follows naming convention: fidc_<sector>_<sequence>
-- CNPJ stored separately in fund_cnpj_display for display only

-- Fund registry (static)
INSERT INTO risk_registry_static (pipeline_key, fund_age_years, is_active, fund_lifetime_years, manager_fund_count, manager_active_fund_count, manager_track_record_years, manager_survival_ratio)
VALUES ('fidc_healthcare_001', 3.5, true, 5.0, 8, 5, 7.2, 0.88);

-- Credit risk (6 months, Oct 2025 – Mar 2026)
INSERT INTO risk_credit_monthly (pipeline_key, reference_month, total_assets, credit_portfolio, cash, performing_credit, overdue_credit, defaulted_credit, in_recovery_credit, recovered_credit, loss_absorption_capacity, non_performing_ratio, distressed_credit_ratio, cash_to_default_coverage, cash_to_distressed_ratio, collateralization_ratio, subordination_ratio, credit_intensity, liquidity_buffer_ratio, performing_ratio, default_rate, default_rate_volatility_12m, default_rate_mean_12m, default_rate_trend_12m)
VALUES
  ('fidc_healthcare_001', '2025-10-01', 56000000, 48000000, 5600000, 46000000, 1000000, 1000000, 140000, 220000, 9700000, 0.042, 0.024, 5.60, 2.33, 1.17, 0.23, 0.86, 0.10, 0.958, 0.021, 0.003, 0.021, 0.000),
  ('fidc_healthcare_001', '2025-11-01', 57000000, 49000000, 5700000, 47000000, 1100000, 900000, 130000, 240000, 9900000, 0.041, 0.021, 6.33, 2.71, 1.16, 0.24, 0.86, 0.10, 0.959, 0.018, 0.003, 0.021, -0.001),
  ('fidc_healthcare_001', '2025-12-01', 58000000, 50000000, 5800000, 48000000, 1000000, 1000000, 120000, 260000, 10100000, 0.040, 0.022, 5.80, 2.48, 1.16, 0.24, 0.86, 0.10, 0.960, 0.020, 0.003, 0.020, -0.001),
  ('fidc_healthcare_001', '2026-01-01', 59000000, 51000000, 5900000, 49000000, 900000, 1100000, 110000, 280000, 10300000, 0.039, 0.023, 5.36, 2.38, 1.16, 0.24, 0.86, 0.10, 0.961, 0.022, 0.002, 0.020, 0.000),
  ('fidc_healthcare_001', '2026-02-01', 60000000, 52000000, 6000000, 50000000, 800000, 1200000, 100000, 300000, 10500000, 0.038, 0.025, 5.00, 2.31, 1.15, 0.24, 0.87, 0.10, 0.962, 0.023, 0.002, 0.021, 0.001),
  ('fidc_healthcare_001', '2026-03-01', 61000000, 53000000, 6100000, 51000000, 900000, 1100000, 90000, 320000, 10700000, 0.038, 0.023, 5.55, 2.54, 1.15, 0.25, 0.87, 0.10, 0.962, 0.021, 0.002, 0.021, 0.000);

-- Returns (monthly, senior tranche)
INSERT INTO risk_returns_monthly (pipeline_key, reference_month, tranche_class, class_return_mean_pct, class_return_median_pct, class_return_std_pct, series_count)
VALUES
  ('fidc_healthcare_001', '2025-10-01', 'senior', 1.08, 1.05, 0.14, 1),
  ('fidc_healthcare_001', '2025-11-01', 'senior', 1.02, 1.00, 0.16, 1),
  ('fidc_healthcare_001', '2025-12-01', 'senior', 1.10, 1.08, 0.13, 1),
  ('fidc_healthcare_001', '2026-01-01', 'senior', 1.04, 1.01, 0.15, 1),
  ('fidc_healthcare_001', '2026-02-01', 'senior', 1.06, 1.03, 0.14, 1),
  ('fidc_healthcare_001', '2026-03-01', 'senior', 1.05, 1.02, 0.15, 1);

-- Returns summary
INSERT INTO risk_returns_summary (pipeline_key, tranche_class, return_mean_pct, return_median_pct, annualized_return_pct, volatility_pct, downside_volatility_pct, sharpe_ratio, max_drawdown_pct, worst_month_pct, positive_month_ratio, observations)
VALUES ('fidc_healthcare_001', 'senior', 1.05, 1.02, 12.6, 1.8, 1.2, 1.8, -0.5, -0.3, 0.92, 12);

-- Portfolio quality (latest month)
INSERT INTO risk_portfolio_quality_monthly (pipeline_key, reference_month, expected_loss_proxy, investment_grade_ratio, speculative_grade_ratio, default_grade_ratio, rated_exposure_ratio, cedente_effective_n, cedente_top9_total, sector_effective_n, sector_hhi, wal_days, wal_years, maturing_90d_ratio, maturing_180d_ratio, long_term_ratio, stage1_ratio, stage2_ratio, stage3_ratio, distance_to_impairment, senior_expected_loss_proxy)
VALUES ('fidc_healthcare_001', '2026-03-01', 0.012, 0.72, 0.20, 0.08, 0.85, 45, 0.35, 8, 0.18, 180, 0.49, 0.25, 0.40, 0.35, 0.92, 0.05, 0.03, 0.184, 0.002);

-- Portfolio flow (latest month)
INSERT INTO risk_portfolio_flow_monthly (pipeline_key, reference_month, equity, pl_growth_rate, origination_volume, repurchased_volume, net_portfolio_expansion, bad_acquisition_ratio, performing_acquisition_ratio, repurchase_ratio, origination_to_pl_ratio)
VALUES ('fidc_healthcare_001', '2026-03-01', 61000000, 0.018, 8500000, 200000, 0.015, 0.02, 0.95, 0.024, 0.14);

-- FIDC Pool record (draft, not deployed — available for Create Pool flow)
INSERT INTO pools (
  pipeline_key, pool_type, is_visible, status, title, description,
  asset_class, share_class, currency,
  target_return_rate, target_return_unit, target_return_net_of_fees,
  management_fee_rate, investment_horizon_value, investment_horizon_unit,
  redemption_notice_days, redemption_format,
  subordination_level, subordination_description,
  minimum_investment, fund_size, target_raise_amount,
  investment_window_open,
  hedge_mechanism, hedge_description, hedge_coverage, hedge_counterparty, hedge_cost_bps, hedge_roll_frequency,
  min_rating, max_concentration_per_debtor, registrar,
  fund_cnpj_display,
  vault_id, asset_mint
)
VALUES (
  'fidc_healthcare_001', 'fidc', false, 'draft',
  'Healthcare Receivables Fund I',
  'Senior tranche of a diversified healthcare receivables FIDC backed by hospital and clinic payment flows. Conservative structure with 25% junior subordination and NDF hedging on USD/BRL exposure.',
  'healthcare_receivables', 'senior', 'usd_hedged',
  12.5, 'percent_pa', true,
  1.5, 12, 'months',
  30, 'Monthly',
  0.25, 'Junior tranche (25%) absorbs first losses before senior holders are impacted',
  50000, 60000000, 10000000,
  false,
  'ndf', 'Systematic NDFs rolling quarterly on USD/BRL', 1.0, 'Banco Itau', 120, 'Quarterly',
  'BB', 0.05, 'cerc',
  '12.345.678/0001-01',
  1, 'GAN8FMweFeu2LFNFarggHifiUW8muyGJK8S2dGc6vCTP'
);
