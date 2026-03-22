"use client";

import { PoolLogo } from "@/components/PoolLogo";

import { Shimmer } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";
import { getPoolTokenSymbol } from "@/lib/utils/tvl";
import type { PortfolioPosition } from "@/types/portfolio";
import Link from "next/link";

interface PositionsTableProps {
  positions: PortfolioPosition[];
  isLoading: boolean;
}

// Table constants — matches receivables portfolio style
const CELL_PADDING = "px-3";
const HEADER_CELL_CLASSES = `${styles.tableHeader} py-2 px-3`;
const DATA_CELL_CLASSES = "py-2 px-3";
const ROW_HEIGHT = "";

const COLUMN_WIDTHS = {
  pool: "w-[26%]",
  invested: "w-[14%]",
  nav: "w-[12%]",
  share: "w-[10%]",
  ltmReturn: "w-[12%]",
  creditScore: "w-[14%]",
  rating: "w-[12%]",
} as const;

function getRatingTier(score: number): string {
  if (score <= 20) return "Tier 1";
  if (score <= 40) return "Tier 2";
  if (score <= 60) return "Tier 3";
  if (score <= 80) return "Tier 4";
  return "Tier 5";
}

function PositionSkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <tr
          key={`pos-skel-${idx}`}
          className="border-b border-border-default/20"
        >
          <td
            className={cx(DATA_CELL_CLASSES, CELL_PADDING, COLUMN_WIDTHS.pool)}
          >
            <div className="flex items-center gap-2">
              <Shimmer size="icon" rounded="rounded-full" />
              <Shimmer size="textSm" width="w-28" />
            </div>
          </td>
          <td
            className={cx(
              DATA_CELL_CLASSES,
              CELL_PADDING,
              COLUMN_WIDTHS.invested,
              "text-right",
            )}
          >
            <Shimmer size="textSm" width="w-16" className="ml-auto" />
          </td>
          <td
            className={cx(
              DATA_CELL_CLASSES,
              CELL_PADDING,
              COLUMN_WIDTHS.nav,
              "text-right",
            )}
          >
            <Shimmer size="textSm" width="w-14" className="ml-auto" />
          </td>
          <td
            className={cx(
              DATA_CELL_CLASSES,
              CELL_PADDING,
              COLUMN_WIDTHS.share,
              "text-right",
            )}
          >
            <Shimmer size="textSm" width="w-10" className="ml-auto" />
          </td>
          <td
            className={cx(
              DATA_CELL_CLASSES,
              CELL_PADDING,
              COLUMN_WIDTHS.ltmReturn,
              "text-right",
            )}
          >
            <Shimmer size="textSm" width="w-10" className="ml-auto" />
          </td>
          <td
            className={cx(
              DATA_CELL_CLASSES,
              CELL_PADDING,
              COLUMN_WIDTHS.creditScore,
              "text-right",
            )}
          >
            <Shimmer size="textSm" width="w-12" className="ml-auto" />
          </td>
          <td
            className={cx(
              DATA_CELL_CLASSES,
              COLUMN_WIDTHS.rating,
              "text-right",
            )}
          >
            <Shimmer size="textSm" width="w-10" className="ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function PositionsTable({ positions, isLoading }: PositionsTableProps) {
  const sorted = [...positions].sort((a, b) => b.invested - a.invested);
  const isEmpty = !isLoading && sorted.length === 0;

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <h3 className={cx(styles.headingSm, "mb-4")}>Holdings</h3>

      {isEmpty ? (
        <div className="py-8 text-center">
          <span className="text-sm text-text-tertiary">
            No holdings yet. Invest in a pool to get started.
          </span>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table
              className="w-full border-collapse min-w-[700px]"
              aria-label="Portfolio holdings"
            >
              <thead>
                <tr className="border-b border-border-default">
                  <th
                    className={cx(
                      HEADER_CELL_CLASSES,
                      CELL_PADDING,
                      "text-left",
                      COLUMN_WIDTHS.pool,
                    )}
                  >
                    Pool
                  </th>
                  <th
                    className={cx(
                      HEADER_CELL_CLASSES,
                      CELL_PADDING,
                      "text-right",
                      COLUMN_WIDTHS.invested,
                    )}
                  >
                    Invested
                  </th>
                  <th
                    className={cx(
                      HEADER_CELL_CLASSES,
                      CELL_PADDING,
                      "text-right",
                      COLUMN_WIDTHS.nav,
                    )}
                  >
                    Share Price
                  </th>
                  <th
                    className={cx(
                      HEADER_CELL_CLASSES,
                      CELL_PADDING,
                      "text-right",
                      COLUMN_WIDTHS.share,
                    )}
                  >
                    Share
                  </th>
                  <th
                    className={cx(
                      HEADER_CELL_CLASSES,
                      CELL_PADDING,
                      "text-right",
                      COLUMN_WIDTHS.ltmReturn,
                    )}
                  >
                    LTM Return
                  </th>
                  <th
                    className={cx(
                      HEADER_CELL_CLASSES,
                      CELL_PADDING,
                      "text-right",
                      COLUMN_WIDTHS.creditScore,
                    )}
                  >
                    Credit Score
                  </th>
                  <th
                    className={cx(
                      HEADER_CELL_CLASSES,
                      "text-right",
                      COLUMN_WIDTHS.rating,
                    )}
                  >
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <PositionSkeletonRows count={3} />
                ) : (
                  sorted.map((pos) => {
                    const creditScore =
                      pos.creditScore != null
                        ? Math.round(pos.creditScore)
                        : null;
                    const ltmReturn =
                      pos.ltmReturn != null
                        ? `${pos.ltmReturn.toFixed(1)}%`
                        : "\u2014";

                    return (
                      <tr
                        key={pos.poolId}
                        className={cx(
                          "border-b border-border-default/20 hover:bg-surface-hover transition-colors cursor-pointer",
                        )}
                      >
                        <td className={cx(DATA_CELL_CLASSES, CELL_PADDING)}>
                          <Link
                            href={`/pool/${pos.poolId}`}
                            className="flex items-center gap-2 min-w-0"
                          >
                            <PoolLogo
                              src={pos.logoPath}
                              name={pos.poolTitle}
                              size="xs"
                            />
                            <span
                              className={cx(
                                "text-xs font-medium text-text-primary truncate hover:underline",
                              )}
                            >
                              {pos.poolTitle}
                            </span>
                          </Link>
                        </td>
                        <td
                          className={cx(
                            DATA_CELL_CLASSES,
                            CELL_PADDING,
                            "text-right whitespace-nowrap",
                          )}
                        >
                          <span className={styles.tableCellValue}>
                            {`${pos.invested.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${getPoolTokenSymbol(pos.depositCurrency)}`}
                          </span>
                        </td>
                        <td
                          className={cx(
                            DATA_CELL_CLASSES,
                            CELL_PADDING,
                            "text-right whitespace-nowrap",
                          )}
                        >
                          <span className={styles.tableCellValue}>
                            {pos.pricePerShare != null
                              ? `$${pos.pricePerShare.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                              : "\u2014"}
                          </span>
                        </td>
                        <td
                          className={cx(
                            DATA_CELL_CLASSES,
                            CELL_PADDING,
                            "text-right whitespace-nowrap",
                          )}
                        >
                          <span className="text-xs font-medium text-text-secondary tabular-nums">
                            {pos.share.toFixed(1)}%
                          </span>
                        </td>
                        <td
                          className={cx(
                            DATA_CELL_CLASSES,
                            CELL_PADDING,
                            "text-right whitespace-nowrap",
                          )}
                        >
                          <span className={styles.tableCellValue}>
                            {ltmReturn}
                          </span>
                        </td>
                        <td
                          className={cx(
                            DATA_CELL_CLASSES,
                            CELL_PADDING,
                            "text-right whitespace-nowrap",
                          )}
                        >
                          <span className="text-xs font-medium text-text-primary">
                            {creditScore != null
                              ? `${creditScore} / 100`
                              : "\u2014"}
                          </span>
                        </td>
                        <td
                          className={cx(
                            DATA_CELL_CLASSES,
                            "text-right whitespace-nowrap",
                          )}
                        >
                          <span className="text-xs font-medium text-text-primary">
                            {creditScore != null
                              ? getRatingTier(creditScore)
                              : "\u2014"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-subtle/50">
            {isLoading
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <div key={`pos-mskel-${idx}`} className="py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shimmer size="icon" rounded="rounded-full" />
                      <Shimmer size="textSm" width="w-36" />
                    </div>
                    <div className="flex gap-4">
                      <Shimmer size="textSm" width="w-20" />
                      <Shimmer size="textSm" width="w-16" />
                      <Shimmer size="textSm" width="w-12" />
                    </div>
                  </div>
                ))
              : sorted.map((pos) => {
                  const creditScore =
                    pos.creditScore != null
                      ? Math.round(pos.creditScore)
                      : null;
                  const ltmReturn =
                    pos.ltmReturn != null
                      ? `${pos.ltmReturn.toFixed(1)}%`
                      : "\u2014";

                  return (
                    <div key={pos.poolId} className="py-3 space-y-2">
                      <Link
                        href={`/pool/${pos.poolId}`}
                        className="flex items-center gap-2 min-w-0"
                      >
                        <PoolLogo
                          src={pos.logoPath}
                          name={pos.poolTitle}
                          size="sm"
                        />
                        <span className="text-sm font-medium text-text-primary truncate hover:underline">
                          {pos.poolTitle}
                        </span>
                      </Link>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className={styles.tableHeader}>Invested</span>
                          <div className={cx(styles.tableCellValue, "mt-0.5")}>
                            {`${pos.invested.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${getPoolTokenSymbol(pos.depositCurrency)}`}
                          </div>
                        </div>
                        <div className="text-center">
                          <span className={styles.tableHeader}>Share</span>
                          <div className="text-xs font-medium text-text-secondary mt-0.5">
                            {pos.share.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={styles.tableHeader}>LTM Return</span>
                          <div className={cx(styles.tableCellValue, "mt-0.5")}>
                            {ltmReturn}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className={styles.tableHeader}>
                            Credit Score
                          </span>
                          <div className="text-xs font-medium text-text-primary mt-0.5">
                            {creditScore != null
                              ? `${creditScore} / 100`
                              : "\u2014"}
                          </div>
                        </div>
                        <div className="text-center">
                          <span className={styles.tableHeader}>Rating</span>
                          <div className="text-xs font-medium text-text-primary mt-0.5">
                            {creditScore != null
                              ? getRatingTier(creditScore)
                              : "\u2014"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={styles.tableHeader}>
                            Share Price
                          </span>
                          <div className={cx(styles.tableCellValue, "mt-0.5")}>
                            {pos.pricePerShare != null
                              ? `$${pos.pricePerShare.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                              : "\u2014"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </>
      )}
    </div>
  );
}
