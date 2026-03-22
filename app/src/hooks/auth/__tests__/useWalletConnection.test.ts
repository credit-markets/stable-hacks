import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWalletConnection } from "../useWalletConnection";

const mockSignInWithSocialAccount = vi.fn();
const mockSetShowAuthFlow = vi.fn();
const mockSelectWalletOption = vi.fn();

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/auth/safeLocalStorage", () => ({
  safeLocalStorage: { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() },
}));

vi.mock("@dynamic-labs/sdk-react-core", () => ({
  useDynamicContext: () => ({
    setShowAuthFlow: mockSetShowAuthFlow,
  }),
  useDynamicEvents: () => {},
  useSocialAccounts: () => ({
    signInWithSocialAccount: mockSignInWithSocialAccount,
  }),
  useWalletOptions: () => ({
    selectWalletOption: mockSelectWalletOption,
    walletOptions: [
      {
        key: "backpack",
        name: "Backpack",
        isInstalledOnBrowser: true,
        metadata: { icon: "https://example.com/backpack.png" },
      },
    ],
  }),
}));

import { safeLocalStorage } from "@/lib/auth/safeLocalStorage";
import { logger } from "@/lib/logger";
import toast from "react-hot-toast";

async function callHookMethod(
  method: "handleConnectGoogle" | "handleConnectWallet",
): Promise<ReturnType<typeof useWalletConnection>> {
  const { result } = renderHook(() => useWalletConnection());
  await act(async () => {
    await result.current[method]();
  });
  return result.current;
}

describe("useWalletConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleConnectGoogle", () => {
    it("should successfully connect with Google", async () => {
      mockSignInWithSocialAccount.mockResolvedValue(undefined);

      await callHookMethod("handleConnectGoogle");

      await waitFor(() => {
        expect(mockSignInWithSocialAccount).toHaveBeenCalled();
        expect(safeLocalStorage.setItem).toHaveBeenCalledWith(
          "pendingGoogleAuth",
          "true",
        );
      });
    });

    it("should handle popup blocked error", async () => {
      mockSignInWithSocialAccount.mockRejectedValue(
        new Error("popup was blocked"),
      );

      await callHookMethod("handleConnectGoogle");

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Sign-in popup was blocked. Please allow popups and try again.",
        );
        expect(logger.error).toHaveBeenCalledWith(
          "Google authentication failed",
          expect.any(Error),
          expect.objectContaining({ errorMessage: expect.any(String) }),
        );
      });
    });

    it.each([
      ["User cancelled the sign-in", "Sign-in was cancelled."],
      ["Network error occurred", "Network error. Check your connection."],
      ["Unknown error", "Google sign-in failed. Please try again."],
    ])("should handle error: %s", async (errorMessage, expectedToast) => {
      mockSignInWithSocialAccount.mockRejectedValue(new Error(errorMessage));

      await callHookMethod("handleConnectGoogle");

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expectedToast);
      });
    });
  });

  describe("handleConnectWallet", () => {
    it("should select wallet by key when provided", () => {
      const { result } = renderHook(() => useWalletConnection());

      act(() => {
        result.current.handleConnectWallet("backpack");
      });

      expect(mockSelectWalletOption).toHaveBeenCalledWith(
        "backpack",
        false,
        true,
      );
      expect(result.current.authState).toEqual({
        loading: true,
        provider: "wallet",
        error: null,
      });
    });

    it("should fallback to Dynamic auth flow when no wallet key", () => {
      const { result } = renderHook(() => useWalletConnection());

      act(() => {
        result.current.handleConnectWallet();
      });

      expect(mockSetShowAuthFlow).toHaveBeenCalledWith(true);
    });

    it("should expose available wallets", () => {
      const { result } = renderHook(() => useWalletConnection());

      expect(result.current.availableWallets).toEqual([
        {
          key: "backpack",
          name: "Backpack",
          iconUrl: "https://example.com/backpack.png",
          isInstalledOnBrowser: true,
        },
      ]);
    });
  });

  describe("auth state management", () => {
    it("should update auth state", () => {
      const { result } = renderHook(() => useWalletConnection());

      act(() => {
        result.current.setAuthState({
          loading: true,
          provider: "google",
          error: null,
        });
      });

      expect(result.current.authState).toEqual({
        loading: true,
        provider: "google",
        error: null,
      });
    });

    it("should reset auth state", () => {
      const { result } = renderHook(() => useWalletConnection());

      act(() => {
        result.current.setAuthState({
          loading: true,
          provider: "google",
          error: "test error",
        });
      });

      act(() => {
        result.current.resetAuthState();
      });

      expect(result.current.authState).toEqual({
        loading: false,
        provider: null,
        error: null,
      });
    });
  });
});
