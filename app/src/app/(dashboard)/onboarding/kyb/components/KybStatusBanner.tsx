"use client";

import type { KybSubmission } from "@/types/kyb";
import ResubmissionChecklist from "./ResubmissionChecklist";

interface KybStatusBannerProps {
  submission: KybSubmission;
}

export default function KybStatusBanner({ submission }: KybStatusBannerProps) {
  const { status, attestation_tx, rejection_reason, resubmission_items } =
    submission;

  if (status === "submitted") {
    return (
      <Banner variant="info">
        <p className="font-medium">Your submission is under review</p>
        <p className="text-sm mt-1">
          We will notify you once the review is complete.
        </p>
      </Banner>
    );
  }

  if (status === "approved" && attestation_tx) {
    return (
      <Banner variant="success">
        <p className="font-medium">
          KYB Approved &mdash; Attestation confirmed
        </p>
        <p className="text-sm mt-1 break-all">Transaction: {attestation_tx}</p>
      </Banner>
    );
  }

  if (status === "approved" && !attestation_tx) {
    return (
      <Banner variant="warning">
        <p className="font-medium">
          Approved &mdash; Awaiting on-chain attestation
        </p>
        <p className="text-sm mt-1">
          Your KYB has been approved. The on-chain attestation is being
          processed.
        </p>
      </Banner>
    );
  }

  if (status === "resubmission_requested") {
    return (
      <Banner variant="warning">
        <p className="font-medium">Resubmission requested</p>
        <p className="text-sm mt-1 mb-3">
          Please address the following items and resubmit:
        </p>
        {resubmission_items && resubmission_items.length > 0 && (
          <ResubmissionChecklist items={resubmission_items} />
        )}
      </Banner>
    );
  }

  if (status === "rejected") {
    return (
      <Banner variant="error">
        <p className="font-medium">Your KYB submission has been rejected</p>
        {rejection_reason && <p className="text-sm mt-1">{rejection_reason}</p>}
      </Banner>
    );
  }

  if (status === "revoked") {
    return (
      <Banner variant="error">
        <p className="font-medium">Your KYB attestation has been revoked</p>
        <p className="text-sm mt-1">
          Please contact support for more information.
        </p>
      </Banner>
    );
  }

  return null;
}

type BannerVariant = "info" | "success" | "warning" | "error";

const variantStyles: Record<BannerVariant, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-900",
  success: "bg-green-50 border-green-200 text-green-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  error: "bg-red-50 border-red-200 text-red-900",
};

function Banner({
  variant,
  children,
}: {
  variant: BannerVariant;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-4 ${variantStyles[variant]}`}>
      {children}
    </div>
  );
}
