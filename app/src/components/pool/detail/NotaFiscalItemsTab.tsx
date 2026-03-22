"use client";

import { PaginationNav } from "@/components/PaginationNav";
import {
  StatusChip,
  getChipStatusFromReceivable,
} from "@/components/StatusChip";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import {
  useNotaFiscalAggregates,
  useNotaFiscalItems,
} from "@/hooks/notaFiscal/useNotaFiscalItems";
import { cx, styles } from "@/lib/styleClasses";
import type { NotaFiscalItem } from "@/types/notaFiscal";
import { format } from "date-fns";
import { useState } from "react";

interface NotaFiscalItemsTabProps {
  poolId: string;
  pipelineKey: string;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function ItemRow({ item }: { item: NotaFiscalItem }) {
  return (
    <tr className="border-b border-border-default/20 hover:bg-surface-hover transition-colors">
      <td className="py-2 px-3 max-w-[160px]">
        <span
          className={cx(styles.tableCellMuted, "block truncate")}
          title={item.cedente}
        >
          {item.cedente}
        </span>
      </td>
      <td className="py-2 px-3 max-w-[140px]">
        <span
          className={cx(styles.tableCellMuted, "block truncate")}
          title={item.sacado}
        >
          {item.sacado}
        </span>
      </td>
      <td className="py-2 px-3 text-right whitespace-nowrap">
        <span className={styles.tableCellValue}>
          {formatBRL(item.valor_nominal)}
        </span>
      </td>
      <td className="py-2 px-3 text-right whitespace-nowrap">
        <span className={styles.tableCellValue}>
          {item.taxa_desconto != null
            ? `${item.taxa_desconto.toFixed(1)}%`
            : "—"}
        </span>
      </td>
      <td className="py-2 px-3 text-right whitespace-nowrap">
        <span className={styles.tableCellMuted}>
          {format(new Date(item.data_vencimento), "dd/MM/yy")}
        </span>
      </td>
      <td className="py-2 px-3 text-right">
        <StatusChip
          status={getChipStatusFromReceivable(item.status)}
          size="sm"
        />
      </td>
    </tr>
  );
}

function AggregatesSummary({ poolId }: { poolId: string }) {
  const { data: aggregates } = useNotaFiscalAggregates(poolId);
  if (!aggregates) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      <div>
        <span className={styles.labelSans}>Total Items</span>
        <div className={cx(styles.valueSm, "mt-1")}>
          {aggregates.total_items.toLocaleString()}
        </div>
      </div>
      <div>
        <span className={styles.labelSans}>Face Value</span>
        <div className={cx(styles.valueSm, "mt-1")}>
          {formatCompact(aggregates.total_face_value)}
        </div>
      </div>
      <div>
        <span className={styles.labelSans}>Acquisition</span>
        <div className={cx(styles.valueSm, "mt-1")}>
          {formatCompact(aggregates.total_acquisition_value)}
        </div>
      </div>
      <div>
        <span className={styles.labelSans}>Avg Discount</span>
        <div className={cx(styles.valueSm, "mt-1")}>
          {aggregates.avg_discount_rate.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export function NotaFiscalItemsTab({ poolId }: NotaFiscalItemsTabProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading, isError } = useNotaFiscalItems(
    poolId,
    page,
    pageSize,
  );

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <h3 className={cx(styles.headingSm, "mb-4")}>Receivables Portfolio</h3>
      <AggregatesSummary poolId={poolId} />

      {isLoading ? (
        <LoadingOverlay height="md" />
      ) : isError ? (
        <div className="p-8 text-center">
          <p className={styles.bodySm}>Failed to load receivables data.</p>
        </div>
      ) : !data?.data?.length ? (
        <div className="p-8 text-center">
          <p className={styles.bodySm}>No receivables found for this pool.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" aria-label="Receivables">
              <thead>
                <tr className="border-b border-border-default">
                  <th className={cx(styles.tableHeader, "py-2 px-3 text-left")}>
                    Cedente
                  </th>
                  <th className={cx(styles.tableHeader, "py-2 px-3 text-left")}>
                    Sacado
                  </th>
                  <th
                    className={cx(styles.tableHeader, "py-2 px-3 text-right")}
                  >
                    Face Value
                  </th>
                  <th
                    className={cx(styles.tableHeader, "py-2 px-3 text-right")}
                  >
                    Discount
                  </th>
                  <th
                    className={cx(styles.tableHeader, "py-2 px-3 text-right")}
                  >
                    Due
                  </th>
                  <th
                    className={cx(styles.tableHeader, "py-2 px-3 text-right")}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination && data.pagination.totalPages > 1 && (
            <PaginationNav
              page={page}
              pageSize={pageSize}
              total={data.pagination.total}
              onPageChange={(newPage) => setPage(newPage)}
              itemText="receivables"
            />
          )}
        </>
      )}
    </div>
  );
}
