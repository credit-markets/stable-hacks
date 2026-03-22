import { getTokenMeta } from "@/config/solana";
import { useSolanaTransaction } from "./useSolanaTransaction";

export function useInvest(poolId: string, assetMint?: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();
  const token = getTokenMeta(assetMint ?? "");

  const requestDeposit = async (amount: number) => {
    return signAndSend(
      `/pools/${poolId}/invest/build-tx`,
      { amount: Math.round(amount * 10 ** token.decimals) },
      {
        successEvent: "investment.requested",
        successMessage: "Investment request submitted!",
        invalidateKeys: [
          ["pool", poolId],
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["investment-requests", poolId],
          ["investor-balance-states", poolId],
          ["my-investment-requests"],
        ],
      },
    );
  };

  const cancelDeposit = async () => {
    return signAndSend(
      `/pools/${poolId}/invest/cancel/build-tx`,
      {},
      {
        successEvent: "investment.cancelled",
        successMessage: "Investment request cancelled.",
        invalidateKeys: [
          ["pool", poolId],
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["investment-requests", poolId],
          ["investor-balance-states", poolId],
          ["my-investment-requests"],
        ],
      },
    );
  };

  const claimDeposit = async () => {
    return signAndSend(
      `/pools/${poolId}/invest/claim/build-tx`,
      {},
      {
        successEvent: "investment.claimed",
        successMessage: "Deposit claimed successfully!",
        invalidateKeys: [
          ["pool", poolId],
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["investment-requests", poolId],
          ["investor-balance-states", poolId],
          ["my-investment-requests"],
          ["portfolio-transactions"],
        ],
      },
    );
  };

  return { requestDeposit, cancelDeposit, claimDeposit, status, isLoading };
}
