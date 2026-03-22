/**
 * Determine if pool should show "Expected Yield" vs "Yield to date".
 * Pools with funded assets (totalAssets > 0, window closed) show "Yield to date".
 * Everything else shows "Expected Yield".
 */
export function shouldShowExpectedYield(pool: {
  onChainData?: {
    totalAssets?: string | number;
    investmentWindowOpen?: boolean;
  } | null;
}): boolean {
  const totalAssets = Number(pool.onChainData?.totalAssets ?? 0);
  const windowOpen = pool.onChainData?.investmentWindowOpen ?? true;

  // Yield to date only when funded and window closed
  if (totalAssets > 0 && !windowOpen) return false;

  return true;
}
