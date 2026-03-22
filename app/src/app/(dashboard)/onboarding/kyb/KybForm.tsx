"use client";

import {
  OnboardingCard,
  type OnboardingStep,
} from "@/components/OnboardingCard";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ContentReveal } from "@/components/ui/skeletons/ContentReveal";
import { useCreateKybDraft, useMyKyb } from "@/hooks/kyb";
import { cx, styles } from "@/lib/styleClasses";
import type { KybSubmission } from "@/types/kyb";
import { Button } from "@nextui-org/button";
import { useEffect, useState } from "react";
import KybStatusBanner from "./components/KybStatusBanner";
import ResubmissionChecklist from "./components/ResubmissionChecklist";
import CompanyOwnershipStep from "./steps/CompanyOwnershipStep";
import PreScreenStep from "./steps/PreScreenStep";
import RepresentationsStep from "./steps/RepresentationsStep";
import ReviewSubmitStep from "./steps/ReviewSubmitStep";

const KYB_STEPS = [
  { id: "pre-screen", label: "Pre-Screening" },
  { id: "company-ownership", label: "Company & Ownership" },
  { id: "representations", label: "Representations" },
  { id: "review-submit", label: "Review & Submit" },
];

export default function KybForm() {
  const { data: submission, isLoading, error } = useMyKyb();
  const createDraft = useCreateKybDraft();
  const [currentStep, setCurrentStep] = useState(1);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (submission && !initialized) {
      const step = Math.min((submission.step_completed ?? 0) + 1, 4);
      setCurrentStep(step);
      setInitialized(true);
    }
  }, [submission, initialized]);

  // Auto-create draft when no submission exists (skip intermediate page)
  useEffect(() => {
    if (
      !isLoading &&
      !submission &&
      !error &&
      !createDraft.isPending &&
      !createDraft.isError
    ) {
      createDraft.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    submission,
    error,
    createDraft.mutate,
    createDraft.isPending,
    createDraft.isError,
  ]);

  if (isLoading) {
    return <LoadingOverlay height="md" />;
  }

  if (error && !submission) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className={styles.bodyMd}>
          No KYB submission found. Start your business verification to access
          the platform.
        </p>
        <Button
          className={cx(styles.btnBase, styles.btnPrimary, styles.btnMd)}
          onPress={() => createDraft.mutate()}
          isLoading={createDraft.isPending}
        >
          Start KYB Application
        </Button>
      </div>
    );
  }

  if (!submission) {
    return <LoadingOverlay height="md" />;
  }

  const isEditable =
    submission.status === "draft" ||
    submission.status === "resubmission_requested";

  if (!isEditable) {
    const isUnderReview = submission.status === "submitted";
    const completedSteps: OnboardingStep[] = KYB_STEPS.map((step, index) => ({
      id: step.id,
      title: step.label,
      status:
        isUnderReview && index === KYB_STEPS.length - 1
          ? ("review" as const)
          : ("completed" as const),
    }));
    const subtitle =
      submission.status === "submitted"
        ? "Your submission is under review. We will notify you once complete."
        : submission.status === "approved"
          ? "Your business verification has been approved."
          : "Contact support for more information.";
    return (
      <div className="space-y-6">
        <OnboardingCard
          steps={completedSteps}
          title="Onboarding"
          subtitle={subtitle}
        />
        <KybStatusBanner submission={submission} />
      </div>
    );
  }

  const onboardingSteps: OnboardingStep[] = KYB_STEPS.map((step, index) => ({
    id: step.id,
    title: step.label,
    status:
      currentStep > index + 1
        ? "completed"
        : currentStep === index + 1
          ? "active"
          : "pending",
  }));

  return (
    <div className="space-y-6">
      {submission.status === "resubmission_requested" &&
        submission.resubmission_items &&
        submission.resubmission_items.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-900 mb-2">
              Please address the following items:
            </p>
            <ResubmissionChecklist items={submission.resubmission_items} />
          </div>
        )}

      <OnboardingCard
        steps={onboardingSteps}
        title="Business Verification"
        subtitle="Complete the KYB process to access institutional credit facilities."
      />

      <ContentReveal key={currentStep} delay={0.1}>
        <FormPanel
          stepNumber={currentStep}
          title={KYB_STEPS[currentStep - 1].label}
        >
          <StepContent
            step={currentStep}
            submission={submission}
            onNext={() => setCurrentStep((s) => Math.min(s + 1, 4))}
            onBack={() => setCurrentStep((s) => Math.max(s - 1, 1))}
          />
        </FormPanel>
      </ContentReveal>
    </div>
  );
}

function FormPanel({
  stepNumber,
  title,
  children,
}: {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-subtle overflow-hidden shadow-sm">
      {/* Dark header bar */}
      <div
        className="relative px-6 py-4"
        style={{
          background:
            "linear-gradient(135deg, #454545 0%, #393939 50%, #2d2d2d 100%)",
        }}
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-strategic-blue/50 to-transparent" />
        <div className="flex items-center gap-3">
          <span className="text-strategic-blue text-xs font-semibold uppercase tracking-wider">
            Step {stepNumber} of 4
          </span>
          <span className="text-white/20">|</span>
          <h2 className="text-white font-semibold text-base">{title}</h2>
        </div>
      </div>
      {/* Form content */}
      <div className="p-6 md:p-8 bg-surface-card">{children}</div>
    </div>
  );
}

function StepContent({
  step,
  submission,
  onNext,
  onBack,
}: {
  step: number;
  submission: KybSubmission;
  onNext: () => void;
  onBack: () => void;
}) {
  switch (step) {
    case 1:
      return <PreScreenStep submission={submission} onNext={onNext} />;
    case 2:
      return (
        <CompanyOwnershipStep
          submission={submission}
          onNext={onNext}
          onBack={onBack}
        />
      );
    case 3:
      return (
        <RepresentationsStep
          submission={submission}
          onNext={onNext}
          onBack={onBack}
        />
      );
    case 4:
      return <ReviewSubmitStep submission={submission} onBack={onBack} />;
    default:
      return null;
  }
}
