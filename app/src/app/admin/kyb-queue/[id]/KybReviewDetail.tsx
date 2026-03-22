"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useKybReview } from "@/hooks/kyb";
import { styles } from "@/lib/styleClasses";
import AttesterActionsPanel from "./AttesterActionsPanel";
import SubmissionDataPanel from "./SubmissionDataPanel";

export default function KybReviewDetail({ id }: { id: string }) {
  const { data: submission, isLoading } = useKybReview(id);

  if (isLoading) {
    return <LoadingOverlay height="lg" />;
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className={styles.bodyMd}>Submission not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "KYB Queue", href: "/admin/kyb-queue" },
          { label: submission.legal_name || "Review" },
        ]}
      />
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 overflow-y-auto">
          <SubmissionDataPanel submission={submission} />
        </div>
        <div className="w-80 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          <AttesterActionsPanel submission={submission} />
        </div>
      </div>
    </div>
  );
}
