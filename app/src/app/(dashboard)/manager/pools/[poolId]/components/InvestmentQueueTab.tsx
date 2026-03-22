"use client";

import { Shimmer } from "@/components/ui/skeletons";
import { useApproveInvestment } from "@/hooks/pools/useApproveInvestment";
import {
  type InvestmentRequest,
  useInvestmentRequests,
} from "@/hooks/pools/useInvestmentRequests";
import { useRejectInvestment } from "@/hooks/pools/useRejectInvestment";
import { cx, styles } from "@/lib/styleClasses";
import { formatAddress } from "@/utils/formatAddress";
import { Button } from "@nextui-org/button";
import { format } from "date-fns";

interface InvestmentQueueTabProps {
  poolId: string;
  tokenSymbol: string;
}

function isPending(latestEvent: string): boolean {
  return latestEvent === "investment.requested";
}

function RequestRow({
  request,
  poolId,
  tokenSymbol,
}: {
  request: InvestmentRequest;
  poolId: string;
  tokenSymbol: string;
}) {
  const { approveInvestment, isLoading: isApproving } =
    useApproveInvestment(poolId);
  const { rejectInvestment, isLoading: isRejecting } =
    useRejectInvestment(poolId);

  const pending = isPending(request.latestEvent);
  const actionDisabled = isApproving || isRejecting;

  return (
    <tr className="border-b border-border-default/30 hover:bg-surface-hover transition-colors">
      <td className="py-3 px-4">
        <span className="font-mono text-xs">
          {formatAddress(request.investorAddress)}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={styles.valueSm}>
          {`${request.amount.toLocaleString()} ${tokenSymbol}`}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={styles.bodySm}>
          {format(new Date(request.createdAt), "MMM dd, yyyy")}
        </span>
      </td>
      <td className="py-3 px-4">
        <span
          className={cx(
            styles.chipBase,
            pending ? styles.chipPending : styles.chipOpen,
            "text-[9px]",
          )}
        >
          {pending ? "Pending" : request.latestEvent.split(".")[1]}
        </span>
      </td>
      <td className="py-3 px-4">
        {pending ? (
          <div className="flex items-center gap-2">
            <Button
              className={cx(
                styles.btnBase,
                styles.btnPrimary,
                "px-3 py-1 text-xs",
              )}
              size="sm"
              isDisabled={actionDisabled}
              isLoading={isApproving}
              onPress={() => approveInvestment(request.investorAddress)}
            >
              Approve
            </Button>
            <Button
              className={cx(
                styles.btnBase,
                styles.btnSecondary,
                "px-3 py-1 text-xs",
              )}
              size="sm"
              isDisabled={actionDisabled}
              isLoading={isRejecting}
              onPress={() => rejectInvestment(request.investorAddress, 0)}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">&mdash;</span>
        )}
      </td>
    </tr>
  );
}

export function InvestmentQueueTab({
  poolId,
  tokenSymbol,
}: InvestmentQueueTabProps) {
  const { data: requests, isLoading } = useInvestmentRequests(poolId);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Shimmer size="textSm" className="w-full" />
        <Shimmer size="textSm" className="w-full" />
        <Shimmer size="textSm" className="w-3/4" />
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div className="p-8 text-center">
        <p className={styles.bodyMd}>No pending investment requests.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse"
        aria-label="Investment requests"
      >
        <thead>
          <tr className="border-b border-border-default">
            <th className={cx(styles.labelPrimary, "py-3 px-4 text-left")}>
              Investor
            </th>
            <th className={cx(styles.labelPrimary, "py-3 px-4 text-left")}>
              Amount
            </th>
            <th className={cx(styles.labelPrimary, "py-3 px-4 text-left")}>
              Date
            </th>
            <th className={cx(styles.labelPrimary, "py-3 px-4 text-left")}>
              Status
            </th>
            <th className={cx(styles.labelPrimary, "py-3 px-4 text-left")}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <RequestRow
              key={req.correlationId}
              request={req}
              poolId={poolId}
              tokenSymbol={tokenSymbol}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
