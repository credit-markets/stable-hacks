"use client";

import { CircularProgress } from "@/components/CircularProgress";
import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { Check, ChevronRight, Clock } from "lucide-react";

export type StepStatus = "completed" | "active" | "pending" | "review";

export interface OnboardingStep {
  id: string;
  title: string;
  status: StepStatus;
  actionLabel?: string;
  onAction?: () => void;
}

interface OnboardingCardProps {
  steps: OnboardingStep[];
  title?: string;
  subtitle?: string;
}

/**
 * Geometric background pattern - rotated diamond grid
 * Inspired by the LP's REQUEST ACCESS section
 */
function GeometricPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Diagonal grid lines */}
      <div className="absolute inset-0 opacity-[0.15]">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="onboarding-grid"
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
          <rect width="100%" height="100%" fill="url(#onboarding-grid)" />
        </svg>
      </div>
    </div>
  );
}

export function OnboardingCard({
  steps,
  title = "Onboarding",
  subtitle = "Start lending to your first pool by completing verification.",
}: OnboardingCardProps) {
  const hasReview = steps.some((s) => s.status === "review");
  const doneCount = steps.filter(
    (s) => s.status === "completed" || s.status === "review",
  ).length;
  const progress = (doneCount / steps.length) * 100;
  const allComplete = doneCount === steps.length;

  return (
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
      <div
        className={cx(
          "absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent to-transparent",
          allComplete ? "via-terminal-green/50" : "via-strategic-blue/50",
        )}
      />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-start justify-between p-6 gap-4">
        <div className="space-y-1.5">
          <h3 className={cx(styles.sectionTitle, styles.onDark.primary)}>
            {title}
          </h3>
          <p className={cx(styles.bodyMd, styles.onDark.secondary, "max-w-md")}>
            {subtitle}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <CircularProgress
            value={progress}
            size={40}
            strokeWidth={2.5}
            color={hasReview ? "#fbbf24" : undefined}
          />
          <span className={cx(styles.valueSm, styles.onDark.primary)}>
            {doneCount}/{steps.length}
          </span>
        </div>
      </div>

      {/* Steps Grid */}
      <div className="relative px-6 pb-6">
        <div
          className={cx(
            "grid grid-cols-1 gap-3",
            steps.length <= 3 && "md:grid-cols-3",
            steps.length === 4 && "md:grid-cols-2 lg:grid-cols-4",
            steps.length >= 5 && "md:grid-cols-3 lg:grid-cols-5",
          )}
        >
          {steps.map((step, index) => (
            <StepCard key={step.id} step={step} stepNumber={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  stepNumber,
}: {
  step: OnboardingStep;
  stepNumber: number;
}) {
  const isActive = step.status === "active";
  const isCompleted = step.status === "completed";
  const isPending = step.status === "pending";
  const isReview = step.status === "review";

  return (
    <div
      className={cx(
        "relative p-5 rounded-md transition-all duration-200",
        // Frosted glass effect with border
        "bg-white/[0.08] backdrop-blur-sm",
        "border border-white/10",
        // Active: elevated with blue accent
        isActive && "bg-white/[0.12] border-strategic-blue/40 shadow-lg",
        // Review: subtle amber accent
        isReview && "bg-white/[0.10] border-amber-400/30",
        // Pending: slightly muted but still visible
        isPending && "opacity-65",
      )}
    >
      {/* Active top accent bar */}
      {isActive && (
        <div className="absolute top-0 left-4 right-4 h-[2px] bg-strategic-blue rounded-full" />
      )}
      {isReview && (
        <div className="absolute top-0 left-4 right-4 h-[2px] bg-amber-400 rounded-full" />
      )}

      {/* Step number badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cx(
            styles.caption,
            "font-semibold uppercase tracking-wider",
            isCompleted && "text-strategic-blue",
            isActive && "text-strategic-blue",
            isReview && "text-amber-400",
            isPending && styles.onDark.subtle,
          )}
        >
          Step {stepNumber}
        </span>
        <StatusIndicator status={step.status} />
      </div>

      {/* Title */}
      <h4
        className={cx(
          styles.valueSm,
          "mb-4",
          isCompleted && styles.onDark.secondary,
          isActive && styles.onDark.primary,
          isReview && styles.onDark.primary,
          isPending && styles.onDark.muted,
        )}
      >
        {step.title}
      </h4>

      {/* Action area */}
      <div className="mt-auto">
        {isCompleted && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-strategic-blue">
              <Check className="w-4 h-4" strokeWidth={2.5} />
              <span className={cx(styles.caption, "font-medium")}>
                Complete
              </span>
            </div>
            {step.onAction && (
              <button
                type="button"
                onClick={step.onAction}
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        )}
        {isReview && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-4 h-4" strokeWidth={2.5} />
            <span className={cx(styles.caption, "font-medium")}>
              Under Review
            </span>
          </div>
        )}
        {isActive && step.actionLabel && (
          <Button
            size="sm"
            className="group bg-strategic-blue hover:bg-strategic-blue/80 text-deep-black font-semibold text-xs px-4 py-2 h-auto min-w-0 rounded-md shadow-md"
            onClick={step.onAction}
          >
            {step.actionLabel}
            <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        )}
        {isPending && (
          <span className={cx(styles.caption, styles.onDark.subtle)}>
            Waiting...
          </span>
        )}
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: StepStatus }) {
  return (
    <div
      className={cx(
        "w-2 h-2 rounded-full",
        status === "completed" && "bg-strategic-blue",
        status === "active" && "bg-strategic-blue",
        status === "review" && "bg-amber-400",
        status === "pending" && "bg-white/30",
      )}
    />
  );
}

// Default steps configuration for testing
export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "basic-info",
    title: "Basic Info",
    status: "completed",
  },
  {
    id: "verification",
    title: "Identity Verification",
    status: "active",
    actionLabel: "Get Started",
  },
  {
    id: "deposit",
    title: "Deposit Funds",
    status: "pending",
  },
];

export default OnboardingCard;
