"use client";

import { styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationNavProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemText?: string;
}

export function PaginationNav({
  page,
  pageSize,
  total,
  onPageChange,
  itemText = "items",
}: PaginationNavProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <nav
      className="flex items-center justify-center gap-2 pt-3 pb-1"
      aria-label="Pagination"
    >
      <span
        className={`${styles.labelPrimary} text-text-secondary tabular-nums`}
      >
        {from}-{to} of {total} {itemText}
      </span>

      <div className="flex items-center gap-0.5">
        <Button
          isIconOnly
          aria-label="Previous page"
          variant="light"
          size="sm"
          className="text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 w-6 h-6 min-w-0"
          isDisabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={14} />
        </Button>

        <Button
          isIconOnly
          aria-label="Next page"
          variant="light"
          size="sm"
          className="text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 w-6 h-6 min-w-0"
          isDisabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </nav>
  );
}
