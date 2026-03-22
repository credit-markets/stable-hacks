// API Response Types

export interface TokenResponse {
  id: string;
  symbol: string;
  decimals: number;
  address: string;
  icon: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}
