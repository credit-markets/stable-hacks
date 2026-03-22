export interface NotaFiscalItem {
  id: string;
  pool_id: string;
  pipeline_key: string;
  cedente: string;
  sacado: string;
  valor_aquisicao: number;
  valor_nominal: number;
  valor_pago: number | null;
  data_emissao: string;
  data_vencimento: string;
  taxa_desconto: number | null;
  status: "active" | "settled" | "overdue" | "defaulted";
  external_id: string | null;
  created_at: string;
}

export interface NotaFiscalAggregates {
  total_items: number;
  total_face_value: number;
  total_acquisition_value: number;
  avg_discount_rate: number;
  effective_yield: number;
  maturity_distribution: {
    within_30d: number;
    within_60d: number;
    within_90d: number;
    beyond_90d: number;
  };
  status_breakdown: Record<string, number>;
}

export interface NotaFiscalItemsResponse {
  data: NotaFiscalItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
