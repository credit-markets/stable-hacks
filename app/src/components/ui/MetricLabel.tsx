"use client";

import { useRiskDefinitions } from "@/hooks/risk/useRiskData";
import { styles } from "@/lib/styleClasses";
import { Tooltip } from "@nextui-org/react";

interface MetricLabelProps {
  metricKey: string;
  fallbackLabel?: string;
}

export function MetricLabel({ metricKey, fallbackLabel }: MetricLabelProps) {
  const { data: definitions } = useRiskDefinitions();
  const def = definitions?.[metricKey];
  const label = def?.label ?? fallbackLabel ?? metricKey;

  return (
    <span className="inline-flex items-center gap-1">
      <span className={styles.bodySm}>{label}</span>
      {def && (
        <Tooltip
          content={
            <div className="max-w-[280px] p-3">
              <p className="text-[13px] font-medium text-text-primary mb-1.5">
                {def.label}
              </p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {def.description}
              </p>
              {(def.goodRange || def.source) && (
                <div className="mt-2 pt-2 border-t border-border-default/30 flex gap-4">
                  {def.goodRange && (
                    <div>
                      <span className="text-[9px] font-medium uppercase tracking-wider text-text-muted">
                        Target
                      </span>
                      <p className="text-[11px] font-medium text-text-primary mt-0.5">
                        {def.goodRange}
                      </p>
                    </div>
                  )}
                  {def.source && (
                    <div>
                      <span className="text-[9px] font-medium uppercase tracking-wider text-text-muted">
                        Source
                      </span>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {def.source}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
          placement="top"
          delay={200}
          closeDelay={50}
          classNames={{
            content:
              "bg-surface-card border border-subtle shadow-dropdown rounded-lg p-0",
          }}
        >
          <span className="text-text-muted cursor-help text-[10px] leading-none hover:text-text-secondary transition-colors">
            &#9432;
          </span>
        </Tooltip>
      )}
    </span>
  );
}
