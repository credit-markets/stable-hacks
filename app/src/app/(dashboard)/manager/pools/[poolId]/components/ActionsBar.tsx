"use client";

import { useCloseWindow } from "@/hooks/pools/useCloseWindow";
import { useDrawDown } from "@/hooks/pools/useDrawDown";
import { useInvestorBalanceStates } from "@/hooks/pools/useInvestorBalanceStates";
import { useOpenWindow } from "@/hooks/pools/useOpenWindow";
import { useRepay } from "@/hooks/pools/useRepay";
import { cx, styles } from "@/lib/styleClasses";
import { getPoolTokenSymbol } from "@/lib/utils/tvl";
import type { Pool } from "@/services/api";
import { Button } from "@nextui-org/button";
import { useState } from "react";
import { AmountInputModal } from "./AmountInputModal";

interface ActionsBarProps {
  pool: Pool;
  poolId: string;
}

export function ActionsBar({ pool, poolId }: ActionsBarProps) {
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [repayModalOpen, setRepayModalOpen] = useState(false);

  const { openWindow, isLoading: isOpeningWindow } = useOpenWindow(poolId);
  const { closeWindow, isLoading: isClosingWindow } = useCloseWindow(poolId);
  const { drawDown, isLoading: isDrawingDown } = useDrawDown(
    poolId,
    pool.asset_mint,
  );
  const { repay, isLoading: isRepaying } = useRepay(poolId, pool.asset_mint);
  const { data: balanceStates } = useInvestorBalanceStates(poolId);

  const tokenSymbol = getPoolTokenSymbol(pool.currency, pool.asset_mint);
  const isWindowOpen = pool.investment_window_open ?? false;
  const anyLoading =
    isOpeningWindow || isClosingWindow || isDrawingDown || isRepaying;

  // Vault balance available to borrow (minus pending deposits not yet claimed)
  const vaultBalance =
    pool.onChainData?.depositVaultBalance != null
      ? Math.max(
          0,
          (Number(pool.onChainData.depositVaultBalance) -
            Number(pool.onChainData.totalPendingDeposits ?? 0)) /
            1_000_000,
        )
      : undefined;

  // Manager's USDC wallet balance for repay
  const walletUsdcBalance =
    balanceStates?.usdcBalance != null
      ? Number(balanceStates.usdcBalance) / 1_000_000
      : undefined;

  const handleWindowToggle = () => {
    if (isWindowOpen) {
      closeWindow();
    } else {
      openWindow();
    }
  };

  return (
    <>
      <div className={cx(styles.card, "px-6 py-4")}>
        <div className="flex items-center justify-between">
          <span className={styles.labelPrimary}>ACTIONS</span>

          <div className="flex items-center gap-2">
            <Button
              className={cx(styles.btnBase, styles.btnPrimary, styles.btnMd)}
              isDisabled={anyLoading}
              isLoading={isOpeningWindow || isClosingWindow}
              onPress={handleWindowToggle}
            >
              {isWindowOpen ? "Close Window" : "Open Window"}
            </Button>

            <Button
              className={cx(styles.btnBase, styles.btnSecondary, styles.btnMd)}
              isDisabled={anyLoading && !isDrawingDown}
              isLoading={isDrawingDown}
              onPress={() => setBorrowModalOpen(true)}
            >
              Borrow
            </Button>

            <Button
              className={cx(styles.btnBase, styles.btnSecondary, styles.btnMd)}
              isDisabled={anyLoading && !isRepaying}
              isLoading={isRepaying}
              onPress={() => setRepayModalOpen(true)}
            >
              Repay
            </Button>
          </div>
        </div>
      </div>

      <AmountInputModal
        isOpen={borrowModalOpen}
        onClose={() => setBorrowModalOpen(false)}
        onConfirm={(amount) => drawDown(amount)}
        title="Borrow from Vault"
        isLoading={isDrawingDown}
        maxAmount={vaultBalance}
        balanceLabel="Vault Balance"
        tokenSymbol={tokenSymbol}
      />

      <AmountInputModal
        isOpen={repayModalOpen}
        onClose={() => setRepayModalOpen(false)}
        onConfirm={(amount) => repay(amount)}
        title="Repay to Vault"
        isLoading={isRepaying}
        maxAmount={walletUsdcBalance}
        balanceLabel="Wallet Balance"
        tokenSymbol={tokenSymbol}
      />
    </>
  );
}
