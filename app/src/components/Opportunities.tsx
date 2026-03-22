"use client";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { type SortByOption, usePoolsQuery } from "@/hooks/pools/usePoolsQuery";
import { cx, styles } from "@/lib/styleClasses";
import { Select, SelectItem } from "@nextui-org/select";
import { useState } from "react";
import { OpportunitiesGrid } from "./OpportunitiesGrid";

const SORT_OPTIONS: { key: SortByOption; label: string }[] = [
  { key: "target_return_rate", label: "LTM Return" },
  { key: "minimum_investment", label: "Deposit" },
  { key: "risk_score", label: "Credit Score" },
  { key: "created_at", label: "Newest" },
];

const PAGE_SIZE = 20;

export function Opportunities() {
  const [sortBy, setSortBy] = useState<SortByOption>("target_return_rate");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, isFetched } = usePoolsQuery({
    sortBy,
    sortOrder: "descending",
    queryFilter: `page=${currentPage}&pageSize=${PAGE_SIZE}`,
  });

  const total = data?.pagination?.total ?? 0;

  const fetchPage = (nextPage: number) => {
    if (nextPage < 1 || (total && nextPage > Math.ceil(total / PAGE_SIZE)))
      return;
    setCurrentPage(nextPage);
  };

  const page = {
    next: () => fetchPage(currentPage + 1),
    prev: () => fetchPage(currentPage - 1),
    pageNumber: currentPage,
    pageSize: PAGE_SIZE,
    hasMore: total > currentPage * PAGE_SIZE,
  };

  return (
    <section id="opportunities" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-1">
          <h3 className={styles.sectionTitle}>Pools</h3>
          <p className={styles.bodyMd}>
            Institutional credit opportunities across various asset classes.
            Verification required.
          </p>
        </div>

        <Select
          size="sm"
          variant="bordered"
          aria-label="Sort pools by"
          classNames={{
            base: "w-44 shrink-0",
            trigger:
              "border border-subtle bg-surface-card rounded-md h-9 shadow-card",
            value: "text-sm",
            label: "text-xs uppercase tracking-wider text-text-muted",
          }}
          label="Sort by"
          selectedKeys={[sortBy]}
          onSelectionChange={(selection) => {
            const key = selection.currentKey as SortByOption;
            if (key) {
              setSortBy(key);
              setCurrentPage(1);
            }
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.key}>{option.label}</SelectItem>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingOverlay height="md" />
      ) : data?.data?.length ? (
        <OpportunitiesGrid fetch={page} opportunities={data} />
      ) : isFetched ? (
        <p className={cx(styles.bodyMd, "text-center")}>No pools available</p>
      ) : null}
    </section>
  );
}
