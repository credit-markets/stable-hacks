"use client";

import { cx, styles } from "@/lib/styleClasses";

export type ChipStatus =
  // Pool deployment state
  | "deployed"
  | "not_deployed"
  // Investment window state
  | "open"
  | "closed"
  // Investment execution states
  | "requested"
  | "pending_manager_approval"
  | "approved"
  | "settling"
  | "settled"
  | "failed"
  // Withdrawal execution states
  | "queued"
  // Receivable states
  | "overdue"
  | "defaulted"
  | "nf_active"
  // General
  | "pending"
  | "active";

interface StatusChipProps {
  status: ChipStatus;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

const chipStyles: Record<ChipStatus, string> = {
  // Pool deployment
  deployed: styles.chipOpen,
  not_deployed: styles.chipClosed,
  // Investment window
  open: styles.chipOpen,
  closed: styles.chipClosed,
  // Investment execution
  requested: styles.chipPending,
  pending_manager_approval: styles.chipPending,
  approved: styles.chipOpen,
  settling: styles.chipOngoing,
  settled: styles.chipFunded,
  failed: styles.chipRejected,
  // Withdrawal
  queued: styles.chipPending,
  // Receivables
  overdue: styles.chipPending,
  defaulted: styles.chipRejected,
  nf_active: styles.chipOpen,
  // General
  pending: styles.chipPending,
  active: styles.chipOngoing,
};

const defaultLabels: Record<ChipStatus, string> = {
  // Pool deployment
  deployed: "Deployed",
  not_deployed: "Not Deployed",
  // Investment window
  open: "Open",
  closed: "Closed",
  // Investment execution
  requested: "Requested",
  pending_manager_approval: "Pending Approval",
  approved: "Approved",
  settling: "Settling",
  settled: "Settled",
  failed: "Failed",
  // Withdrawal
  queued: "Queued",
  // Receivables
  overdue: "Overdue",
  defaulted: "Defaulted",
  nf_active: "Active",
  // General
  pending: "Pending",
  active: "Active",
};

export function StatusChip({
  status,
  label,
  className,
  size = "md",
}: StatusChipProps) {
  const displayLabel = label ?? defaultLabels[status] ?? status;
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "";

  return (
    <span
      className={cx(
        styles.chipBase,
        chipStyles[status],
        sizeClasses,
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}

/**
 * Map investment execution states to chip status.
 */
export function getChipStatusFromInvestmentState(state: string): ChipStatus {
  const mapping: Record<string, ChipStatus> = {
    requested: "requested",
    pending_manager_approval: "pending_manager_approval",
    approved: "approved",
    settling: "settling",
    settled: "settled",
    failed: "failed",
  };

  return mapping[state?.toLowerCase()] ?? "pending";
}

export function getChipStatusFromReceivable(status: string): ChipStatus {
  const mapping: Record<string, ChipStatus> = {
    active: "nf_active",
    settled: "settled",
    overdue: "overdue",
    defaulted: "defaulted",
  };
  return mapping[status?.toLowerCase()] ?? "pending";
}
