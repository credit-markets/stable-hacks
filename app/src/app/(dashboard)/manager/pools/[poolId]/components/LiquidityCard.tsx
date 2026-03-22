"use client";

import { cx, styles } from "@/lib/styleClasses";
import { getPoolTokenSymbol } from "@/lib/utils/tvl";
import type { Pool } from "@/services/api";

interface LiquidityCardProps {
  pool: Pool;
}

function formatTokenAmount(value: number, symbol: string): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value / 1_000_000)} ${symbol}`;
}

export function LiquidityCard({ pool }: LiquidityCardProps) {
  const rawVaultBalance = Number(pool.onChainData?.depositVaultBalance ?? 0);
  const pendingDeposits = Number(pool.onChainData?.totalPendingDeposits ?? 0);
  const tokenSymbol = getPoolTokenSymbol(pool.currency, pool.asset_mint);

  // Subtract pending deposits — funds are in the vault but not yet claimed/finalized
  const effectiveBalance = Math.max(0, rawVaultBalance - pendingDeposits);
  const vaultBalanceDisplay =
    pool.onChainData?.depositVaultBalance != null
      ? formatTokenAmount(effectiveBalance, tokenSymbol)
      : "---";

  const borrowedDisplay =
    pool.totalBorrowed != null
      ? formatTokenAmount(Number(pool.totalBorrowed), tokenSymbol)
      : "---";

  const repaidDisplay =
    pool.totalRepaid != null
      ? formatTokenAmount(Number(pool.totalRepaid), tokenSymbol)
      : "---";

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <span className={cx(styles.labelPrimary, "mb-3 block")}>LIQUIDITY</span>

      <div className="grid grid-cols-3">
        {/* Vault Balance */}
        <div className="pr-4">
          <span className={cx(styles.labelPrimary, "block mb-1")}>
            VAULT BALANCE
          </span>
          <span className={cx(styles.valueLg, "block")}>
            {vaultBalanceDisplay}
          </span>
          <span className={cx(styles.bodySm, "text-text-muted block mt-1")}>
            Available in deposit vault
          </span>
        </div>

        {/* Borrowed */}
        <div className="px-4 border-l border-subtle">
          <span className={cx(styles.labelPrimary, "block mb-1")}>
            BORROWED
          </span>
          <span className={cx(styles.valueLg, "block")}>{borrowedDisplay}</span>
          <span className={cx(styles.bodySm, "text-text-muted block mt-1")}>
            Total drawn from vault
          </span>
        </div>

        {/* Repaid */}
        <div className="pl-4 border-l border-subtle">
          <span className={cx(styles.labelPrimary, "block mb-1")}>REPAID</span>
          <span className={cx(styles.valueLg, "block")}>{repaidDisplay}</span>
          <span className={cx(styles.bodySm, "text-text-muted block mt-1")}>
            Total returned to vault
          </span>
        </div>
      </div>
    </div>
  );
}
