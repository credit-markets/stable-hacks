"use client";

import { Shimmer } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";

interface DelinquencyPipelinePanelProps {
  inadEarly: number | null;
  inadMid: number | null;
  inadSevere: number | null;
  defaultRatio: number | null;
}

function fmtPct(value: number | null, decimals = 1): string {
  if (value == null) return "\u2014";
  return `${(value * 100).toFixed(decimals)}%`;
}

interface SegmentDef {
  key: string;
  label: string;
  value: number;
  dotColor: string;
  barColor: string;
  valueColor?: string;
}

export function DelinquencyPipelinePanel({
  inadEarly,
  inadMid,
  inadSevere,
  defaultRatio,
}: DelinquencyPipelinePanelProps) {
  const isLoading =
    inadEarly == null &&
    inadMid == null &&
    inadSevere == null &&
    defaultRatio == null;

  if (isLoading) {
    return (
      <div className={cx(styles.card, styles.cardPadding, "space-y-4")}>
        <Shimmer className="h-5 w-44" />
        <Shimmer className="h-5 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <Shimmer className="h-4 w-28" />
              <Shimmer className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const early = inadEarly ?? 0;
  const mid = inadMid ?? 0;
  const severe = inadSevere ?? 0;
  const totalDelinquent = early + mid + severe + (defaultRatio ?? 0);
  const performing = Math.max(0, 1 - totalDelinquent);

  const segments: SegmentDef[] = [
    {
      key: "performing",
      label: "Performing",
      value: performing,
      dotColor: "bg-terminal-green",
      barColor: "bg-terminal-green",
      valueColor: "text-terminal-green",
    },
    {
      key: "early",
      label: "Early (up to 90d)",
      value: early,
      dotColor: "bg-terminal-amber",
      barColor: "bg-terminal-amber",
    },
    {
      key: "mid",
      label: "Mid (120-180d)",
      value: mid,
      dotColor: "bg-[#e67700]",
      barColor: "bg-[#e67700]",
    },
    {
      key: "severe",
      label: "Severe (360d+)",
      value: severe,
      dotColor: "bg-terminal-red",
      barColor: "bg-terminal-red",
    },
  ];

  return (
    <div className={cx(styles.card, styles.cardPadding)}>
      <h3 className={cx(styles.headingSm, "mb-3")}>Delinquency Pipeline</h3>

      {/* Stacked horizontal bar */}
      <div className="h-5 w-full flex rounded overflow-hidden mb-3.5">
        {segments.map(
          (seg) =>
            seg.value > 0 && (
              <div
                key={seg.key}
                className={cx("h-full", seg.barColor)}
                style={{ width: `${seg.value * 100}%` }}
              />
            ),
        )}
      </div>

      {/* Metric rows */}
      {segments.map((seg) => (
        <div
          key={seg.key}
          className="flex items-center justify-between py-[7px] border-b border-[#f5f5f5] last:border-b-0"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cx(
                "inline-block h-2 w-2 rounded-sm shrink-0",
                seg.dotColor,
              )}
            />
            <span className={styles.bodySm}>{seg.label}</span>
          </div>
          <span className={cx(styles.valueXs, seg.valueColor)}>
            {fmtPct(seg.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
