/**
 * Derive a display token symbol from a pool's currency field or asset_mint.
 * Use this instead of hardcoding "$" across the UI.
 *
 * @param currency - pool.currency field ("usdc" | "brl" | "usd_hedged")
 * @param assetMint - optional pool.asset_mint for more precise lookup
 */
export function getPoolTokenSymbol(
  currency?: string,
  assetMint?: string | null,
): string {
  // If we have an asset mint we can do a precise lookup via the frontend token registry.
  // For now, derive from the currency field which is always present.
  if (!currency) return "USDC";
  switch (currency.toLowerCase()) {
    case "usdc":
      return "USDC";
    case "brl":
      return "BRL";
    case "usd_hedged":
      return "USDC";
    default:
      return currency.toUpperCase();
  }
}

/**
 * Calculate TVL for a pool using the standardized formula:
 * TVL = totalShares × pricePerShare / 1e6
 *
 * @param totalShares - raw u64 shares from on-chain state
 * @param pricePerShare - normalized decimal from DB (e.g., 1.05)
 * @returns TVL in USD, or null if inputs unavailable
 */
export function calculatePoolTvl(
  totalShares: number | string | null | undefined,
  pricePerShare: number | string | null | undefined,
): number | null {
  if (totalShares == null || pricePerShare == null) return null;
  const shares = Number(totalShares);
  const price = Number(pricePerShare);
  if (shares === 0 || price === 0) return null;
  return (shares * price) / 1e6;
}

/**
 * Format TVL as a display string with token symbol.
 *
 * @param tvl - computed TVL value
 * @param symbol - token symbol (e.g. "USDC"). Defaults to "USDC".
 */
export function formatTvlDisplay(tvl: number | null, symbol = "USDC"): string {
  if (tvl == null) return `0.00 ${symbol}`;
  return `${tvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

/**
 * Format TVL with compact notation for large values (admin tables).
 *
 * @param tvl - computed TVL value
 * @param symbol - token symbol (e.g. "USDC"). Defaults to "USDC".
 */
export function formatTvlCompact(tvl: number | null, symbol = "USDC"): string {
  if (tvl == null) return "\u2014";
  if (tvl >= 1_000_000) return `${(tvl / 1_000_000).toFixed(2)}M ${symbol}`;
  if (tvl >= 1_000) return `${(tvl / 1_000).toFixed(1)}K ${symbol}`;
  return `${tvl.toFixed(2)} ${symbol}`;
}
