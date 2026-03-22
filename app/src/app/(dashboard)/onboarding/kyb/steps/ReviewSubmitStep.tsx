"use client";

import { useSubmitKyb } from "@/hooks/kyb";
import { cx, styles } from "@/lib/styleClasses";
import type { KybSubmission } from "@/types/kyb";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { useState } from "react";
import toast from "react-hot-toast";

interface ReviewSubmitStepProps {
  submission: KybSubmission;
  onBack: () => void;
}

export default function ReviewSubmitStep({
  submission,
  onBack,
}: ReviewSubmitStepProps) {
  const submitKyb = useSubmitKyb();
  const [submitted, setSubmitted] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);

  async function handleSubmit() {
    try {
      await submitKyb.mutateAsync(submission.id);
      setSubmitted(true);
      toast.success("KYB submitted for review");
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { missing?: string[]; message?: string } };
      };
      if (error?.response?.data?.missing) {
        setMissingItems(error.response.data.missing);
        toast.error("Please complete all required fields before submitting");
      } else {
        toast.error(error?.response?.data?.message ?? "Failed to submit KYB");
      }
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-4xl">&#10003;</div>
        <h2 className={styles.headingLg}>Submitted Successfully</h2>
        <p className={styles.bodyMd}>
          Your KYB application has been submitted for review. We will notify you
          once the review is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className={styles.bodyMd}>
        Please review your information below before submitting.
      </p>

      {missingItems.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900 mb-2">
            Missing required information:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
            {missingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Pre-Screening">
        <Row label="Entity Type" value={submission.entity_type} />
        <Row label="Jurisdiction" value={submission.jurisdiction} />
        <Row label="Regulated" value={submission.is_regulated ? "Yes" : "No"} />
        {submission.is_regulated && (
          <>
            <Row label="Regulator" value={submission.regulator_name} />
            <Row label="License Number" value={submission.license_number} />
          </>
        )}
      </Section>

      <Section title="Company Information">
        <Row label="Legal Name" value={submission.legal_name} />
        <Row label="Trading Name" value={submission.trading_name} />
        <Row
          label="Registration Number"
          value={submission.registration_number}
        />
        <Row
          label="Date of Incorporation"
          value={submission.date_of_incorporation}
        />
        <Row label="Registered Address" value={submission.registered_address} />
        <Row label="Business Activity" value={submission.business_activity} />
        <Row label="Website" value={submission.website} />
      </Section>

      <Section title="Beneficial Owners & Key Persons">
        {submission.ubos.length === 0 ? (
          <p className={styles.bodySm}>No persons added</p>
        ) : (
          <div className="space-y-3">
            {submission.ubos.map((ubo) => (
              <div
                key={ubo.id}
                className="rounded border border-subtle p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {ubo.full_name || "Unnamed"}
                  </span>
                  <Chip size="sm" variant="bordered">
                    {ubo.role}
                  </Chip>
                  {ubo.ownership_percentage != null && (
                    <span className="text-xs text-text-muted">
                      {ubo.ownership_percentage}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">
                  {ubo.nationality} &middot; {ubo.country_of_residence}
                </p>
                {ubo.is_pep && (
                  <Chip size="sm" color="warning" variant="flat">
                    PEP
                  </Chip>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Source of Funds & Ownership">
        <Row
          label="Ownership Structure"
          value={submission.ownership_structure_description}
        />
        <Row label="Source of Funds" value={submission.source_of_funds} />
        <Row label="Source of Wealth" value={submission.source_of_wealth} />
      </Section>

      <Section title="PEP & RCA">
        <Row label="Has PEP" value={submission.has_pep ? "Yes" : "No"} />
        {submission.has_pep && (
          <Row label="PEP Details" value={submission.pep_details} />
        )}
        <Row label="Has RCA" value={submission.has_rca ? "Yes" : "No"} />
        {submission.has_rca && (
          <Row label="RCA Details" value={submission.rca_details} />
        )}
      </Section>

      <Section title="Compliance Declarations">
        <BoolRow
          label="Sanctions Declaration"
          value={submission.sanctions_declaration}
        />
        <BoolRow
          label="Adverse Media Declaration"
          value={submission.adverse_media_declaration}
        />
      </Section>

      <Section title="Wallet Declarations">
        {submission.wallets.length === 0 ? (
          <p className={styles.bodySm}>No wallets declared</p>
        ) : (
          <div className="space-y-2">
            {submission.wallets.map((w) => (
              <div
                key={w.id}
                className="rounded border border-subtle p-3 text-sm"
              >
                <span className="font-medium">{w.wallet_label}</span>
                <span className="mx-2 text-text-muted">&middot;</span>
                <span className="font-mono text-xs break-all">
                  {w.wallet_address}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Representations">
        <Row
          label="Funding Route"
          value={submission.funding_route_declaration}
        />
        <BoolRow
          label="Authorized Signatory"
          value={submission.authorized_signatory_declaration}
        />
        <BoolRow
          label="Accuracy Declaration"
          value={submission.accuracy_declaration}
        />
        <BoolRow
          label="Ongoing Reporting"
          value={submission.ongoing_reporting_declaration}
        />
      </Section>

      <Section title="Documents">
        {submission.documents.length === 0 ? (
          <p className={styles.bodySm}>No documents uploaded</p>
        ) : (
          <div className="space-y-1">
            {submission.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm">
                <Chip size="sm" variant="flat">
                  {doc.category
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </Chip>
                <span className="truncate">{doc.file_name}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex justify-between pt-4">
        <Button variant="bordered" onPress={onBack}>
          Back
        </Button>
        <Button
          className={cx(styles.btnBase, styles.btnPrimary, styles.btnLg)}
          onPress={handleSubmit}
          isLoading={submitKyb.isPending}
        >
          Submit for Review
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx(styles.card, styles.cardPadding, "space-y-3")}>
      <h3 className={styles.headingSm}>{title}</h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
      <span className="text-text-muted w-48 shrink-0">{label}</span>
      <span className="text-text-primary">{value || "-"}</span>
    </div>
  );
}

function BoolRow({
  label,
  value,
}: {
  label: string;
  value: boolean | null | undefined;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
      <span className="text-text-muted w-48 shrink-0">{label}</span>
      <span
        className={value ? "text-green-600 font-medium" : "text-text-secondary"}
      >
        {value ? "Confirmed" : "Not confirmed"}
      </span>
    </div>
  );
}
