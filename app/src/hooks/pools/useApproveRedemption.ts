import { useSolanaTransaction } from "./useSolanaTransaction";

/**
 * Manager hook: approve a pending redemption request.
 * Burns shares and returns USDC to the investor (§4.6 approve_redemption).
 */
export function useApproveRedemption(poolId: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();

  const approveRedemption = async (investorAddress: string) => {
    return signAndSend(
      `/pools/${poolId}/redeem/approve/build-tx`,
      { investorAddress },
      {
        successEvent: "withdrawal.settled",
        successMessage: "Redemption approved — USDC returned to investor.",
        invalidateKeys: [
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["redemption-requests", poolId],
        ],
      },
    );
  };

  return { approveRedemption, status, isLoading };
}
