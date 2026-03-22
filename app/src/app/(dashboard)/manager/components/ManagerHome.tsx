"use client";

import { ContentWrapper } from "@/components/HeroSection";
import { ProfileLogo } from "@/components/ProfileLogo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { StaggerItem, StaggerReveal } from "@/components/ui/skeletons";
import { useManagerPools } from "@/hooks/managers/useManagerPools";
import { useManagerProfile } from "@/hooks/managers/useManagerProfile";
import { cx, styles } from "@/lib/styleClasses";
import PAGES from "@/utils/pages";
import { Button } from "@nextui-org/button";
import { SquarePen } from "lucide-react";
import Link from "next/link";
import { OperatorPoolCard } from "./OperatorPoolCard";

/**
 * Geometric background pattern - rotated diamond grid
 * Same visual as OnboardingCard.tsx
 */
function GeometricPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 opacity-[0.12]">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="manager-identity-grid"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <path
                d="M 0 0 L 48 0 M 0 0 L 0 48"
                stroke="#79c2ff"
                strokeWidth="0.5"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#manager-identity-grid)" />
        </svg>
      </div>
    </div>
  );
}

export function ManagerHome() {
  const profileQuery = useManagerProfile();
  const profile = profileQuery?.data;

  const { data: pools, isLoading: isPoolsLoading } = useManagerPools();

  if (profileQuery?.isLoading) {
    return (
      <ContentWrapper className="py-6">
        <LoadingOverlay height="lg" />
      </ContentWrapper>
    );
  }

  const isProfileComplete = !!profile;

  return (
    <ContentWrapper className="py-6">
      <div className={styles.sectionGap}>
        {/* Back Navigation */}
        <Breadcrumb
          items={[{ label: "Dashboard", href: "/" }, { label: "Manager" }]}
        />

        {/* Identity Card */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #454545 0%, #393939 50%, #2d2d2d 100%)",
          }}
        >
          {/* Geometric background pattern */}
          <GeometricPattern />

          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-strategic-blue/40 to-transparent" />

          {/* Content */}
          <div className="relative px-5 py-4 flex items-center justify-between flex-wrap gap-4">
            {/* Profile Info */}
            <div className="flex items-center gap-4">
              {isProfileComplete ? (
                <>
                  <ProfileLogo
                    className="rounded-md w-10 h-10 border border-white/20"
                    imageUrl={profile.logo_path ?? undefined}
                    name={profile.company_name}
                  />
                  <p className="text-lg font-semibold text-white">
                    {profile.company_name}
                  </p>
                </>
              ) : (
                <p className="text-sm font-mono uppercase tracking-wider text-terminal-amber">
                  PROFILE INCOMPLETE
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isProfileComplete ? (
                <>
                  <Button
                    as={Link}
                    href={PAGES.MANAGER.PROFILE.OWN}
                    size="sm"
                    className="bg-white/[0.08] backdrop-blur-sm border border-white/10 text-white text-[11px] font-mono uppercase tracking-wider px-4 h-8 rounded-md hover:bg-white/[0.15] transition-all duration-150"
                  >
                    View Profile
                  </Button>
                  <Button
                    as={Link}
                    href={PAGES.MANAGER.PROFILE.EDIT}
                    size="sm"
                    className="bg-white/[0.08] backdrop-blur-sm border border-white/10 text-white text-[11px] font-mono uppercase tracking-wider px-4 h-8 rounded-md hover:bg-white/[0.15] transition-all duration-150"
                    startContent={<SquarePen size={12} />}
                  >
                    Edit
                  </Button>
                </>
              ) : (
                <Button
                  as={Link}
                  href={PAGES.MANAGER.PROFILE.EDIT}
                  size="sm"
                  className="bg-strategic-blue text-deep-black text-[11px] font-mono uppercase tracking-wider font-semibold px-4 h-8 rounded-md hover:bg-strategic-blue/80 transition-all duration-150"
                >
                  Complete Profile
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Your Pools */}
        <div>
          <h2 className={styles.headingMd}>Your Pools</h2>
        </div>
        {isPoolsLoading ? (
          <LoadingOverlay height="md" />
        ) : pools?.data && pools.data.length > 0 ? (
          <StaggerReveal
            staggerDelay={0.05}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {pools.data.map((pool) => (
              <StaggerItem key={pool.id}>
                <OperatorPoolCard pool={pool} />
              </StaggerItem>
            ))}
          </StaggerReveal>
        ) : (
          <div className={cx(styles.card, "p-8 text-center")}>
            <p className={styles.bodyMd}>No pools assigned yet.</p>
          </div>
        )}
      </div>
    </ContentWrapper>
  );
}
