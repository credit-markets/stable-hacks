import type { Transaction } from "@/types/portfolio";
import { formatForCsvExport } from "@/utils/dateFormatters";

export function exportTransactionsToCsv(
  data: Transaction[],
  filename: string,
): void {
  const headers = "Type,Date,From,To,Value (USD),Status";
  const csv = [
    headers,
    ...data.map(
      (tx) =>
        `${tx.tag},${formatForCsvExport(tx.timestamp)},${tx.from},${tx.to},${tx.amount},${tx.tag}`,
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
