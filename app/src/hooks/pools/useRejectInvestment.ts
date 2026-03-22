import { useSolanaTransaction } from "./useSolanaTransaction";

/**
 * Manager hook: reject a pending investment request.
 * Returns locked USDC to the investor (§4.5 reject_deposit).
 */
export function useRejectInvestment(poolId: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();

  const rejectInvestment = async (
    investorAddress: string,
    reasonCode: number,
  ) => {
    return signAndSend(
      `/pools/${poolId}/invest/reject/build-tx`,
      { investorAddress, reasonCode },
      {
        successEvent: "investment.rejected",
        successMessage:
          "Investment request rejected — USDC returned to investor.",
        invalidateKeys: [
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["investment-requests", poolId],
          ["investment-requests"],
        ],
      },
    );
  };

  return { rejectInvestment, status, isLoading };
}
