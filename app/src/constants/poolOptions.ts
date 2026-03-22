export const OFFER_TYPES = [
  { value: "Bond", label: "Bond" },
  { value: "Loan", label: "Loan" },
  { value: "Equity", label: "Equity" },
  { value: "Credit Line", label: "Credit Line" },
  { value: "Real Estate", label: "Real Estate" },
];

export const PRODUCT_TYPES = [
  { value: "DeFi Credit", label: "DeFi Credit" },
  { value: "Structured Product", label: "Structured Product" },
  { value: "Real World Asset", label: "Real World Asset" },
  { value: "Tokenized Security", label: "Tokenized Security" },
];

import { getUsdcMint } from "@/config/solana";

// Supported asset mints — addresses from solana config (mirrors backend solana-config)
export const SUPPORTED_MINTS = [
  {
    symbol: "USDC",
    address: getUsdcMint(),
    decimals: 6,
    icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
];
