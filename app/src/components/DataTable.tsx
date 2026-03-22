"use client";
import { EmptyState } from "@/components/ui/EmptyState";
import { Shimmer } from "@/components/ui/skeletons";
import { ICON_SIZES } from "@/lib/styleClasses";
import { styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import type { SortDescriptor } from "@nextui-org/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  getKeyValue,
} from "@nextui-org/table";
import { ChevronLeft, ChevronRight, FileQuestion } from "lucide-react";
import { type ReactNode, useState } from "react";

type Props = {
  data: { id: string | number; [key: string]: string | number | ReactNode }[];
  columnNames: {
    name: string;
    allowsSorting?: boolean;
    align?: "start" | "end" | "center";
  }[];
  maxRenderRows?: number;
  total?: number;
  onSortChange?: (sort: SortDescriptor) => void;
  tableRowsStyle?: string;
  isLoading?: boolean;
};

export function DataTable({
  data,
  columnNames,
  maxRenderRows = 10,
  onSortChange,
  total,
  tableRowsStyle,
  isLoading,
}: Props) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();

  const handleSortChange = (sort: any) => {
    setSortDescriptor(sort);
    if (onSortChange) onSortChange(sort);
  };

  return (
    <>
      <Table
        aria-label="table with custom content"
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        classNames={{
          table: "min-h-[100px]",
          sortIcon: "opacity-1",
          wrapper:
            "bg-transparent shadow-none p-0 rounded-none max-md:bg-surface-page overflow-x-auto",
          th: "bg-transparent border-b border-text-primary/20 py-2",
          td: "border-b border-subtle py-3",
          tr: "even:bg-surface-hover/50",
        }}
      >
        <TableHeader>
          {columnNames.map((column) => (
            <TableColumn
              key={column.name}
              allowsSorting={column.allowsSorting}
              className={`bg-transparent ${styles.tableHeader}`}
              align={column.align || "start"}
            >
              {column.name}
            </TableColumn>
          ))}
        </TableHeader>

        <TableBody
          items={data}
          isLoading={isLoading}
          loadingContent={
            <div className="flex flex-col gap-3 w-full py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} size="textSm" width="w-full" />
              ))}
            </div>
          }
          emptyContent={
            <EmptyState
              icon={<FileQuestion />}
              title="No data found"
              size="sm"
            />
          }
        >
          {(item) => (
            <TableRow
              key={item.id}
              className={`items-center ${tableRowsStyle ?? ""}`}
            >
              {(columnKey) => (
                <TableCell className={styles.tableCellValue}>
                  {getKeyValue(item, columnKey)}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {total && total > maxRenderRows ? (
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className={`${styles.labelPrimary} tabular-nums`}>
            1-{data.length} of {total}
          </span>

          <Button
            isIconOnly
            aria-label="Previous page"
            variant="light"
            className="text-text-muted hover:text-text-primary"
            radius="sm"
            size="sm"
            isDisabled
          >
            <ChevronLeft className={ICON_SIZES.button.sm} />
          </Button>

          <Button
            isIconOnly
            aria-label="Next page"
            variant="light"
            className="text-text-muted hover:text-text-primary"
            radius="sm"
            size="sm"
            isDisabled
          >
            <ChevronRight className={ICON_SIZES.button.sm} />
          </Button>
        </div>
      ) : null}
    </>
  );
}
