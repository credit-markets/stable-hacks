"use client";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useKybQueue } from "@/hooks/kyb";
import { cx, styles } from "@/lib/styleClasses";
import type { KybQueueItem, KybStatus } from "@/types/kyb";
import { formatAddress } from "@/utils/formatAddress";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/table";
import { Tab, Tabs } from "@nextui-org/tabs";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Key } from "react";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "resubmission_requested", label: "Resubmission" },
] as const;

const STATUS_COLORS: Record<
  KybStatus,
  "warning" | "primary" | "success" | "danger" | "secondary" | "default"
> = {
  draft: "default",
  submitted: "warning",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
  resubmission_requested: "secondary",
  revoked: "default",
};

const STATUS_LABELS: Record<KybStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  resubmission_requested: "Resubmission",
  revoked: "Revoked",
};

export default function KybQueueTable() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filters: Record<string, unknown> = { page };
  if (activeTab !== "all") {
    filters.status = activeTab;
  }

  const { data, isLoading } = useKybQueue(filters);

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.ceil(total / pageSize);

  const handleTabChange = (key: Key) => {
    setActiveTab(String(key));
    setPage(1);
  };

  const renderCell = (item: KybQueueItem, columnKey: string) => {
    switch (columnKey) {
      case "user":
        return (
          <span className={styles.tableCell}>
            {item.users?.account
              ? formatAddress(item.users.account)
              : "Unknown"}
          </span>
        );
      case "entity_name":
        return (
          <div>
            <p className={styles.valueSm}>
              {item.legal_name || item.trading_name || "Unnamed Entity"}
            </p>
            {item.trading_name && item.legal_name && (
              <p className={styles.bodySm}>{item.trading_name}</p>
            )}
          </div>
        );
      case "entity_type":
        return (
          <span className={styles.tableCell}>
            {item.entity_type
              ? item.entity_type.charAt(0).toUpperCase() +
                item.entity_type.slice(1)
              : "N/A"}
          </span>
        );
      case "jurisdiction":
        return (
          <span className={styles.tableCell}>{item.jurisdiction || "N/A"}</span>
        );
      case "status":
        return (
          <Chip size="sm" variant="flat" color={STATUS_COLORS[item.status]}>
            {STATUS_LABELS[item.status]}
          </Chip>
        );
      case "risk_score":
        return (
          <div className="flex items-center gap-2">
            <span className={styles.tableCellValue}>
              {item.risk_score !== null ? item.risk_score : "--"}
            </span>
            {item.risk_band && (
              <Chip
                size="sm"
                variant="flat"
                color={
                  item.risk_band === "low"
                    ? "success"
                    : item.risk_band === "medium"
                      ? "warning"
                      : "danger"
                }
              >
                {item.risk_band}
              </Chip>
            )}
          </div>
        );
      case "created_at":
        return (
          <span className={styles.tableCellMuted}>
            {formatDate(item.created_at)}
          </span>
        );
      case "actions":
        return (
          <Button
            as={Link}
            href={`/admin/kyb-queue/${item.id}`}
            size="sm"
            variant="flat"
            startContent={<Eye className="w-4 h-4" />}
          >
            Review
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={handleTabChange}
        variant="underlined"
        aria-label="Filter by status"
      >
        {STATUS_TABS.map((tab) => (
          <Tab key={tab.key} title={tab.label} />
        ))}
      </Tabs>

      <div className={cx(styles.card, "overflow-hidden")}>
        {isLoading ? (
          <LoadingOverlay height="md" />
        ) : (
          <div className="overflow-x-auto">
            <Table
              aria-label="KYB submissions queue"
              classNames={{ table: "min-w-[800px]" }}
            >
              <TableHeader>
                <TableColumn key="user">USER</TableColumn>
                <TableColumn key="entity_name">ENTITY NAME</TableColumn>
                <TableColumn key="entity_type">TYPE</TableColumn>
                <TableColumn key="jurisdiction">JURISDICTION</TableColumn>
                <TableColumn key="status">STATUS</TableColumn>
                <TableColumn key="risk_score">RISK SCORE</TableColumn>
                <TableColumn key="created_at">SUBMITTED</TableColumn>
                <TableColumn key="actions" align="end">
                  ACTION
                </TableColumn>
              </TableHeader>
              <TableBody items={items} emptyContent="No submissions found.">
                {(item) => (
                  <TableRow key={item.id}>
                    {(columnKey: Key) => (
                      <TableCell>
                        {renderCell(item, String(columnKey))}
                      </TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-2">
          <Button
            size="sm"
            variant="flat"
            isDisabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className={styles.bodySm}>
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="flat"
            isDisabled={page >= totalPages}
            onPress={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
