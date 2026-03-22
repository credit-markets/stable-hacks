import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseUserRole = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useUserRole", () => ({
  default: mockUseUserRole,
  useUserRole: mockUseUserRole,
}));

vi.mock("@/components/ConnectButton", () => ({
  ConnectButton: () => <div data-testid="connect-button">ConnectButton</div>,
}));

vi.mock("@/components/ui/LoadingOverlay", () => ({
  LoadingOverlay: () => <div>Loading...</div>,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/styleClasses", () => ({
  styles: {
    headingMd: "heading-md",
    labelPrimary: "label-primary",
  },
  cx: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import AdminLayout from "./layout";

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Credit Markets Admin' heading", () => {
    mockUseUserRole.mockReturnValue({
      data: { isAdmin: true },
      isLoading: false,
    });

    render(
      <AdminLayout>
        <div>child</div>
      </AdminLayout>,
    );

    expect(screen.getByText("Credit Markets Admin")).toBeInTheDocument();
  });

  it("shows all 5 tabs when isRolesLoading is true", () => {
    mockUseUserRole.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <AdminLayout>
        <div>child</div>
      </AdminLayout>,
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Pools")).toBeInTheDocument();
    expect(screen.getByText("Managers")).toBeInTheDocument();
    expect(screen.getByText("KYB Queue")).toBeInTheDocument();
    expect(screen.getByText("Event Log")).toBeInTheDocument();
  });

  it("shows all 5 tabs when roles.isAdmin is true", () => {
    mockUseUserRole.mockReturnValue({
      data: { isAdmin: true },
      isLoading: false,
    });

    render(
      <AdminLayout>
        <div>child</div>
      </AdminLayout>,
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Pools")).toBeInTheDocument();
    expect(screen.getByText("Managers")).toBeInTheDocument();
    expect(screen.getByText("KYB Queue")).toBeInTheDocument();
    expect(screen.getByText("Event Log")).toBeInTheDocument();
  });

  it("shows only non-adminOnly tabs when roles.isAdmin is false", () => {
    mockUseUserRole.mockReturnValue({
      data: { isAdmin: false },
      isLoading: false,
    });

    render(
      <AdminLayout>
        <div>child</div>
      </AdminLayout>,
    );

    expect(screen.getByText("KYB Queue")).toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Pools")).not.toBeInTheDocument();
    expect(screen.queryByText("Managers")).not.toBeInTheDocument();
    expect(screen.queryByText("Event Log")).not.toBeInTheDocument();
  });

  it("each tab Link href is prefixed with /admin", () => {
    mockUseUserRole.mockReturnValue({
      data: { isAdmin: true },
      isLoading: false,
    });

    render(
      <AdminLayout>
        <div>child</div>
      </AdminLayout>,
    );

    const usersLink = screen.getByText("Users").closest("a");
    const poolsLink = screen.getByText("Pools").closest("a");
    const managersLink = screen.getByText("Managers").closest("a");
    const kybLink = screen.getByText("KYB Queue").closest("a");
    const eventsLink = screen.getByText("Event Log").closest("a");

    expect(usersLink).toHaveAttribute("href", "/admin/users");
    expect(poolsLink).toHaveAttribute("href", "/admin/pools");
    expect(managersLink).toHaveAttribute("href", "/admin/managers");
    expect(kybLink).toHaveAttribute("href", "/admin/kyb-queue");
    expect(eventsLink).toHaveAttribute("href", "/admin/events");
  });
});
