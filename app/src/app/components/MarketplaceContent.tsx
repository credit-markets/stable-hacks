"use client";

import {
  OnboardingCard,
  type OnboardingStep,
  type StepStatus,
} from "@/components/OnboardingCard";
import { Opportunities } from "@/components/Opportunities";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useMyKyb } from "@/hooks/kyb";
import { usePoolsQuery } from "@/hooks/pools/usePoolsQuery";
import { styles } from "@/lib/styleClasses";
import { useRouter } from "next/navigation";

const KYB_STEPS = [
  { id: "pre-screen", label: "Pre-Screening" },
  { id: "company-ownership", label: "Company & Ownership" },
  { id: "representations", label: "Representations" },
  { id: "review-submit", label: "Review & Submit" },
];

function getSubtitle(status: string | undefined): string {
  if (status === "submitted" || status === "under_review")
    return "Your submission is under review. We will notify you once complete.";
  if (status === "approved")
    return "Your business verification has been approved.";
  return "Complete your business verification to access credit facilities.";
}

export function MarketplaceContent() {
  const router = useRouter();
  const { data: submission, isLoading: isKybLoading } = useMyKyb();
  const { isLoading: isPoolsLoading } = usePoolsQuery({
    sortBy: "target_return_rate",
    sortOrder: "descending",
  });
  const isLoading = isKybLoading || isPoolsLoading;

  const stepCompleted = submission?.step_completed ?? 0;
  const status = submission?.status;
  const isTerminal =
    status === "approved" || status === "rejected" || status === "revoked";
  const isUnderReview = status === "submitted";

  function getStepStatus(index: number): StepStatus {
    if (isUnderReview) {
      return index === KYB_STEPS.length - 1 ? "review" : "completed";
    }
    const stepNumber = index + 1;
    if (stepNumber <= stepCompleted) return "completed";
    if (stepNumber === stepCompleted + 1) return "active";
    return "pending";
  }

  const steps: OnboardingStep[] = KYB_STEPS.map((step, index) => {
    const stepStatus = getStepStatus(index);
    return {
      id: step.id,
      title: step.label,
      status: stepStatus,
      actionLabel:
        !isUnderReview && stepStatus === "active" ? "Continue" : undefined,
      onAction:
        !isUnderReview && stepStatus === "active"
          ? () => router.push("/onboarding/kyb")
          : undefined,
    };
  });

  const showOnboarding = !isTerminal;

  if (isLoading) {
    return <LoadingOverlay height="lg" />;
  }

  return (
    <div className={styles.sectionGap}>
      {showOnboarding ? (
        <section id="onboarding">
          <OnboardingCard
            steps={steps}
            title="Onboarding"
            subtitle={getSubtitle(status)}
          />
        </section>
      ) : (
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(57, 57, 57, 0.2) 15%, rgba(57, 57, 57, 0.2) 85%, transparent)",
          }}
        />
      )}

      <Opportunities />
    </div>
  );
}
