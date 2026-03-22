import { getTokenMeta } from "@/config/solana";
import { useSolanaTransaction } from "./useSolanaTransaction";

export function useDrawDown(poolId: string, assetMint?: string) {
  const { signAndSend, status, isLoading } = useSolanaTransaction();
  const token = getTokenMeta(assetMint ?? "");

  const drawDown = async (amount: number) => {
    return signAndSend(
      `/pools/${poolId}/draw-down/build-tx`,
      { amount: Math.round(amount * 10 ** token.decimals) },
      {
        successEvent: "pool.draw_down",
        successMessage: "Funds borrowed from vault.",
        invalidateKeys: [
          ["pool-manager", poolId],
          ["pools"],
          ["manager-pools"],
          ["investor-balance-states", poolId],
        ],
      },
    );
  };

  return { drawDown, status, isLoading };
}
