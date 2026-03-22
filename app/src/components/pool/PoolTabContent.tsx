"use client";

import { DocumentButton } from "@/components/DocumentButton";
import type { PoolTab } from "@/hooks/usePoolTabs";
import { cx, styles } from "@/lib/styleClasses";
import type { Pool } from "@/services/api";
import { Chip } from "@nextui-org/chip";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Bloomberg-style table constants - use centralized tokens
const CELL_PADDING = "pr-8";
const HEADER_CELL_CLASSES = `${styles.tableHeader} pb-2`;
const DATA_CELL_CLASSES = `py-2 align-middle ${styles.tableCell}`;
const ROW_HEIGHT = "h-[36px]";

interface PoolTabContentProps {
  data: Pool;
  currentTab: PoolTab | undefined;
}

export function PoolTabContent({ data, currentTab }: PoolTabContentProps) {
  if (!currentTab) {
    return null;
  }

  // Render Documents tab
  if (currentTab.type === "documents") {
    const docs = data.documents || [];
    const lastUpdate = data.updated_at;

    return (
      <div
        id={`tabpanel-${currentTab.id}`}
        role="tabpanel"
        aria-labelledby={currentTab.id}
      >
        {/* Last update header */}
        <div className="flex items-center justify-between mb-4">
          <span className={styles.labelSecondary}>
            Last update:{" "}
            {lastUpdate ? format(new Date(lastUpdate), "MMM dd, yyyy") : "N/A"}
          </span>
        </div>

        {docs.length === 0 ? (
          <p className={cx(styles.bodyMd, "py-8 text-center")}>
            No documents available for this pool.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <table
              className="hidden md:table w-full border-collapse table-fixed"
              aria-label="Documents"
            >
              <thead>
                <tr className="border-b border-subtle">
                  <th
                    className={cx(
                      HEADER_CELL_CLASSES,
                      CELL_PADDING,
                      "text-left w-[70%]",
                    )}
                  >
                    Document Name
                  </th>
                  <th className={cx(HEADER_CELL_CLASSES, "text-right w-[30%]")}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr
                    key={doc.title}
                    className={cx(
                      ROW_HEIGHT,
                      "border-b border-subtle/50 last:border-b-0 transition-colors hover:bg-surface-hover",
                    )}
                  >
                    <td className={cx(DATA_CELL_CLASSES, CELL_PADDING)}>
                      <span className="font-medium">{doc.title}</span>
                    </td>
                    <td className={cx(DATA_CELL_CLASSES, "text-right")}>
                      <DocumentButton
                        document={doc}
                        size="sm"
                        variant="light"
                        className="text-strategic-blue"
                      >
                        <span className="flex items-center gap-1">
                          View <ExternalLink className="w-3 h-3" />
                        </span>
                      </DocumentButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-subtle/50">
              {docs.map((doc) => (
                <div
                  key={doc.title}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span
                    className={cx(
                      styles.tableCell,
                      "font-medium break-all min-w-0",
                    )}
                  >
                    {doc.title}
                  </span>
                  <DocumentButton
                    document={doc}
                    size="sm"
                    variant="light"
                    className="text-strategic-blue flex-shrink-0"
                  >
                    <span className="flex items-center gap-1">
                      View <ExternalLink className="w-3 h-3" />
                    </span>
                  </DocumentButton>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Render Asset Purchase Rules tab
  if (currentTab.type === "asset-rules") {
    return (
      <div
        id={`tabpanel-${currentTab.id}`}
        role="tabpanel"
        aria-labelledby={currentTab.id}
      >
        <div className="terminal-prose">
          <Markdown remarkPlugins={[remarkGfm]}>{""}</Markdown>
        </div>
      </div>
    );
  }

  // Section tabs no longer exist (sections column removed from pools)
  if (currentTab.type === "section") {
    return null;
  }

  return null;
}
