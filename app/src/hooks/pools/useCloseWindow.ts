import { useSolanaTransaction } from "./useSolanaTransaction";

/**
 * Manager hook: close the investment window for a pool.
 */
export function useCloseWindow(poolId: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();

  const closeWindow = async () => {
    return signAndSend(
      `/pools/${poolId}/close-window/build-tx`,
      {},
      {
        successEvent: "pool.investment_window_closed",
        successMessage: "Investment window closed.",
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

  return { closeWindow, status, isLoading };
}
