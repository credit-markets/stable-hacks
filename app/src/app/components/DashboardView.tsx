"use client";

import { ContentWrapper, HeroSection } from "@/components/HeroSection";
import type { TabId } from "@/components/NavigationTabs";
import { useManagerProfile } from "@/hooks/managers/useManagerProfile";
import useUserRole from "@/hooks/useUserRole";
import { cx, styles } from "@/lib/styleClasses";
import { PROJECT_INFO } from "@/utils/projectInfo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MarketplaceContent } from "./MarketplaceContent";
import { PortfolioView } from "./PortfolioView";

const VALID_TABS: TabId[] = ["marketplace", "portfolio"];

export function DashboardView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: roles } = useUserRole();
  const { data: managerProfile } = useManagerProfile();
  // Read tab from URL, default to "marketplace"
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = VALID_TABS.includes(tabParam as TabId)
    ? (tabParam as TabId)
    : "marketplace";

  const handleTabChange = (tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "marketplace") {
      params.delete("tab"); // Clean URL for default tab
    } else {
      params.set("tab", tab);
    }
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/", { scroll: false });
  };

  const getTitle = () => {
    return (
      <h1 className={styles.displayMd}>
        <span className="text-text-secondary">Access Institutional Credit</span>
        <br />
        <span className="text-text-secondary">on </span>
        <span className="text-text-primary">{PROJECT_INFO.name}</span>
      </h1>
    );
  };

  const isIncompleteManager =
    roles?.isManager &&
    managerProfile?.company_name &&
    managerProfile.company_name === managerProfile.owner_address;

  return (
    <>
      {isIncompleteManager && (
        <div className={cx(styles.contentWrapper, "pt-4")}>
          <div
            className={cx(
              styles.terminalStripDark,
              styles.terminalStripDarkBg,
              "flex items-center justify-between gap-4",
            )}
          >
            <div className={styles.terminalStripDarkAccent} />
            <div>
              <p className="text-sm font-medium text-white">
                Complete your manager profile
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                Set up your company details to start managing pools.
              </p>
            </div>
            <Link
              href="/manager/profile/edit"
              className={cx(
                styles.btnBase,
                styles.btnPrimaryDark,
                styles.btnTerminalText,
                "px-4 h-8",
              )}
            >
              Complete Profile
            </Link>
          </div>
        </div>
      )}
      <HeroSection
        title={getTitle()}
        showTVL={true}
        showNavigation={true}
        showDivider={false}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <ContentWrapper className={styles.contentArea}>
        {activeTab === "marketplace" ? (
          <MarketplaceContent />
        ) : (
          <PortfolioView />
        )}
      </ContentWrapper>
    </>
  );
}
