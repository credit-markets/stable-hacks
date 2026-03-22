"use client";

import { cx, styles } from "@/lib/styleClasses";

interface ResponsibilityEntry {
  id: string;
  role: string;
  actors?: { id: string; name: string; type: string };
}

interface ResponsibilityChainProps {
  chain?: ResponsibilityEntry[];
}

// Lowercase to match DB check constraint values
const ROLE_ORDER = [
  "facilitator",
  "originator",
  "administrator",
  "custodian",
  "servicer",
  "reporter",
  "hedge_operator",
  "registrar",
  "auditor",
];

const ROLE_LABELS: Record<string, string> = {
  facilitator: "Manager",
  originator: "Originator",
  administrator: "Administrator",
  custodian: "Custodian",
  servicer: "Servicer",
  reporter: "Reporter",
  hedge_operator: "Hedge Operator",
  registrar: "Registrar",
  auditor: "Auditor",
};

function formatRole(role: string): string {
  return (
    ROLE_LABELS[role] ||
    role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function ResponsibilityChain({ chain }: ResponsibilityChainProps) {
  if (!chain || chain.length === 0) {
    return (
      <section aria-label="Responsibility Chain">
        <h3 className={cx(styles.headingSm, "mb-4")}>Responsibility Chain</h3>
        <div className={cx(styles.card, "p-6 text-center")}>
          <p className={styles.bodyMd}>
            Responsibility chain will be available when the data pipeline ships.
          </p>
        </div>
      </section>
    );
  }

  // Sort by predefined role order
  const sorted = [...chain].sort((a, b) => {
    const aIdx = ROLE_ORDER.indexOf(a.role);
    const bIdx = ROLE_ORDER.indexOf(b.role);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  return (
    <section aria-label="Responsibility Chain">
      <h3 className={cx(styles.headingSm, "mb-4")}>Responsibility Chain</h3>
      <div className="space-y-0">
        {sorted.map((entry, idx) => (
          <div
            key={entry.id ?? `${entry.role}-${idx}`}
            className="flex items-center gap-3 py-3 border-b border-border-default/30 last:border-b-0"
          >
            {/* Vertical connector */}
            <div className="flex flex-col items-center w-6">
              <div
                className={cx(
                  "w-2.5 h-2.5 rounded-full",
                  idx === 0 ? "bg-emerald-400" : "bg-zinc-500",
                )}
              />
              {idx < sorted.length - 1 && (
                <div className="w-px h-full bg-zinc-600 mt-1" />
              )}
            </div>
            <div className="flex-1 flex justify-between items-baseline">
              <span className={styles.labelPrimary}>
                {formatRole(entry.role)}
              </span>
              <span className={styles.bodySm}>
                {entry.actors?.name ?? "Unassigned"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
