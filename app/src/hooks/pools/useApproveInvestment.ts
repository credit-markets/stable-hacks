import { useSolanaTransaction } from "./useSolanaTransaction";

/**
 * Manager hook: approve a pending investment request.
 * Mints shares to the investor (§4.5 approve_deposit).
 */
export function useApproveInvestment(poolId: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();

  const approveInvestment = async (investorAddress: string) => {
    return signAndSend(
      `/pools/${poolId}/invest/approve/build-tx`,
      { investorAddress },
      {
        successEvent: "investment.settled",
        successMessage: "Investment approved — shares minted.",
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

  return { approveInvestment, status, isLoading };
}
