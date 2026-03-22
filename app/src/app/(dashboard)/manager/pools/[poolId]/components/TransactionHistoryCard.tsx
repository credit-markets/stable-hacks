"use client";

import { PaginationNav } from "@/components/PaginationNav";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import type { PoolTransaction } from "@/hooks/pools/usePoolTransactions";
import { usePoolTransactions } from "@/hooks/pools/usePoolTransactions";
import { cx, styles } from "@/lib/styleClasses";
import { EXPLORER_URL } from "@/utils/constants";
import { Link } from "@nextui-org/link";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

interface TransactionHistoryCardProps {
  poolId: string;
}

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  "All Types",
  "Investment",
  "Redemption",
  "Borrow",
] as const;

const EVENT_LABELS: Record<string, string> = {
  "investment.requested": "Deposit Request",
  "investment.settled": "Deposit Approve",
  "investment.claimed": "Deposit Claim",
  "investment.rejected": "Deposit Reject",
  "investment.cancelled": "Deposit Cancel",
  "withdrawal.requested": "Redeem Request",
  "withdrawal.settled": "Redeem Approve",
  "withdrawal.claimed": "Redeem Claim",
  "withdrawal.cancelled": "Redeem Cancel",
  "pool.draw_down": "Borrow",
  "pool.repayment": "Repay",
  "pool.investment_window_opened": "Window Open",
  "pool.investment_window_closed": "Window Close",
};

function getEventChipStyle(eventType: string): string {
  if (eventType.includes("claimed") || eventType.includes("repayment"))
    return styles.chipOpen;
  if (eventType.includes("settled")) return styles.chipOpen;
  if (
    eventType.includes("requested") ||
    eventType.includes("draw_down") ||
    eventType.includes("window")
  )
    return styles.chipPending;
  if (eventType.includes("rejected") || eventType.includes("cancelled"))
    return styles.chipRejected;
  return styles.chipPending;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function truncateTxId(txId: string): string {
  if (txId.length <= 10) return txId;
  return `${txId.slice(0, 6)}...${txId.slice(-4)}`;
}

function TransactionRow({ tx }: { tx: PoolTransaction }) {
  const label = EVENT_LABELS[tx.eventType] ?? tx.eventType;
  const chipStyle = getEventChipStyle(tx.eventType);
  const amountStr =
    tx.amount != null
      ? `${tx.amount.toLocaleString()} ${tx.tokenSymbol}`
      : tx.shares != null
        ? `${tx.shares.toLocaleString()} shares`
        : "—";

  return (
    <tr className="border-b border-border-default/20 hover:bg-surface-hover transition-colors">
      <td className="py-2 px-3">
        <span className={cx(styles.chipBase, chipStyle)}>{label}</span>
      </td>
      <td className="py-2 px-3 text-right whitespace-nowrap">
        <span className={styles.tableCellValue}>{amountStr}</span>
      </td>
      <td className="py-2 px-3 max-w-[140px]">
        <span
          className={cx(
            styles.tableCellMuted,
            "block truncate font-mono text-xs",
          )}
          title={tx.actor}
        >
          {truncateAddress(tx.actor)}
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
}

const selectClasses =
  "bg-surface-hover border border-subtle rounded-md text-sm text-text-primary px-3 py-1.5 focus:outline-none";

export function TransactionHistoryCard({
  poolId,
}: TransactionHistoryCardProps) {
  const [typeFilter, setTypeFilter] = useState<string>("All Types");
  const [page, setPage] = useState(1);

  const {
    data: response,
    isLoading,
    isError,
  } = usePoolTransactions(poolId, page, PAGE_SIZE, typeFilter);

  const transactions = response?.data ?? [];
  const total = response?.total ?? 0;

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={styles.headingSm}>Transaction History</h3>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className={selectClasses}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingOverlay height="md" />
      ) : isError ? (
        <div className="p-8 text-center">
          <p className={styles.bodySm}>Failed to load transaction history.</p>
        </div>
      ) : !transactions.length ? (
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
                  <th
                    className={cx(styles.tableHeader, "py-2 px-3 text-right")}
                  >
                    Amount
                  </th>
                  <th className={cx(styles.tableHeader, "py-2 px-3 text-left")}>
                    Counterparty
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
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
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
