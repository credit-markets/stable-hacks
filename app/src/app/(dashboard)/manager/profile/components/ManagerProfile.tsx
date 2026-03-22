import { ContentWrapper } from "@/components/HeroSection";
import { OpportunitiesGrid } from "@/components/OpportunitiesGrid";
import { ProfileLogo } from "@/components/ProfileLogo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ContentReveal } from "@/components/ui/skeletons";
import { cx, styles } from "@/lib/styleClasses";
import { calculatePoolTvl } from "@/lib/utils/tvl";
import { poolService } from "@/services/poolService";
import type { ManagerProfileResponse } from "@/types/manager";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Button } from "@nextui-org/button";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Globe, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ManagerProfileProps {
  profile: ManagerProfileResponse;
  isOwner?: boolean;
  hideActions?: boolean;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ManagerProfile({
  profile,
  isOwner = false,
  hideActions = false,
}: ManagerProfileProps) {
  const router = useRouter();
  const { user } = useDynamicContext();

  // Fetch pools for this manager
  const { data: poolsData, isLoading: isLoadingPools } = useQuery({
    queryKey: ["managerPools", profile.owner_address],
    queryFn: () => poolService.getManagerPools(),
    enabled: !!profile.owner_address && !!user,
  });

  // Prepare pagination for OpportunitiesGrid
  const paginationProps = useMemo(
    () => ({
      next: () => {},
      prev: () => {},
      pageNumber: 1,
      pageSize: poolsData?.data?.length || 0,
      hasMore: false,
    }),
    [poolsData],
  );

  // Compute key figures from pool data
  const pools = poolsData?.data || [];
  const totalPools = pools.length;
  const activePools = pools.filter((p) => !!p.on_chain_address).length;
  const capitalOperated = pools.reduce((sum, p) => {
    const tvl = calculatePoolTvl(
      p.onChainData?.totalShares,
      p.onChainData?.pricePerShare,
    );
    return sum + (tvl ?? 0);
  }, 0);

  return (
    <ContentWrapper className="py-6">
      <div className={styles.sectionGap}>
        {/* Back Navigation + Edit Button */}
        {!hideActions && (
          <div className="flex justify-between items-center">
            <Breadcrumb
              items={[
                { label: "Dashboard", href: "/" },
                {
                  label: "Manager",
                  href: isOwner ? "/manager" : undefined,
                },
                { label: "Profile" },
              ]}
            />
            {isOwner && (
              <Button
                onPress={() => router.push("/manager/profile/edit")}
                className={cx(
                  styles.btnBase,
                  styles.btnPrimary,
                  "text-[10px] font-mono uppercase tracking-wider px-3 h-7",
                )}
                startContent={<SquarePen size={11} />}
              >
                Edit Details
              </Button>
            )}
          </div>
        )}

        {/* Merged Profile Card -- identity + overview */}
        <div className={cx(styles.card, styles.cardPaddingLg)}>
          {/* Identity row */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-4">
              <ProfileLogo
                className="rounded-lg w-14 h-14 border border-subtle"
                imageUrl={profile.logo_path ?? undefined}
                name={profile.company_name}
              />
              <div>
                <h1 className={styles.headingLg}>{profile.company_name}</h1>
              </div>
            </div>
            {profile.website && (
              <Button
                as="a"
                href={
                  profile.website.startsWith("http")
                    ? profile.website
                    : `https://${profile.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                className={cx(styles.btnBase, styles.btnSecondary, "px-4 h-8")}
                startContent={<Globe size={14} />}
              >
                Website
              </Button>
            )}
          </div>

          {/* Divider */}
          {profile.overview && <div className={cx(styles.divider, "mb-4")} />}

          {/* Overview */}
          {profile.overview && (
            <Markdown
              remarkPlugins={[remarkGfm]}
              className="prose prose-sm max-w-full text-text-secondary leading-relaxed"
            >
              {profile.overview}
            </Markdown>
          )}
        </div>

        {/* Key Figures Card */}
        <div className={cx(styles.card, "px-6 py-5")}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            <div className="pr-5">
              <div className={cx(styles.labelPrimary, "mb-1.5")}>
                Capital Operated
              </div>
              <div className={styles.valueLg}>
                {capitalOperated > 0 ? formatUsd(capitalOperated) : "---"}
              </div>
              <div className={cx(styles.bodySm, "text-text-muted mt-0.5")}>
                Across all pools
              </div>
            </div>
            <div className="px-5 border-l border-subtle">
              <div className={cx(styles.labelPrimary, "mb-1.5")}>
                Volume Processed
              </div>
              <div className={styles.valueLg}>---</div>
              <div className={cx(styles.bodySm, "text-text-muted mt-0.5")}>
                Lifetime
              </div>
            </div>
            <div className="px-5 border-l border-subtle">
              <div className={cx(styles.labelPrimary, "mb-1.5")}>
                Default Rate
              </div>
              <div className={styles.valueLg}>---</div>
              <div className={cx(styles.bodySm, "text-text-muted mt-0.5")}>
                Weighted average
              </div>
            </div>
            <div className="pl-5 border-l border-subtle">
              <div className={cx(styles.labelPrimary, "mb-1.5")}>Pools</div>
              <div className={styles.valueLg}>{totalPools}</div>
              <div className={cx(styles.bodySm, "text-text-muted mt-0.5")}>
                {activePools} active
              </div>
            </div>
          </div>
        </div>

        {/* Pools Section */}
        <section className="space-y-6">
          <h2 className={styles.headingMd}>Pools</h2>
          {isLoadingPools ? (
            <LoadingOverlay height="md" />
          ) : poolsData?.data && poolsData.data.length > 0 ? (
            <ContentReveal variant="fade-up">
              <OpportunitiesGrid
                opportunities={poolsData}
                fetch={paginationProps}
              />
            </ContentReveal>
          ) : (
            <p className={styles.bodyMd}>
              No pools registered by this company yet.
            </p>
          )}
        </section>
      </div>
    </ContentWrapper>
  );
}
