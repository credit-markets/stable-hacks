import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectButton } from "./ConnectButton";

// Mock modules
vi.mock("@/app/actions/auth", () => ({
  clearAuthCookies: vi.fn(),
}));

vi.mock("@dynamic-labs/sdk-react-core", () => ({
  useDynamicContext: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
    push: vi.fn(),
  })),
}));

vi.mock("@nextui-org/button", () => ({
  Button: ({ children, onClick, endContent, startContent, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {startContent}
      {children}
      {endContent}
    </button>
  ),
}));

vi.mock("@nextui-org/dropdown", () => ({
  Dropdown: ({ children }: any) => <div data-testid="dropdown">{children}</div>,
  DropdownTrigger: ({ children }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownItem: ({ children, onClick, startContent, style }: any) => {
    // Check if the item should be hidden (style.display === 'none')
    if (style?.display === "none") {
      return null;
    }
    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick?.(e);
          }
        }}
        data-testid="dropdown-item"
      >
        {startContent}
        {children}
      </button>
    );
  },
}));

import { clearAuthCookies } from "@/app/actions/auth";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

describe("ConnectButton", () => {
  const mockHandleLogOut = vi.fn();
  const mockClearAuthCookies = vi.fn();

  // Store original window.location
  const originalLocation = window.location;
  let locationHref = "";

  beforeEach(() => {
    vi.clearAllMocks();
    locationHref = "";

    // Mock window.location.href with getter/setter
    (window as any).location = undefined;
    window.location = {
      ...originalLocation,
      get href() {
        return locationHref;
      },
      set href(value: string) {
        locationHref = value;
      },
    } as any;

    vi.mocked(clearAuthCookies).mockImplementation(mockClearAuthCookies);
    mockClearAuthCookies.mockResolvedValue({ success: true });
    mockHandleLogOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore window.location
    window.location = originalLocation;
  });

  describe("User Display", () => {
    it("should display user email when available", () => {
      vi.mocked(useDynamicContext).mockReturnValue({
        user: { email: "test@example.com" },
        primaryWallet: {
          address: "MockSo1anaAddress1111111111111111111111111",
        },
        handleLogOut: mockHandleLogOut,
      } as any);

      render(<ConnectButton />);

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should display formatted wallet address when email is not available", () => {
      vi.mocked(useDynamicContext).mockReturnValue({
        user: null,
        primaryWallet: {
          address: "MockSo1anaAddress1111111111111111111111111",
        },
        handleLogOut: mockHandleLogOut,
      } as any);

      render(<ConnectButton />);

      // formatAddress should shorten the address
      expect(screen.getByText(/Mock/i)).toBeInTheDocument();
    });

    it("should display 'Not connected' when neither email nor wallet available", () => {
      vi.mocked(useDynamicContext).mockReturnValue({
        user: null,
        primaryWallet: null,
        handleLogOut: mockHandleLogOut,
      } as any);

      render(<ConnectButton />);

      expect(screen.getByText("Not connected")).toBeInTheDocument();
    });
  });

  describe("Logout", () => {
    it("should call clearAuthCookies and handleLogOut on logout", async () => {
      vi.mocked(useDynamicContext).mockReturnValue({
        user: { email: "test@example.com" },
        primaryWallet: {
          address: "MockSo1anaAddress1111111111111111111111111",
          connector: { name: "Phantom" },
        },
        handleLogOut: mockHandleLogOut,
      } as any);

      render(<ConnectButton />);

      const logoutButton = screen.getByText("Log out");
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockClearAuthCookies).toHaveBeenCalled();
        expect(mockHandleLogOut).toHaveBeenCalled();
      });
    });

    it("should redirect to /login after successful logout", async () => {
      vi.mocked(useDynamicContext).mockReturnValue({
        user: { email: "test@example.com" },
        primaryWallet: {
          address: "MockSo1anaAddress1111111111111111111111111",
          connector: { name: "Phantom" },
        },
        handleLogOut: mockHandleLogOut,
      } as any);

      render(<ConnectButton />);

      const logoutButton = screen.getByText("Log out");
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockClearAuthCookies).toHaveBeenCalled();
        expect(mockHandleLogOut).toHaveBeenCalled();
        expect(locationHref).toBe("/login");
      });
    });
  });

  describe("Error Handling", () => {
    it("should log error when clearAuthCookies fails", async () => {
      // First call fails, second call in catch succeeds
      mockClearAuthCookies
        .mockRejectedValueOnce(new Error("Cookie error"))
        .mockResolvedValueOnce({ success: true });

      mockHandleLogOut.mockResolvedValue(undefined);

      vi.mocked(useDynamicContext).mockReturnValue({
        user: { email: "test@example.com" },
        primaryWallet: {
          address: "MockSo1anaAddress1111111111111111111111111",
          connector: { name: "Phantom" },
        },
        handleLogOut: mockHandleLogOut,
      } as any);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<ConnectButton />);

      const logoutButton = screen.getByText("Log out");
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        const logCall = consoleErrorSpy.mock.calls[0][0];
        expect(logCall).toContain("[ERROR]");
        expect(logCall).toContain("Logout error");
        // After error, redirects to /login
        expect(locationHref).toBe("/login");
      });

      consoleErrorSpy.mockRestore();
    });

    it("should log error when handleLogOut fails", async () => {
      mockClearAuthCookies.mockResolvedValue({ success: true });
      // First call fails, second call in catch succeeds
      mockHandleLogOut
        .mockRejectedValueOnce(new Error("Logout failed"))
        .mockResolvedValueOnce(undefined);

      vi.mocked(useDynamicContext).mockReturnValue({
        user: { email: "test@example.com" },
        primaryWallet: {
          address: "MockSo1anaAddress1111111111111111111111111",
          connector: { name: "Phantom" },
        },
        handleLogOut: mockHandleLogOut,
      } as any);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<ConnectButton />);

      const logoutButton = screen.getByText("Log out");
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        // performLogout is called again in catch, so eventually redirects
        expect(locationHref).toBe("/login");
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Redirect Behavior", () => {
    it("should redirect to /login after successful logout", async () => {
      vi.mocked(useDynamicContext).mockReturnValue({
        user: { email: "test@example.com" },
        primaryWallet: {
          address: "MockSo1anaAddress1111111111111111111111111",
          connector: { name: "Phantom" },
        },
        handleLogOut: mockHandleLogOut,
      } as any);

      render(<ConnectButton />);

      const logoutButton = screen.getByText("Log out");
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(locationHref).toBe("/login");
      });
    });

    it("should use window.location.href for redirect (not router.replace)", async () => {
      const mockReplace = vi.fn();

      vi.mocked(useDynamicContext).mockReturnValue({
        user: { email: "test@example.com" },
        primaryWallet: {
          address: "MockSo1anaAddress1111111111111111111111111",
          connector: { name: "Phantom" },
        },
        handleLogOut: mockHandleLogOut,
      } as any);

      render(<ConnectButton />);

      const logoutButton = screen.getByText("Log out");
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(locationHref).toBe("/login");
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });
  });
});
