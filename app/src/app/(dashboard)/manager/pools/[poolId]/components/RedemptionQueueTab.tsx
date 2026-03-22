"use client";

import { Shimmer } from "@/components/ui/skeletons";
import { useApproveRedemption } from "@/hooks/pools/useApproveRedemption";
import {
  type RedemptionRequest,
  useRedemptionRequests,
} from "@/hooks/useRedemptionRequests";
import { cx, styles } from "@/lib/styleClasses";
import { formatAddress } from "@/utils/formatAddress";
import { Button } from "@nextui-org/button";
import { format } from "date-fns";

interface RedemptionQueueTabProps {
  poolId: string;
}

function RequestRow({
  request,
  poolId,
}: {
  request: RedemptionRequest;
  poolId: string;
}) {
  const { approveRedemption, isLoading: isApproving } =
    useApproveRedemption(poolId);

  const pending = request.latestEvent === "withdrawal.requested";

  return (
    <tr className="border-b border-border-default/30 hover:bg-surface-hover transition-colors">
      <td className="py-3 px-4">
        <span className="font-mono text-xs">
          {formatAddress(request.investorAddress)}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={styles.valueSm}>
          {request.shares.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })}
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
          <Button
            className={cx(
              styles.btnBase,
              styles.btnPrimary,
              "px-3 py-1 text-xs",
            )}
            size="sm"
            isDisabled={isApproving}
            isLoading={isApproving}
            onPress={() => approveRedemption(request.investorAddress)}
          >
            Approve
          </Button>
        ) : (
          <span className="text-text-muted">&mdash;</span>
        )}
      </td>
    </tr>
  );
}

export function RedemptionQueueTab({ poolId }: RedemptionQueueTabProps) {
  const { data: requests, isLoading } = useRedemptionRequests(poolId);

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
        <p className={styles.bodyMd}>No pending redemption requests.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse"
        aria-label="Redemption requests"
      >
        <thead>
          <tr className="border-b border-border-default">
            <th className={cx(styles.labelPrimary, "py-3 px-4 text-left")}>
              Investor
            </th>
            <th className={cx(styles.labelPrimary, "py-3 px-4 text-left")}>
              Shares
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
            <RequestRow key={req.correlationId} request={req} poolId={poolId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
