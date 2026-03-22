import type { KybSubmission } from "@/types/kyb";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import KybStatusBanner from "./KybStatusBanner";

vi.mock("./ResubmissionChecklist", () => ({
  default: ({ items }: { items: string[] }) => (
    <ul data-testid="resubmission-checklist">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ),
}));

function makeSubmission(overrides: Partial<KybSubmission> = {}): KybSubmission {
  return {
    id: "sub-1",
    user_id: "user-1",
    status: "draft",
    step_completed: 0,
    attestation_confirmed: false,
    entity_type: null,
    jurisdiction: null,
    is_regulated: null,
    regulator_name: null,
    license_number: null,
    legal_name: null,
    trading_name: null,
    registration_number: null,
    date_of_incorporation: null,
    registered_address: null,
    business_activity: null,
    website: null,
    ownership_structure_description: null,
    source_of_funds: null,
    source_of_wealth: null,
    has_pep: null,
    pep_details: null,
    has_rca: null,
    rca_details: null,
    sanctions_declaration: null,
    adverse_media_declaration: null,
    funding_route_declaration: null,
    authorized_signatory_declaration: null,
    accuracy_declaration: null,
    ongoing_reporting_declaration: null,
    reviewed_by: null,
    reviewed_at: null,
    risk_score: null,
    risk_band: null,
    rejection_reason: null,
    reviewer_notes: null,
    edd_required: false,
    edd_notes: null,
    resubmission_items: null,
    attestation_tx: null,
    attestation_expires_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ubos: [],
    documents: [],
    wallets: [],
    ...overrides,
  };
}

describe("KybStatusBanner", () => {
  it("renders 'under review' info banner when status is submitted", () => {
    render(
      <KybStatusBanner submission={makeSubmission({ status: "submitted" })} />,
    );

    expect(
      screen.getByText("Your submission is under review"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("We will notify you once the review is complete."),
    ).toBeInTheDocument();
  });

  it("renders success banner with tx hash when approved with attestation_tx", () => {
    render(
      <KybStatusBanner
        submission={makeSubmission({
          status: "approved",
          attestation_tx: "5abc123txhash",
        })}
      />,
    );

    expect(screen.getByText(/Attestation confirmed/)).toBeInTheDocument();
    expect(screen.getByText(/5abc123txhash/)).toBeInTheDocument();
  });

  it("renders warning banner when approved without attestation_tx", () => {
    render(
      <KybStatusBanner
        submission={makeSubmission({
          status: "approved",
          attestation_tx: null,
        })}
      />,
    );

    expect(
      screen.getByText(/Awaiting on-chain attestation/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The on-chain attestation is being processed/),
    ).toBeInTheDocument();
  });

  it("renders resubmission checklist when status is resubmission_requested with items", () => {
    render(
      <KybStatusBanner
        submission={makeSubmission({
          status: "resubmission_requested",
          resubmission_items: ["Fix company name", "Upload ID document"],
        })}
      />,
    );

    expect(screen.getByText("Resubmission requested")).toBeInTheDocument();
    expect(screen.getByTestId("resubmission-checklist")).toBeInTheDocument();
    expect(screen.getByText("Fix company name")).toBeInTheDocument();
    expect(screen.getByText("Upload ID document")).toBeInTheDocument();
  });

  it("renders rejection reason when status is rejected", () => {
    render(
      <KybStatusBanner
        submission={makeSubmission({
          status: "rejected",
          rejection_reason: "Incomplete documentation provided",
        })}
      />,
    );

    expect(
      screen.getByText("Your KYB submission has been rejected"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Incomplete documentation provided"),
    ).toBeInTheDocument();
  });

  it("renders revoked banner when status is revoked", () => {
    render(
      <KybStatusBanner submission={makeSubmission({ status: "revoked" })} />,
    );

    expect(
      screen.getByText("Your KYB attestation has been revoked"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please contact support for more information."),
    ).toBeInTheDocument();
  });

  it("returns null for draft status", () => {
    const { container } = render(
      <KybStatusBanner submission={makeSubmission({ status: "draft" })} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("returns null for unknown/unhandled status", () => {
    const { container } = render(
      <KybStatusBanner
        submission={makeSubmission({
          status: "under_review" as KybSubmission["status"],
        })}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
