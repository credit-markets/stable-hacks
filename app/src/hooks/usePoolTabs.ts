"use client";

import type { PoolSection } from "@/services/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

interface UsePoolTabsOptions {
  sections: PoolSection[] | undefined;
  hasDocs: boolean;
  hasAssetPurchaseRules: boolean;
}

export interface PoolTab {
  id: string;
  label: string;
  type: "section" | "asset-rules" | "documents";
  sectionIndex?: number;
}

export function usePoolTabs({
  sections,
  hasDocs,
  hasAssetPurchaseRules,
}: UsePoolTabsOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build tabs from sections
  const tabs = useMemo<PoolTab[]>(() => {
    const result: PoolTab[] = [];

    // Add section tabs
    sections?.forEach((section, index) => {
      result.push({
        id: `section-${index}`,
        label: section.title,
        type: "section",
        sectionIndex: index,
      });
    });

    // Add Asset Purchase Rules tab if exists
    if (hasAssetPurchaseRules) {
      result.push({
        id: "asset-rules",
        label: "Asset Purchase Rules",
        type: "asset-rules",
      });
    }

    // Add Documents tab at the end if docs exist
    if (hasDocs) {
      result.push({
        id: "documents",
        label: "Documents",
        type: "documents",
      });
    }

    return result;
  }, [sections, hasDocs, hasAssetPurchaseRules]);

  // Get active tab from URL or default to first
  const activeTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      return tabParam;
    }
    return tabs[0]?.id || "";
  }, [searchParams, tabs]);

  // Update URL when tab changes
  const setActiveTab = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Get current tab data
  const currentTab = useMemo(
    () => tabs.find((t) => t.id === activeTab),
    [tabs, activeTab],
  );

  return {
    tabs,
    activeTab,
    setActiveTab,
    currentTab,
  };
}
