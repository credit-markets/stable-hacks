import type { AuthState, AuthStep } from "@/types/auth";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEmailAuthHandler } from "./useEmailAuthHandler";

// Mock dependencies
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/utils/errorHandling", () => ({
  getErrorMessage: vi.fn((error: unknown) => {
    if (error instanceof Error) return error.message;
    return "Unknown error";
  }),
}));

import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/utils/errorHandling";
import toast from "react-hot-toast";

interface EmailUser {
  userId: string;
  email: string;
  verifiedCredentials?: Array<{
    address: string;
  }>;
}

// Type-safe mock function types
type SetStepFn = (step: AuthStep) => void;
type SetAuthStateFn = (state: AuthState) => void;
type PollForWalletAddressFn = (
  emailUser: EmailUser,
  maxAttempts?: number,
  intervalMs?: number,
) => Promise<string | null>;
type HandleUserAuthenticationFn = (
  address: string,
  isEmailUser: boolean,
) => Promise<void>;

describe("useEmailAuthHandler", () => {
  const mockEmailUser: EmailUser = {
    userId: "test-user-123",
    email: "test@example.com",
    verifiedCredentials: [
      { address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" },
    ],
  };

  let mockSetStep: ReturnType<typeof vi.fn<SetStepFn>>;
  let mockSetAuthState: ReturnType<typeof vi.fn<SetAuthStateFn>>;
  let mockPollForWalletAddress: ReturnType<
    typeof vi.fn<PollForWalletAddressFn>
  >;
  let mockHandleUserAuthentication: ReturnType<
    typeof vi.fn<HandleUserAuthenticationFn>
  >;
  let mockHasProcessedAuth: { current: boolean };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetStep = vi.fn<SetStepFn>();
    mockSetAuthState = vi.fn<SetAuthStateFn>();
    mockPollForWalletAddress = vi
      .fn<PollForWalletAddressFn>()
      .mockResolvedValue("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV");
    mockHandleUserAuthentication = vi
      .fn<HandleUserAuthenticationFn>()
      .mockResolvedValue(undefined);
    mockHasProcessedAuth = { current: false };
  });

  describe("Event listener setup", () => {
    it("should add event listener on mount", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "dynamic:emailAuthSuccess",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it("should remove event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "dynamic:emailAuthSuccess",
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Successful authentication flow", () => {
    it("should handle successful email auth with wallet address", async () => {
      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockPollForWalletAddress).toHaveBeenCalledWith(mockEmailUser);
        expect(mockHandleUserAuthentication).toHaveBeenCalledWith(
          "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
          true,
        );
        expect(mockHasProcessedAuth.current).toBe(true);
      });
    });

    it("should set hasProcessedAuth to true during auth flow", async () => {
      expect(mockHasProcessedAuth.current).toBe(false);

      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockHasProcessedAuth.current).toBe(true);
      });
    });
  });

  describe("Error handling", () => {
    it("should handle wallet address polling failure", async () => {
      mockPollForWalletAddress.mockResolvedValue(null);

      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "No wallet address found for email/Google user",
          undefined,
          expect.objectContaining({
            userId: mockEmailUser.userId,
            hasEmail: true,
          }),
        );
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to initialize wallet. Please try again.",
        );
        expect(mockSetAuthState).toHaveBeenCalledWith({
          loading: false,
          provider: null,
          error: "Wallet initialization failed",
        });
        expect(mockSetStep).toHaveBeenCalledWith("start");
        expect(mockHasProcessedAuth.current).toBe(false);
      });
    });

    it("should handle authentication error and show error message", async () => {
      const authError = new Error("Authentication service unavailable");
      mockHandleUserAuthentication.mockRejectedValue(authError);

      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "Email/Google authentication failed",
          authError,
          expect.objectContaining({
            userId: mockEmailUser.userId,
            hasEmail: true,
            walletFound: true,
          }),
        );
        expect(getErrorMessage).toHaveBeenCalledWith(authError);
        expect(toast.error).toHaveBeenCalledWith(
          "Authentication failed: Authentication service unavailable. Please try again.",
        );
        expect(mockSetAuthState).toHaveBeenCalledWith({
          loading: false,
          provider: null,
          error: "Authentication service unavailable",
        });
        expect(mockSetStep).toHaveBeenCalledWith("start");
        expect(mockHasProcessedAuth.current).toBe(false);
      });
    });

    it("should reset hasProcessedAuth on error", async () => {
      mockHandleUserAuthentication.mockRejectedValue(
        new Error("Network error"),
      );

      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockHasProcessedAuth.current).toBe(false);
      });
    });
  });

  describe("Guard conditions", () => {
    it("should not process if user is null", async () => {
      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: null },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockPollForWalletAddress).not.toHaveBeenCalled();
        expect(mockHandleUserAuthentication).not.toHaveBeenCalled();
      });
    });

    it("should not process if hasProcessedAuth is true", async () => {
      mockHasProcessedAuth.current = true;

      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockPollForWalletAddress).not.toHaveBeenCalled();
      });
    });

    it("should not process if isGetUserPending is true", async () => {
      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: true,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockPollForWalletAddress).not.toHaveBeenCalled();
      });
    });

    it("should not process if isCreateUserPending is true", async () => {
      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: true,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockPollForWalletAddress).not.toHaveBeenCalled();
      });
    });
  });

  describe("Auth lock mechanism", () => {
    it("should handle multiple auth events", async () => {
      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(mockHandleUserAuthentication).toHaveBeenCalled();
        expect(mockHasProcessedAuth.current).toBe(true);
      });
    });
  });

  describe("Logging", () => {
    it("should log error details when wallet address not found", async () => {
      mockPollForWalletAddress.mockResolvedValue(null);

      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "No wallet address found for email/Google user",
          undefined,
          {
            userId: mockEmailUser.userId,
            hasEmail: true,
          },
        );
      });
    });

    it("should log authentication failure with context", async () => {
      const error = new Error("Auth failed");
      mockHandleUserAuthentication.mockRejectedValue(error);

      renderHook(() =>
        useEmailAuthHandler({
          setStep: mockSetStep,
          setAuthState: mockSetAuthState,
          pollForWalletAddress: mockPollForWalletAddress,
          handleUserAuthentication: mockHandleUserAuthentication,
          hasProcessedAuth: mockHasProcessedAuth,
          isGetUserPending: false,
          isCreateUserPending: false,
        }),
      );

      const event = new CustomEvent("dynamic:emailAuthSuccess", {
        detail: { user: mockEmailUser },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          "Email/Google authentication failed",
          error,
          {
            userId: mockEmailUser.userId,
            hasEmail: true,
            walletFound: true,
          },
        );
      });
    });
  });
});
