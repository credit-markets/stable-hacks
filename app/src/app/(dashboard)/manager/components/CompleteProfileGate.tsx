"use client";

import { ContentWrapper } from "@/components/HeroSection";
import { cx, styles } from "@/lib/styleClasses";
import PAGES from "@/utils/pages";
import { Button } from "@nextui-org/button";
import { UserCog } from "lucide-react";
import Link from "next/link";

export function CompleteProfileGate() {
  return (
    <ContentWrapper className="py-6">
      <div className={styles.sectionGap}>
        <div
          className={cx(
            styles.card,
            "text-center py-16 px-6 flex flex-col items-center gap-6",
          )}
        >
          <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center">
            <UserCog className="w-8 h-8 text-text-muted" />
          </div>

          <div className="space-y-2">
            <h2 className={styles.headingMd}>Complete Your Manager Profile</h2>
            <p className={styles.bodyMd}>
              You need to set up your manager profile before you can create and
              manage pools on the platform.
            </p>
          </div>

          <Button
            as={Link}
            href={PAGES.MANAGER.PROFILE.EDIT}
            className={cx(
              styles.btnBase,
              styles.btnPrimary,
              "text-[11px] font-mono uppercase tracking-wider px-6 h-10",
            )}
          >
            Complete Profile
          </Button>
        </div>
      </div>
    </ContentWrapper>
  );
}
