import type { ReactNode } from "react";
import { Shimmer } from "./Shimmer";

export function PageSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">{children}</div>
  );
}

export function TableSkeleton({
  columns = 6,
  rows = 8,
}: {
  columns?: number;
  rows?: number;
}) {
  const gridColsClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
      7: "grid-cols-7",
      8: "grid-cols-8",
      9: "grid-cols-9",
      10: "grid-cols-10",
      11: "grid-cols-11",
      12: "grid-cols-12",
    }[columns] || "grid-cols-6";

  return (
    <div className="space-y-3">
      <div className={`grid ${gridColsClass} gap-4 pb-3 border-b`}>
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={i} size="textLg" rounded="rounded-lg" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`grid ${gridColsClass} gap-4 py-3`}>
          {Array.from({ length: columns }).map((_, j) => (
            <Shimmer key={j} size="heading" rounded="rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
