/**
 * Risk metric definitions for platform tooltips.
 * Served via GET /risk/definitions (public, no auth).
 * Each key matches a column name in risk_fidc_scores, risk_fidc_monthly,
 * risk_tidc_scores, or risk_tidc_monthly tables.
 */
export const RISK_METRIC_DEFINITIONS: Record<
  string,
  { label: string; description: string; goodRange?: string; source?: string }
> = {
  score_risco: {
    label: 'Risk Score',
    description:
      "Percentile rank of the fund's predicted credit deterioration within its behavioral cluster. Based on a 7-model ensemble validated with rolling out-of-sample testing. Lower is better.",
    goodRange: '< 25 (Baixo)',
    source: 'CM Risk Model v1.0',
  },
  faixa_risco: {
    label: 'Risk Classification',
    description:
      "Five-tier risk label derived from the fund's risk score percentile within its cluster. Validated against senior quota rentability and default discrimination tests.",
    goodRange: 'Baixo or Moderado',
    source: 'CM Risk Model v1.0',
  },
  pdd_ratio: {
    label: 'PDD Ratio',
    description:
      'Provisions for expected credit loss (PDD) as a share of the total credit portfolio. Measures how much of the portfolio is covered by loss provisions. Reported monthly to CVM.',
    goodRange: '< 1%',
    source: 'CVM Informes Mensais, Tab I',
  },
  pdd_prevista_ensemble: {
    label: 'Predicted PDD',
    description:
      'Forward-looking PDD forecast from the ensemble model at the 1-month horizon. Compares predicted future provisions against current provisions to detect early deterioration.',
    goodRange: 'Close to or below current PDD',
    source: 'CM Risk Model — ensemble prediction',
  },
  delta_pdd: {
    label: 'PDD Delta (\u0394)',
    description:
      'Difference between predicted PDD and current PDD. Positive values indicate the model expects provisions to increase (potential deterioration). Negative values suggest improvement.',
    goodRange: '\u2264 0 (stable or improving)',
    source: 'CM Risk Model',
  },
  confidence_tier: {
    label: 'Confidence Tier',
    description:
      'How much validated data backs the risk score. Tier 1: rolling out-of-sample validated (highest). Tier 2: 12-23 months history. Tier 3: 3-11 months. Tier 4: extrapolated (<3 months).',
    goodRange: 'Tier 1 or 2',
    source: 'CM Risk Model — quality assessment',
  },
  inad_early_ratio: {
    label: 'Early Delinquency',
    description:
      'Share of receivables in the earliest overdue bucket. For FIDC: up to 90 days past due (sum of 0-30d + 30-60d + 60-90d CVM buckets). For TIDC: 1-30 days past due (shorter tenor receivables). The earliest warning signal in the delinquency pipeline.',
    goodRange: '< 2%',
    source: 'CVM Tab V+VI (FIDC) / Loan Tape (TIDC)',
  },
  inad_mid_ratio: {
    label: 'Mid Delinquency',
    description:
      'Share of receivables in the mid-stage overdue bucket. For FIDC: 120-180 days past due (sum of 120d + 150d + 180d CVM buckets). For TIDC: 30-90 days past due. Receivables at this stage have a higher probability of progressing to default.',
    goodRange: '< 1%',
    source: 'CVM Tab V+VI (FIDC) / Loan Tape (TIDC)',
  },
  inad_severe_ratio: {
    label: 'Severe Delinquency',
    description:
      'Share of receivables in the most severe overdue bucket. For FIDC: >360 days past due (sum of 360d + 720d + 1080d + >1080d CVM buckets). For TIDC: >90 days past due. Direct precursor to write-off.',
    goodRange: '< 0.5%',
    source: 'CVM Tab V+VI (FIDC) / Loan Tape (TIDC)',
  },
  default_stock_ratio: {
    label: 'Default Rate',
    description:
      'Stock of defaulted receivables as a share of the total credit portfolio. Measures established defaults that have not yet been written off or recovered.',
    goodRange: '< 3%',
    source: 'CVM Tab I (FIDC) / Loan Tape (TIDC)',
  },
  subordination_ratio: {
    label: 'Subordination',
    description:
      "Percentage of the fund's total AUM held in junior/mezzanine tranches, which absorb losses before senior holders are impacted. Higher subordination means more protection for senior investors.",
    goodRange: '> 20%',
    source: 'CVM Tab X_2 — share class AUM',
  },
  leverage_ratio: {
    label: 'Leverage Ratio',
    description:
      'Total liabilities divided by net equity (PL). Measures how much the fund relies on borrowed capital. High leverage amplifies both gains and losses.',
    goodRange: '< 1.0x',
    source: 'CVM Tab III + Tab IV',
  },
  liquidity_ratio: {
    label: 'Liquidity Buffer',
    description:
      "Cash and liquid assets as a share of total assets. Measures the fund's ability to meet redemption requests and absorb short-term shocks without forced selling.",
    goodRange: '> 5%',
    source: 'CVM Tab I',
  },
  recompra_ratio: {
    label: 'Buyback Rate',
    description:
      'Value of receivables repurchased by the originator as a share of the credit portfolio. High buyback rates can indicate the originator is masking credit quality problems.',
    goodRange: '< 5%',
    source: 'CVM Tab VII',
  },
  wal_years: {
    label: 'Weighted Average Life',
    description:
      "Average remaining time to maturity of the portfolio's receivables, weighted by value. Shorter WAL means faster cash flow turnover and lower duration risk.",
    goodRange: 'Depends on strategy',
    source: 'CVM Tab V — maturity buckets',
  },
  senior_return_mes: {
    label: 'Monthly Return',
    description:
      'Net return of the senior quota for the reference month. Reported to CVM as the percentage change in senior share value.',
    goodRange: '> CDI monthly equivalent',
    source: 'CVM Tab X_3',
  },
  mean_rentab: {
    label: 'Avg. Net Return (Ann.)',
    description:
      "Average monthly net return of the senior quota over the fund's full track record, annualized (monthly avg \u00d7 12). Reflects actual realized performance after fees.",
    goodRange: '> CDI + spread',
    source: 'CVM Tab X_3 — full history average',
  },
  collection_rate: {
    label: 'Collection Rate',
    description:
      'Percentage of matured receivables that were successfully collected. The primary performance metric for TIDC funds — measures how reliably sacados (payers) fulfill their obligations.',
    goodRange: '> 90%',
    source: 'Loan Tape — settled items / matured items',
  },
  effective_yield: {
    label: 'Effective Yield',
    description:
      'Portfolio yield derived from the discount between acquisition value and face value of receivables. Represents the gross return before defaults and operating costs.',
    goodRange: 'Depends on risk profile',
    source: 'Loan Tape — (face - acquisition) / acquisition',
  },
  sacado_top5_pct: {
    label: 'Sacado Top 5 Concentration',
    description:
      "Share of portfolio value concentrated in the top 5 sacados (payers). High concentration means the fund's performance depends heavily on a few counterparties.",
    goodRange: '< 40%',
    source: 'Loan Tape — sacado value distribution',
  },
  cedente_top5_pct: {
    label: 'Cedente Top 5 Concentration',
    description:
      'Share of portfolio value concentrated in the top 5 cedentes (originators/suppliers). High concentration indicates origination dependency.',
    goodRange: '< 40%',
    source: 'Loan Tape — cedente value distribution',
  },
};
