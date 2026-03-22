import { useSolanaTransaction } from "./useSolanaTransaction";

/**
 * Manager hook: open the investment window for a pool.
 */
export function useOpenWindow(poolId: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();

  const openWindow = async () => {
    return signAndSend(
      `/pools/${poolId}/open-window/build-tx`,
      {},
      {
        successEvent: "pool.investment_window_opened",
        successMessage: "Investment window opened.",
        invalidateKeys: [
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["investor-balance-states", poolId],
          ["investment-requests", poolId],
          ["redemption-requests", poolId],
        ],
      },
    );
  };

  return { openWindow, status, isLoading };
}
