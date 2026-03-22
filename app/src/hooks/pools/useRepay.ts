import { getTokenMeta } from "@/config/solana";
import { useSolanaTransaction } from "./useSolanaTransaction";

export function useRepay(poolId: string, assetMint?: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();
  const token = getTokenMeta(assetMint ?? "");

  const repay = async (amount: number) => {
    return signAndSend(
      `/pools/${poolId}/repay/build-tx`,
      { amount: Math.round(amount * 10 ** token.decimals) },
      {
        successEvent: "pool.repayment",
        successMessage: "Funds repaid to vault.",
        invalidateKeys: [
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["investor-balance-states", poolId],
          ["portfolio-transactions"],
        ],
      },
    );
  };

  return { repay, status, isLoading };
}
