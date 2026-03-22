"use client";

import useUserRole from "@/hooks/useUserRole";
import { cx, styles } from "@/lib/styleClasses";
import { kybService } from "@/services/kybService";
import type { KybStatus, KybSubmission } from "@/types/kyb";

import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { Textarea } from "@nextui-org/input";
import { Switch } from "@nextui-org/switch";
import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import AttesterActionModals from "./AttesterActionModals";
import RiskScoringForm from "./RiskScoringForm";

const STATUS_COLORS: Record<
  KybStatus,
  "warning" | "primary" | "success" | "danger" | "secondary" | "default"
> = {
  draft: "default",
  submitted: "warning",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
  resubmission_requested: "secondary",
  revoked: "default",
};

const STATUS_LABELS: Record<KybStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  resubmission_requested: "Resubmission Requested",
  revoked: "Revoked",
};

export default function AttesterActionsPanel({
  submission,
}: {
  submission: KybSubmission;
}) {
  const { data: roles } = useUserRole();
  const isAttester = roles?.isAttester ?? false;
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [eddRequired, setEddRequired] = useState(submission.edd_required);
  const [eddNotes, setEddNotes] = useState(submission.edd_notes || "");
  const [reviewerNotes, setReviewerNotes] = useState(
    submission.reviewer_notes || "",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAutoSave = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await kybService.updateReview(submission.id, data);
      } catch (err) {
        toast.error("Failed to save review data");
      }
    },
    [submission.id],
  );

  const debouncedAutoSave = useCallback(
    (data: Record<string, unknown>) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        handleAutoSave(data);
      }, 1000);
    },
    [handleAutoSave],
  );

  const handleRiskUpdate = useCallback(
    (data: Record<string, unknown>) => {
      handleAutoSave(data);
    },
    [handleAutoSave],
  );

  const handleEddChange = useCallback(
    (checked: boolean) => {
      setEddRequired(checked);
      handleAutoSave({ edd_required: checked });
    },
    [handleAutoSave],
  );

  const handleEddNotesBlur = useCallback(() => {
    debouncedAutoSave({ edd_notes: eddNotes });
  }, [eddNotes, debouncedAutoSave]);

  const handleReviewerNotesBlur = useCallback(() => {
    debouncedAutoSave({ reviewer_notes: reviewerNotes });
  }, [reviewerNotes, debouncedAutoSave]);

  return (
    <div className={cx(styles.card, styles.cardPadding, "space-y-5")}>
      <div className="flex items-center justify-between">
        <h2 className={styles.headingMd}>Review</h2>
        <Chip size="sm" variant="flat" color={STATUS_COLORS[submission.status]}>
          {STATUS_LABELS[submission.status]}
        </Chip>
      </div>

      <RiskScoringForm submission={submission} onUpdate={handleRiskUpdate} />

      <div className="space-y-3 pt-3 border-t border-subtle">
        <div className="flex items-center justify-between">
          <span className={styles.labelPrimary}>Enhanced Due Diligence</span>
          <Switch
            isSelected={eddRequired}
            onValueChange={handleEddChange}
            size="sm"
            aria-label="EDD Required"
          />
        </div>
        {eddRequired && (
          <Textarea
            label="EDD Notes"
            labelPlacement="outside"
            placeholder="Describe EDD requirements..."
            variant="bordered"
            size="sm"
            value={eddNotes}
            onChange={(e) => setEddNotes(e.target.value)}
            onBlur={handleEddNotesBlur}
            minRows={2}
          />
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-subtle">
        <span className={styles.labelPrimary}>Reviewer Notes</span>
        <Textarea
          placeholder="Internal notes about this review..."
          variant="bordered"
          size="sm"
          value={reviewerNotes}
          onChange={(e) => setReviewerNotes(e.target.value)}
          onBlur={handleReviewerNotesBlur}
          minRows={3}
        />
      </div>

      <div className="pt-3 border-t border-subtle">
        {submission.status === "submitted" && (
          <div className="flex flex-col gap-2">
            {isAttester && (
              <Button
                color="primary"
                size="sm"
                fullWidth
                onPress={() => setActiveModal("approve")}
              >
                Approve
              </Button>
            )}
            {isAttester && (
              <div className="flex gap-2">
                <Button
                  color="default"
                  variant="flat"
                  size="sm"
                  className="flex-1"
                  onPress={() => setActiveModal("reject")}
                >
                  Reject
                </Button>
                <Button
                  color="default"
                  variant="flat"
                  size="sm"
                  className="flex-1"
                  onPress={() => setActiveModal("resubmission")}
                >
                  Resubmission
                </Button>
              </div>
            )}
            {!isAttester && (
              <p className="text-xs text-text-muted text-center">
                Only the attester wallet can manage attestations
              </p>
            )}
          </div>
        )}
        {submission.status === "approved" && isAttester && (
          <Button
            color="default"
            variant="flat"
            size="sm"
            fullWidth
            onPress={() => setActiveModal("revoke")}
          >
            Revoke Approval
          </Button>
        )}
      </div>

      <AttesterActionModals
        submission={submission}
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
