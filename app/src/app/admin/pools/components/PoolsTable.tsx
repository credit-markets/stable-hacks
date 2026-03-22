"use client";

import { PoolLogo } from "@/components/PoolLogo";
import { EmptyState } from "@/components/ui/EmptyState";
import { cx, styles } from "@/lib/styleClasses";
import { calculatePoolTvl, formatTvlCompact } from "@/lib/utils/tvl";
import type { Pool } from "@/services/api";
import { formatAddress } from "@/utils/formatAddress";
import { Chip } from "@nextui-org/chip";
import { Switch } from "@nextui-org/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/table";
import { Droplet } from "lucide-react";
import { useCallback } from "react";
import PoolActionButtons from "./PoolActionButtons";

const columns: {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
}[] = [
  { key: "title", label: "Title" },
  { key: "type", label: "Type" },
  { key: "manager", label: "Manager" },
  { key: "status", label: "Status" },
  { key: "tvl", label: "TVL" },
  { key: "window", label: "Window" },
  { key: "visible", label: "Visible" },
  { key: "actions", label: "Actions", align: "end" },
];

interface PoolsTableProps {
  pools: Pool[];
  loadingState: "loading" | "idle";
  onViewDetails: (pool: Pool) => void;
  onToggleVisibility: (poolId: string, isVisible: boolean) => void;
}

export default function PoolsTable({
  pools,
  loadingState,
  onViewDetails,
  onToggleVisibility,
}: PoolsTableProps) {
  const renderCell = useCallback(
    (pool: Pool, columnKey: React.Key) => {
      switch (columnKey) {
        case "title":
          return (
            <div className="flex items-center gap-3">
              <PoolLogo src={pool.logo_path} name={pool.title} size="sm" />
              <div className="flex flex-col">
                <p className={styles.valueSm}>{pool.title}</p>
                <p className={styles.bodySm}>{pool.pipeline_key}</p>
              </div>
            </div>
          );

        case "type":
          return (
            <Chip size="sm" variant="flat">
              {(pool.pool_type || "").toUpperCase()}
            </Chip>
          );

        case "manager":
          return (
            <div className="flex flex-col">
              <span className={styles.tableCell}>
                {pool.manager_name || formatAddress(pool.manager_address || "")}
              </span>
            </div>
          );

        case "status":
          return pool.on_chain_address ? (
            <Chip size="sm" variant="flat" color="success">
              Deployed
            </Chip>
          ) : (
            <Chip size="sm" variant="flat" color="warning">
              Not Deployed
            </Chip>
          );

        case "tvl":
          return (
            <span className={styles.tableCellValue}>
              {formatTvlCompact(
                calculatePoolTvl(
                  pool.onChainData?.totalShares,
                  pool.onChainData?.pricePerShare,
                ),
              )}
            </span>
          );

        case "window":
          return pool.on_chain_address ? (
            <Chip
              size="sm"
              variant="flat"
              color={pool.investment_window_open ? "success" : "default"}
            >
              {pool.investment_window_open ? "Open" : "Closed"}
            </Chip>
          ) : (
            <Chip size="sm" variant="flat" color="default">
              {"\u2014"}
            </Chip>
          );

        case "visible":
          return (
            <Switch
              size="sm"
              isSelected={pool.is_visible}
              onValueChange={(val) => onToggleVisibility(pool.id, val)}
            />
          );

        case "actions":
          return (
            <PoolActionButtons pool={pool} onViewDetails={onViewDetails} />
          );

        default:
          return null;
      }
    },
    [onViewDetails, onToggleVisibility],
  );

  return (
    <div className={cx(styles.card, "overflow-hidden")}>
      <Table
        aria-label="Admin pools table"
        classNames={{ table: "min-w-[600px]" }}
        bottomContent={
          <div className="py-2 px-2 flex justify-between items-center">
            <span className={styles.bodySm}>
              {pools.length} pool{pools.length !== 1 ? "s" : ""} total
            </span>
          </div>
        }
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key} align={column.align}>
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={pools}
          emptyContent={
            <EmptyState
              icon={<Droplet />}
              title="No pools found"
              message="Pools will appear here once managers create them"
              size="md"
            />
          }
          loadingContent="Loading pools\u2026"
          loadingState={loadingState}
        >
          {(pool) => (
            <TableRow key={pool.id}>
              {(columnKey) => (
                <TableCell>{renderCell(pool, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
