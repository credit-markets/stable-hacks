"use client";

import { safeLocalStorage } from "@/lib/auth/safeLocalStorage";
import { logger } from "@/lib/logger";
import { AUTH_CONFIG, type AuthState } from "@/types/auth";
import { getErrorMessage } from "@/utils/errorHandling";
import {
  useDynamicContext,
  useDynamicEvents,
  useSocialAccounts,
  useWalletOptions,
} from "@dynamic-labs/sdk-react-core";
import { ProviderEnum } from "@dynamic-labs/types";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

export interface WalletOption {
  key: string;
  name: string;
  iconUrl?: string;
  isInstalledOnBrowser: boolean;
}

const INITIAL_AUTH_STATE: AuthState = {
  loading: false,
  provider: null,
  error: null,
};

interface UseWalletConnectionOptions {
  onAuthFailure?: () => void;
}

export function useWalletConnection(options?: UseWalletConnectionOptions) {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_AUTH_STATE);

  const { signInWithSocialAccount } = useSocialAccounts();
  const { selectWalletOption, walletOptions } = useWalletOptions();
  const { setShowAuthFlow } = useDynamicContext();

  // Reset auth state to initial values
  const resetAuthState = useCallback(() => {
    safeLocalStorage.removeItem(AUTH_CONFIG.PENDING_AUTH_KEY);
    setAuthState(INITIAL_AUTH_STATE);
  }, []);

  // Dynamic SDK event listeners
  useDynamicEvents("authInit", (payload) => {
    const option = payload.option as string | null;
    if (option === "google") {
      setAuthState({ loading: true, provider: "google", error: null });
    } else if (option && option !== "email") {
      setAuthState({ loading: true, provider: "wallet", error: null });
    }
  });

  useDynamicEvents("authFlowOpen", () => {
    if (authState.provider === "wallet") {
      setAuthState((prev) => ({ ...prev, loading: true }));
    }
  });

  useDynamicEvents("authFlowClose", () => {
    setAuthState((prev) => ({ ...prev, loading: false, provider: null }));
    options?.onAuthFailure?.();
  });

  useDynamicEvents("authFlowCancelled", () => {
    resetAuthState();
    options?.onAuthFailure?.();
  });

  useDynamicEvents("authFailure", (reason) => {
    logger.error("Dynamic SDK auth failure", { reason });
    safeLocalStorage.removeItem(AUTH_CONFIG.PENDING_AUTH_KEY);
    const message = typeof reason === "string" ? reason : "An unexpected error occurred";
    setAuthState({ loading: false, provider: null, error: message });
    toast.error(message);
    options?.onAuthFailure?.();
  });

  const handleConnectGoogle = useCallback(async () => {
    setAuthState({ loading: true, provider: "google", error: null });
    safeLocalStorage.setItem(AUTH_CONFIG.PENDING_AUTH_KEY, "true");

    try {
      await signInWithSocialAccount(ProviderEnum.Google);
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      logger.error("Google authentication failed", error, { errorMessage });

      let userMessage = "Google sign-in failed. Please try again.";

      if (errorMessage.toLowerCase().includes("popup")) {
        userMessage =
          "Sign-in popup was blocked. Please allow popups and try again.";
      } else if (errorMessage.toLowerCase().includes("cancel")) {
        userMessage = "Sign-in was cancelled.";
      } else if (errorMessage.toLowerCase().includes("network")) {
        userMessage = "Network error. Check your connection.";
      }

      toast.error(userMessage);
      resetAuthState();
    }
  }, [signInWithSocialAccount, resetAuthState]);

  // Headless: connect a specific wallet by key
  const handleConnectWallet = useCallback(
    (walletKey?: string) => {
      setAuthState({ loading: true, provider: "wallet", error: null });
      if (walletKey) {
        selectWalletOption(walletKey, false, true);
      } else {
        // Fallback to Dynamic modal if no specific wallet key
        setShowAuthFlow(true);
      }
    },
    [selectWalletOption, setShowAuthFlow],
  );

  const updateAuthState = useCallback((newState: AuthState) => {
    setAuthState(newState);
  }, []);

  // Expose available wallet options for headless rendering (installed only)
  const availableWallets: WalletOption[] = walletOptions
    .filter((w) => w.isInstalledOnBrowser)
    .map((w) => ({
      key: w.key,
      name: w.name,
      iconUrl: w.metadata?.icon,
      isInstalledOnBrowser: w.isInstalledOnBrowser,
    }));

  return {
    authState,
    setAuthState: updateAuthState,
    resetAuthState,
    handleConnectGoogle,
    handleConnectWallet,
    availableWallets,
  };
}
