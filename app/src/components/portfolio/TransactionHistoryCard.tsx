"use client";

import { PaginationNav } from "@/components/PaginationNav";
import { usePortfolioTransactions } from "@/hooks/usePortfolioTransactions";
import { cx, styles } from "@/lib/styleClasses";
import { EXPLORER_URL } from "@/utils/constants";
import { Link } from "@nextui-org/link";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 10;

function truncateTxId(txId: string): string {
  if (txId.length <= 10) return txId;
  return `${txId.slice(0, 6)}...${txId.slice(-4)}`;
}

const EVENT_LABELS: Record<string, string> = {
  "investment.requested": "Request",
  "investment.settled": "Approve",
  "investment.claimed": "Claim",
  "investment.rejected": "Reject",
  "investment.cancelled": "Cancel",
  "withdrawal.requested": "Request",
  "withdrawal.settled": "Approve",
  "withdrawal.claimed": "Claim",
  "withdrawal.cancelled": "Cancel",
};

function getEventChipStyle(eventType: string): string {
  const stage = eventType.split(".")[1];
  switch (stage) {
    case "settled":
    case "claimed":
      return styles.chipOpen;
    case "requested":
      return styles.chipPending;
    case "rejected":
    case "cancelled":
      return styles.chipRejected;
    default:
      return styles.chipPending;
  }
}

export function TransactionHistoryCard() {
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = usePortfolioTransactions(
    page,
    PAGE_SIZE,
  );

  const transactions = response?.data ?? [];
  const total = response?.total ?? 0;
  const isEmpty = !isLoading && transactions.length === 0;

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <h3 className={cx(styles.headingSm, "mb-4")}>Transaction History</h3>

      {isEmpty ? (
        <div className="p-8 text-center">
          <p className={styles.bodySm}>No transactions yet.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse"
              aria-label="Transaction history"
            >
              <thead>
                <tr className="border-b border-border-default">
                  <th className={cx(styles.tableHeader, "py-2 px-3 text-left")}>
                    Type
                  </th>
                  <th className={cx(styles.tableHeader, "py-2 px-3 text-left")}>
                    Pool
                  </th>
                  <th
                    className={cx(styles.tableHeader, "py-2 px-3 text-right")}
                  >
                    Amount
                  </th>
                  <th
                    className={cx(styles.tableHeader, "py-2 px-3 text-right")}
                  >
                    Date
                  </th>
                  <th
                    className={cx(styles.tableHeader, "py-2 px-3 text-right")}
                  >
                    Tx
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? null
                  : transactions.map((tx) => {
                      const isInvest = tx.eventType.includes("investment");
                      const label = EVENT_LABELS[tx.eventType] ?? tx.eventType;
                      const chipStyle = getEventChipStyle(tx.eventType);
                      const amountStr = isInvest
                        ? `${(tx.amount ?? 0).toLocaleString()} ${tx.tokenSymbol}`
                        : `${(tx.shares ?? 0).toLocaleString()} shares`;

                      return (
                        <tr
                          key={tx.id}
                          className="border-b border-border-default/20 hover:bg-surface-hover transition-colors"
                        >
                          <td className="py-2 px-3">
                            <span className={cx(styles.chipBase, chipStyle)}>
                              {label}
                            </span>
                          </td>
                          <td className="py-2 px-3 max-w-[200px]">
                            <span
                              className={cx(
                                styles.tableCellMuted,
                                "block truncate",
                              )}
                              title={tx.poolTitle}
                            >
                              {tx.poolTitle}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <span className={styles.tableCellValue}>
                              {amountStr}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <span className={styles.tableCellMuted}>
                              {format(new Date(tx.createdAt), "dd/MM/yy")}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {tx.chainTxId ? (
                              <Link
                                href={`${EXPLORER_URL}/tx/${tx.chainTxId}`}
                                className="font-mono text-xs hover:underline"
                                isExternal
                              >
                                <ExternalLink className="w-3 h-3 mr-1 inline" />
                                {truncateTxId(tx.chainTxId)}
                              </Link>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {total > PAGE_SIZE && (
            <PaginationNav
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              itemText="transactions"
            />
          )}
        </>
      )}
    </div>
  );
}
