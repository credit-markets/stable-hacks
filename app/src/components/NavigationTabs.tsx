"use client";

import { cx, styles } from "@/lib/styleClasses";

export type TabId = "marketplace" | "portfolio";

export interface NavigationTab {
  id: TabId;
  label: string;
}

const DEFAULT_TABS: NavigationTab[] = [
  { id: "marketplace", label: "Marketplace" },
  { id: "portfolio", label: "Portfolio" },
];

interface NavigationTabsProps {
  tabs?: NavigationTab[];
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  className?: string;
}

export function NavigationTabs({
  tabs = DEFAULT_TABS,
  activeTab = "marketplace",
  onTabChange,
  className,
}: NavigationTabsProps) {
  return (
    <nav
      className={cx("flex items-center gap-4 md:gap-8", className)}
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className={cx(
              styles.navTab,
              isActive ? styles.navTabActive : styles.navTabInactive,
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
