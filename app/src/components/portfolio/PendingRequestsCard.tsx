"use client";

import { useSolanaTransaction } from "@/hooks/pools/useSolanaTransaction";
import { useMyInvestmentRequests } from "@/hooks/useMyInvestmentRequests";
import { useMyRedemptionRequests } from "@/hooks/useMyRedemptionRequests";
import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/react";
import { format } from "date-fns";

interface PendingItem {
  type: "invest" | "redeem";
  poolTitle: string;
  poolId: string;
  amount: string;
  date: string;
  sortDate: number;
  latestEvent: string;
}

export function PendingRequestsCard() {
  const { data: investments, isLoading: investLoading } =
    useMyInvestmentRequests();
  const { data: redemptions, isLoading: redeemLoading } =
    useMyRedemptionRequests();
  const { signAndSend, isLoading: txLoading } = useSolanaTransaction();

  const isLoading = investLoading || redeemLoading;

  const handleCancel = (item: PendingItem) => {
    const url =
      item.type === "invest"
        ? `/pools/${item.poolId}/invest/cancel/build-tx`
        : `/pools/${item.poolId}/redeem/cancel/build-tx`;
    const successEvent =
      item.type === "invest" ? "investment.cancelled" : "withdrawal.cancelled";
    const successMessage =
      item.type === "invest"
        ? "Investment request cancelled."
        : "Redemption request cancelled.";

    signAndSend(
      url,
      {},
      {
        successEvent,
        successMessage,
        invalidateKeys: [
          ["pool", item.poolId],
          ["pool-manager", item.poolId],
          ["pools"],
          ["manager-pools"],
          ["investment-requests", item.poolId],
          ["redemption-requests", item.poolId],
          ["investor-balance-states", item.poolId],
          ["my-investment-requests"],
          ["my-redemption-requests"],
        ],
      },
    );
  };

  const handleClaim = (item: PendingItem) => {
    const url =
      item.type === "invest"
        ? `/pools/${item.poolId}/invest/claim/build-tx`
        : `/pools/${item.poolId}/redeem/claim/build-tx`;
    const successEvent =
      item.type === "invest" ? "investment.claimed" : "withdrawal.claimed";
    const successMessage =
      item.type === "invest"
        ? "Deposit claimed successfully!"
        : "Redemption claimed successfully!";

    signAndSend(
      url,
      {},
      {
        successEvent,
        successMessage,
        invalidateKeys: [
          ["pool", item.poolId],
          ["pool-manager", item.poolId],
          ["pools"],
          ["manager-pools"],
          ["investment-requests", item.poolId],
          ["redemption-requests", item.poolId],
          ["investor-balance-states", item.poolId],
          ["my-investment-requests"],
          ["my-redemption-requests"],
          ["portfolio-transactions"],
        ],
      },
    );
  };

  const items: PendingItem[] = [];

  if (investments) {
    for (const inv of investments) {
      items.push({
        type: "invest",
        poolTitle: inv.poolTitle,
        poolId: inv.poolId,
        amount: `${inv.amount.toLocaleString()} USDC`,
        date: format(new Date(inv.createdAt), "MMM d, yyyy"),
        sortDate: new Date(inv.createdAt).getTime(),
        latestEvent: inv.latestEvent,
      });
    }
  }

  if (redemptions) {
    for (const red of redemptions) {
      items.push({
        type: "redeem",
        poolTitle: red.poolTitle,
        poolId: red.poolId,
        amount: `${red.shares.toLocaleString()} shares`,
        date: format(new Date(red.createdAt), "MMM d, yyyy"),
        sortDate: new Date(red.createdAt).getTime(),
        latestEvent: red.latestEvent,
      });
    }
  }

  items.sort((a, b) => b.sortDate - a.sortDate);

  if (isLoading || items.length === 0) return null;

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className={styles.headingSm}>Active Requests</h3>
        <span className="text-[11px] font-medium text-text-muted bg-surface-hover px-2 py-0.5 rounded">
          {items.length} request{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" aria-label="Active requests">
          <thead>
            <tr className="border-b border-border-default">
              <th className={cx(styles.tableHeader, "py-2 px-3 text-left")}>
                Type
              </th>
              <th className={cx(styles.tableHeader, "py-2 px-3 text-left")}>
                Pool
              </th>
              <th className={cx(styles.tableHeader, "py-2 px-3 text-right")}>
                Amount
              </th>
              <th className={cx(styles.tableHeader, "py-2 px-3 text-right")}>
                Date
              </th>
              <th className={cx(styles.tableHeader, "py-2 px-3 text-right")}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={`pending-${idx}`}
                className="border-b border-border-default/20 hover:bg-surface-hover transition-colors"
              >
                <td className="py-2 px-3">
                  <span
                    className={cx(
                      styles.chipBase,
                      item.type === "invest"
                        ? styles.chipOpen
                        : styles.chipPending,
                    )}
                  >
                    {item.type === "invest" ? "INVEST" : "REDEEM"}
                  </span>
                </td>
                <td className="py-2 px-3 max-w-[200px]">
                  <span
                    className={cx(styles.tableCellMuted, "block truncate")}
                    title={item.poolTitle}
                  >
                    {item.poolTitle}
                  </span>
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <span className={styles.tableCellValue}>{item.amount}</span>
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <span className={styles.tableCellMuted}>{item.date}</span>
                </td>
                <td className="py-2 px-3 text-right">
                  {item.latestEvent === "withdrawal.settled" ||
                  item.latestEvent === "investment.settled" ? (
                    <Button
                      size="sm"
                      radius="md"
                      color="primary"
                      isLoading={txLoading}
                      className="font-medium text-[11px] px-3 py-1 h-auto min-h-0"
                      onPress={() => handleClaim(item)}
                    >
                      Claim
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      radius="md"
                      color="default"
                      variant="bordered"
                      isLoading={txLoading}
                      className="font-medium text-[11px] px-3 py-1 h-auto min-h-0 transition-colors cursor-pointer"
                      onPress={() => handleCancel(item)}
                    >
                      Cancel
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
