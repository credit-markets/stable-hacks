"use client";

import { NavigationTabs, type TabId } from "@/components/NavigationTabs";
import { TVLStatBox } from "@/components/TVLStatBox";
import { styles } from "@/lib/styleClasses";
import type { ReactNode } from "react";

interface HeroSectionProps {
  title: string | ReactNode;
  subtitle?: string;
  showTVL?: boolean;
  showNavigation?: boolean;
  showDivider?: boolean;
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  children?: ReactNode;
}

export function HeroSection({
  title,
  subtitle,
  showTVL = true,
  showNavigation = true,
  showDivider = true,
  activeTab = "marketplace",
  onTabChange,
  children,
}: HeroSectionProps) {
  return (
    <section className="pt-8 pb-8 md:pt-12 md:pb-10 bg-surface-page terminal-herringbone">
      <div className={styles.contentWrapper}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Title + Navigation */}
          <div className="space-y-6">
            {/* Title */}
            {typeof title === "string" ? (
              <h1 className={styles.displayMd}>{title}</h1>
            ) : (
              title
            )}

            {/* Subtitle */}
            {subtitle && (
              <p className={`${styles.bodyLg} max-w-xl`}>{subtitle}</p>
            )}

            {/* Navigation Tabs */}
            {showNavigation && (
              <NavigationTabs activeTab={activeTab} onTabChange={onTabChange} />
            )}
          </div>

          {/* Right: TVL Box (desktop) */}
          {showTVL && (
            <div className="hidden lg:block">
              <TVLStatBox />
            </div>
          )}
        </div>

        {/* Additional content */}
        {children}

        {/* TVL Box (mobile - below navigation) */}
        {showTVL && (
          <div className="lg:hidden mt-6">
            <TVLStatBox />
          </div>
        )}

        {/* Divider line with subtle curve/fade */}
        {showDivider && (
          <div
            className="h-px mt-8 md:mt-10"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(57, 57, 57, 0.2) 15%, rgba(57, 57, 57, 0.2) 85%, transparent)",
            }}
          />
        )}
      </div>
    </section>
  );
}

/**
 * Content wrapper for use inside pages.
 * Provides consistent padding and max-width.
 */
export function ContentWrapper({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.contentWrapper} ${className ?? ""}`}>
      {children}
    </div>
  );
}
