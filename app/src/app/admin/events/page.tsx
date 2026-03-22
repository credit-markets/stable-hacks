"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useEventsQuery } from "@/hooks/admin/useEventsQuery";
import { cx, styles } from "@/lib/styleClasses";
import type { ExecutionEvent } from "@/services/api";
import { formatAddress } from "@/utils/formatAddress";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { Input } from "@nextui-org/input";
import { Select, SelectItem, SelectSection } from "@nextui-org/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/table";
import { ExternalLink, ScrollText } from "lucide-react";
import { useState } from "react";
import type { Key } from "react";

// ─────────────────────────────────────────
// Constants
// ─────────────────────────────────────────

const EVENT_TYPE_GROUPS: Record<string, string[]> = {
  Pool: [
    "pool.created",
    "pool.activated",
    "pool.deployed",
    "pool.status_changed",
  ],
  Investment: [
    "investment.requested",
    "investment.approved",
    "investment.rejected",
    "investment.settled",
  ],
  Withdrawal: [
    "withdrawal.requested",
    "withdrawal.approved",
    "withdrawal.settled",
  ],
  Risk: ["risk.snapshot_attached", "risk.threshold_breached"],
  Compliance: ["compliance.account_frozen", "compliance.account_unfrozen"],
  System: ["chain.confirmed"],
};

const ACTOR_TYPE_OPTIONS = [
  "investor",
  "manager",
  "admin",
  "system",
  "partner",
] as const;

const ACTOR_TYPE_COLORS: Record<
  string,
  "primary" | "success" | "warning" | "danger" | "default"
> = {
  admin: "danger",
  manager: "primary",
  investor: "success",
  system: "warning",
  partner: "default",
};

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

const formatTimestamp = (date: string) => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─────────────────────────────────────────
// Columns
// ─────────────────────────────────────────

const columns = [
  { name: "Timestamp", uid: "created_at" },
  { name: "Event", uid: "event_type" },
  { name: "Actor", uid: "actor_id" },
  { name: "Actor Type", uid: "actor_type" },
  { name: "Target", uid: "target_id" },
  { name: "Target Type", uid: "target_type" },
  { name: "Chain TX", uid: "chain_tx_id" },
  { name: "Confirmed", uid: "chain_confirmed" },
];

// ─────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────

export default function AdminEventsPage() {
  const [eventType, setEventType] = useState<string>("");
  const [actorType, setActorType] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const { data, isLoading, isError, error } = useEventsQuery({
    eventType: eventType || undefined,
    actorType: actorType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize,
  });

  const events: ExecutionEvent[] = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
  };

  const clearFilters = () => {
    setEventType("");
    setActorType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasActiveFilters = eventType || actorType || dateFrom || dateTo;

  const renderCell = (event: ExecutionEvent, columnKey: Key) => {
    switch (columnKey) {
      case "created_at":
        return (
          <span className={cx(styles.tableCellMuted, "whitespace-nowrap")}>
            {formatTimestamp(event.created_at)}
          </span>
        );

      case "event_type":
        return (
          <span className={styles.tableCellValue}>{event.event_type}</span>
        );

      case "actor_id":
        return (
          <span className="font-mono text-sm">
            {formatAddress(event.actor_id)}
          </span>
        );

      case "actor_type":
        return (
          <Chip
            size="sm"
            variant="flat"
            color={ACTOR_TYPE_COLORS[event.actor_type] ?? "default"}
          >
            {event.actor_type}
          </Chip>
        );

      case "target_id":
        return (
          <span className="font-mono text-sm">
            {formatAddress(event.target_id)}
          </span>
        );

      case "target_type":
        return <span className={styles.tableCell}>{event.target_type}</span>;

      case "chain_tx_id":
        return event.chain_tx_id ? (
          <a
            href={`https://explorer.solana.com/tx/${event.chain_tx_id}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {formatAddress(event.chain_tx_id)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className={styles.tableCellMuted}>&mdash;</span>
        );

      case "chain_confirmed":
        return (
          <Chip
            size="sm"
            variant="flat"
            color={event.chain_confirmed ? "success" : "default"}
          >
            {event.chain_confirmed ? "Yes" : "No"}
          </Chip>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className={styles.headingLg}>Execution Events</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Event Type - grouped select */}
        <Select
          label="Event Type"
          placeholder="All events"
          className="w-56"
          selectedKeys={eventType ? [eventType] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string | undefined;
            setEventType(selected ?? "");
            setPage(1);
          }}
        >
          {Object.entries(EVENT_TYPE_GROUPS).map(([group, types]) => (
            <SelectSection key={group} title={group}>
              {types.map((type) => (
                <SelectItem key={type}>{type}</SelectItem>
              ))}
            </SelectSection>
          ))}
        </Select>

        {/* Actor Type select */}
        <Select
          label="Actor Type"
          placeholder="All actors"
          className="w-44"
          selectedKeys={actorType ? [actorType] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string | undefined;
            setActorType(selected ?? "");
            setPage(1);
          }}
        >
          {ACTOR_TYPE_OPTIONS.map((type) => (
            <SelectItem key={type}>{type}</SelectItem>
          ))}
        </Select>

        {/* Date From */}
        <Input
          type="date"
          label="Date From"
          className="w-44"
          value={dateFrom}
          onValueChange={(val) => {
            setDateFrom(val);
            setPage(1);
          }}
        />

        {/* Date To */}
        <Input
          type="date"
          label="Date To"
          className="w-44"
          value={dateTo}
          onValueChange={(val) => {
            setDateTo(val);
            setPage(1);
          }}
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="flat" size="md" onPress={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <p className={cx(styles.bodyMd, "text-danger")}>
          {error instanceof Error
            ? error.message
            : "Error loading events. Please try again."}
        </p>
      )}

      {/* Table */}
      <div className={cx(styles.card, "overflow-hidden")}>
        <Table
          aria-label="Execution events table"
          classNames={{
            wrapper: "min-h-[400px]",
            table: "min-w-[900px]",
          }}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.uid}>{column.name}</TableColumn>
            )}
          </TableHeader>
          <TableBody
            items={events}
            isLoading={isLoading}
            loadingContent={<LoadingOverlay height="md" />}
            emptyContent={
              <EmptyState
                icon={<ScrollText />}
                title="No events found"
                message={
                  hasActiveFilters
                    ? "Try adjusting your filters"
                    : "No execution events have been recorded yet"
                }
                size="md"
              />
            }
          >
            {(event: ExecutionEvent) => (
              <TableRow key={event.id}>
                {(columnKey: Key) => (
                  <TableCell>{renderCell(event, columnKey)}</TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className={styles.bodySm}>
            Page {pagination.page} of {pagination.totalPages} (
            {pagination.total} total events)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              isDisabled={pagination.page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="flat"
              isDisabled={pagination.page >= pagination.totalPages}
              onPress={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
