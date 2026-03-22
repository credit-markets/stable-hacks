import { SHARE_DECIMALS } from "@/config/solana";
import { useSolanaTransaction } from "./useSolanaTransaction";

export function useRedeem(poolId: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();

  const requestRedeem = async (shares: number) => {
    return signAndSend(
      `/pools/${poolId}/redeem/build-tx`,
      { shares: Math.round(shares * 10 ** SHARE_DECIMALS) },
      {
        successEvent: "withdrawal.requested",
        successMessage: "Redemption request submitted!",
        invalidateKeys: [
          ["pool", poolId],
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["redemption-requests", poolId],
          ["investor-balance-states", poolId],
          ["my-redemption-requests"],
        ],
      },
    );
  };

  const claimRedemption = async () => {
    return signAndSend(
      `/pools/${poolId}/redeem/claim/build-tx`,
      {},
      {
        successEvent: "withdrawal.claimed",
        successMessage: "Claimed successfully!",
        invalidateKeys: [
          ["pool", poolId],
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["redemption-requests", poolId],
          ["investor-balance-states", poolId],
          ["my-redemption-requests"],
          ["portfolio-transactions"],
        ],
      },
    );
  };

  const cancelRedeem = async () => {
    return signAndSend(
      `/pools/${poolId}/redeem/cancel/build-tx`,
      {},
      {
        successEvent: "withdrawal.cancelled",
        successMessage: "Redemption request cancelled. Shares returned.",
        invalidateKeys: [
          ["pool", poolId],
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["redemption-requests", poolId],
          ["investor-balance-states", poolId],
          ["my-redemption-requests"],
        ],
      },
    );
  };

  return { requestRedeem, claimRedemption, cancelRedeem, status, isLoading };
}
