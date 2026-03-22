import type { KybSubmission } from "@/types/kyb";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewSubmitStep from "./ReviewSubmitStep";

const mockMutateAsync = vi.hoisted(() => vi.fn());
const mockIsPending = vi.hoisted(() => ({ value: false }));

vi.mock("@/hooks/kyb", () => ({
  useSubmitKyb: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending.value,
  }),
}));

vi.mock("@/lib/styleClasses", () => ({
  cx: (...args: unknown[]) => args.filter(Boolean).join(" "),
  styles: new Proxy(
    {},
    {
      get: (_target, prop) => `mock-${String(prop)}`,
    },
  ),
}));

vi.mock("@nextui-org/button", () => ({
  Button: ({
    children,
    onPress,
    isLoading,
    ...props
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    isLoading?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      onClick={onPress}
      data-loading={isLoading ? "true" : undefined}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

vi.mock("@nextui-org/chip", () => ({
  Chip: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="chip">{children}</span>
  ),
}));

function makeSubmission(overrides: Partial<KybSubmission> = {}): KybSubmission {
  return {
    id: "sub-1",
    user_id: "user-1",
    status: "draft",
    step_completed: 5,
    attestation_confirmed: false,
    entity_type: "company",
    jurisdiction: "US",
    is_regulated: false,
    regulator_name: null,
    license_number: null,
    legal_name: "Acme Corp",
    trading_name: "Acme",
    registration_number: "12345",
    date_of_incorporation: "2020-01-01",
    registered_address: "123 Main St",
    business_activity: "Lending",
    website: "https://acme.com",
    ownership_structure_description: "Single owner",
    source_of_funds: "Revenue",
    source_of_wealth: "Business income",
    has_pep: false,
    pep_details: null,
    has_rca: false,
    rca_details: null,
    sanctions_declaration: true,
    adverse_media_declaration: true,
    funding_route_declaration: "Wire transfer",
    authorized_signatory_declaration: true,
    accuracy_declaration: true,
    ongoing_reporting_declaration: true,
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

describe("ReviewSubmitStep", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending.value = false;
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it("renders submission review content", () => {
    render(
      <ReviewSubmitStep submission={makeSubmission()} onBack={mockOnBack} />,
    );

    expect(
      screen.getByText(
        "Please review your information below before submitting.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Submit for Review")).toBeInTheDocument();
    expect(screen.getByText("Pre-Screening")).toBeInTheDocument();
    expect(screen.getByText("Company Information")).toBeInTheDocument();
  });

  it("shows loading state on submit button while pending", () => {
    mockIsPending.value = true;

    render(
      <ReviewSubmitStep submission={makeSubmission()} onBack={mockOnBack} />,
    );

    const submitBtn = screen.getByText("Loading...");
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.closest("button")).toHaveAttribute("data-loading", "true");
  });

  it("shows confirmation view on successful submit", async () => {
    mockMutateAsync.mockResolvedValue(undefined);

    render(
      <ReviewSubmitStep submission={makeSubmission()} onBack={mockOnBack} />,
    );

    fireEvent.click(screen.getByText("Submit for Review"));

    await waitFor(() => {
      expect(screen.getByText("Submitted Successfully")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Your KYB application has been submitted for review/),
    ).toBeInTheDocument();
  });

  it("renders missing items list on error with missing array", async () => {
    mockMutateAsync.mockRejectedValue({
      response: {
        data: {
          missing: ["Legal name", "Proof of address"],
        },
      },
    });

    render(
      <ReviewSubmitStep submission={makeSubmission()} onBack={mockOnBack} />,
    );

    fireEvent.click(screen.getByText("Submit for Review"));

    await waitFor(() => {
      expect(
        screen.getByText("Missing required information:"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Legal name")).toBeInTheDocument();
    expect(screen.getByText("Proof of address")).toBeInTheDocument();
  });

  it("calls onBack when Back button is clicked", () => {
    render(
      <ReviewSubmitStep submission={makeSubmission()} onBack={mockOnBack} />,
    );

    fireEvent.click(screen.getByText("Back"));

    expect(mockOnBack).toHaveBeenCalledOnce();
  });
});
