"use client";

import { WalletPickerModal } from "@/components/auth/WalletPickerModal";
import { AuthLoadingStep } from "@/components/auth/steps/AuthLoadingStep";
import { AuthOtpStep } from "@/components/auth/steps/AuthOtpStep";
import { AuthPasskeyStep } from "@/components/auth/steps/AuthPasskeyStep";
import { AuthRecoveryCodesStep } from "@/components/auth/steps/AuthRecoveryCodesStep";
import { AuthStartStep } from "@/components/auth/steps/AuthStartStep";
import { Logo } from "@/components/icons/ina";
import {
  useAuthState,
  useEmailAuthFlow,
  useEmailAuthHandler,
  usePasskeyFlow,
  useWalletConnection,
  useWalletPolling,
} from "@/hooks/auth";
import { useUserCreation } from "@/hooks/useUserCreation";
import { safeLocalStorage } from "@/lib/auth/safeLocalStorage";
import { logger } from "@/lib/logger";
import { api } from "@/services/api";
import type { User } from "@/services/api";
import { AUTH_CONFIG } from "@/types/auth";
import { getErrorMessage } from "@/utils/errorHandling";
import { PROJECT_INFO } from "@/utils/projectInfo";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Link } from "@nextui-org/link";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface AuthProps {
  mode: "login" | "signup";
}

export function Auth({ mode }: AuthProps) {
  const { user, handleLogOut, primaryWallet } = useDynamicContext();
  const router = useRouter();
  const hasProcessedAuth = useRef(false);
  const authLockRef = useRef<Promise<void> | null>(null);

  // Auth flow state - using extracted hook
  const {
    step,
    setStep,
    inaWalletState,
    setInaWalletState,
    recoveryCodes,
    setRecoveryCodes,
  } = useAuthState();

  // Wallet polling hook
  const { pollForWalletAddress } = useWalletPolling();

  // Use extracted hooks
  const emailAuth = useEmailAuthFlow();
  const passkeyFlow = usePasskeyFlow(
    (codes) => {
      setRecoveryCodes(codes);
      setStep("recovery-codes");
    },
    () => setStep("passkey"),
  );
  const walletConnection = useWalletConnection({
    onAuthFailure: () => setStep("start"),
  });

  // Check for pending Google auth after mount (client-side only)
  useEffect(() => {
    const pendingAuth = safeLocalStorage.getItem(AUTH_CONFIG.PENDING_AUTH_KEY);
    if (pendingAuth && !user) {
      walletConnection.setAuthState({
        loading: true,
        provider: "google",
        error: null,
      });
      setStep("loading");
    }
  }, [user, walletConnection.setAuthState, setStep]);

  // Clean up pending auth when authentication completes or after timeout
  useEffect(() => {
    if (user && primaryWallet) {
      safeLocalStorage.removeItem(AUTH_CONFIG.PENDING_AUTH_KEY);
    }

    // Clean up stale pending auth after configured timeout
    const timeout = setTimeout(() => {
      const pendingAuth = safeLocalStorage.getItem(
        AUTH_CONFIG.PENDING_AUTH_KEY,
      );
      if (pendingAuth && !user) {
        safeLocalStorage.removeItem(AUTH_CONFIG.PENDING_AUTH_KEY);
        walletConnection.setAuthState({
          loading: false,
          provider: null,
          error: null,
        });
        setStep("start");
      }
    }, AUTH_CONFIG.STALE_AUTH_TIMEOUT);

    return () => clearTimeout(timeout);
  }, [user, primaryWallet, walletConnection.setAuthState, setStep]);

  const getUser = useMutation({
    mutationKey: ["fetch-user-on-auth"],
    mutationFn: (address: string) => {
      return api.get<User>(`/users/${address}`);
    },
  });

  const { createUser } = useUserCreation();

  // Shared authentication flow logic
  const handleUserAuthentication = useCallback(
    async (address: string, isEmailUser = false) => {
      getUser.mutate(address, {
        onSuccess: async ({ data: userData }) => {
          try {
            if (!userData) {
              setInaWalletState("creating");
              await createUser.mutateAsync(address);
              setInaWalletState("created");

              router.push("/");
              return;
            }

            // Existing user - force full page reload for middleware handling
            window.location.href = "/";
          } catch (error) {
            logger.error("Auth flow error during user creation", error);
            const status = (error as any)?.response?.status;
            if (status === 401) {
              toast.error("Failed to authenticate. Please try again.");
              hasProcessedAuth.current = false;
              await handleLogOut();
            } else {
              toast.error("Something went wrong. Please try again.");
              hasProcessedAuth.current = false;
            }
          }
        },
        onError: async (error) => {
          logger.error("Authentication error during user fetch", error);
          const status = (error as any)?.response?.status;
          if (status === 401) {
            toast.error("Failed to authenticate. Please try again.");
            hasProcessedAuth.current = false;
            await handleLogOut();
          } else {
            toast.error("Something went wrong. Please try again.");
            hasProcessedAuth.current = false;
          }
        },
      });
    },
    [getUser, createUser, router, handleLogOut, setInaWalletState],
  );

  // Handle wallet connection via Dynamic Labs
  useEffect(() => {
    if (
      !primaryWallet?.address ||
      hasProcessedAuth.current ||
      getUser.isPending ||
      createUser.isPending
    ) {
      return;
    }

    // Check if auth is already in progress
    if (authLockRef.current) {
      logger.warn("Wallet auth already in progress, skipping duplicate");
      return;
    }

    // Create the auth process and store it in the lock
    const authProcess = (async () => {
      try {
        hasProcessedAuth.current = true;
        await handleUserAuthentication(primaryWallet.address, !!user?.email);
      } catch (error) {
        // Log error with user context
        logger.error("Wallet authentication failed", error, {
          address: primaryWallet.address,
          hasEmail: !!user?.email,
        });

        // Show user-friendly error message
        const errorMessage = getErrorMessage(error);
        toast.error(
          `Authentication failed: ${errorMessage}. Please try again.`,
        );

        // Reset auth state to allow retry
        hasProcessedAuth.current = false;
        walletConnection.setAuthState({
          loading: false,
          provider: null,
          error: errorMessage,
        });
        setStep("start");
      } finally {
        authLockRef.current = null;
      }
    })();

    authLockRef.current = authProcess;
  }, [
    primaryWallet?.address,
    user?.email,
    getUser.isPending,
    createUser.isPending,
    handleUserAuthentication,
    walletConnection,
    setStep,
  ]);

  // Handle email/Google authentication using extracted hook
  useEmailAuthHandler({
    setStep,
    setAuthState: walletConnection.setAuthState,
    pollForWalletAddress,
    handleUserAuthentication,
    hasProcessedAuth,
    isGetUserPending: getUser.isPending,
    isCreateUserPending: createUser.isPending,
  });

  // Reset the flag and lock when user logs out
  useEffect(() => {
    if (!user && !primaryWallet) {
      hasProcessedAuth.current = false;
      authLockRef.current = null;
    }
  }, [user, primaryWallet]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear any pending auth state on unmount to prevent memory leaks
      if (typeof window !== "undefined") {
        safeLocalStorage.removeItem(AUTH_CONFIG.PENDING_AUTH_KEY);
      }
    };
  }, []);

  const handleConnectEmail = async () => {
    walletConnection.setAuthState({
      loading: true,
      provider: "email",
      error: null,
    });
    await emailAuth.handleConnect(emailAuth.email);
    setStep("otp");
  };

  const handleConnectGoogle = async () => {
    setStep("loading");
    await walletConnection.handleConnectGoogle();
  };

  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);

  const handleOpenWalletPicker = () => {
    setIsWalletPickerOpen(true);
  };

  const handleSelectWallet = (walletKey: string) => {
    setIsWalletPickerOpen(false);
    setStep("loading");
    walletConnection.handleConnectWallet(walletKey);
  };

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-6 sm:gap-10 rounded-2xl border border-white/10 bg-dimensional-gray shadow-xl px-4 sm:px-8 md:px-10 py-8 sm:py-12">
      <div className="flex flex-col items-center gap-4">
        <Logo color="#FFFFFF" size={56} />
        <h1 className="font-semibold text-2xl sm:text-3xl text-white leading-8 sm:leading-9 text-center">
          {mode === "login" && !inaWalletState
            ? "Welcome back!"
            : `Create your ${PROJECT_INFO.name} account`}
        </h1>
        {mode === "signup" ? (
          <p className="max-w-[400px] text-white/80 text-center text-sm leading-5">
            Access institutional credit products on Solana
          </p>
        ) : null}
      </div>

      {step === "start" && !inaWalletState && (
        <AuthStartStep
          email={emailAuth.email}
          onEmailChange={emailAuth.setEmail}
          onConnectEmail={handleConnectEmail}
          onConnectGoogle={handleConnectGoogle}
          onConnectSolana={handleOpenWalletPicker}
        />
      )}

      {(step === "loading" || !!inaWalletState) && (
        <AuthLoadingStep
          provider={walletConnection.authState.provider}
          walletState={inaWalletState}
        />
      )}

      {step === "otp" && inaWalletState === null && (
        <AuthOtpStep
          email={emailAuth.email}
          otp={emailAuth.otp}
          onOtpChange={emailAuth.setOtp}
          onVerifyOtp={emailAuth.handleVerifyOTP}
          onResendCode={emailAuth.handleResendCode}
          isVerifyingOTP={emailAuth.isVerifyingOTP}
          isResendingCode={emailAuth.isResendingCode}
        />
      )}

      {step === "passkey" && passkeyFlow.passkeyStep === "prompt" && (
        <AuthPasskeyStep
          onRegisterPasskey={passkeyFlow.handleRegisterPasskey}
        />
      )}

      {step === "recovery-codes" && (
        <AuthRecoveryCodesStep
          recoveryCodes={recoveryCodes}
          onAcknowledge={passkeyFlow.handleAcknowledgeRecoveryCodes}
        />
      )}

      <WalletPickerModal
        isOpen={isWalletPickerOpen}
        onClose={() => setIsWalletPickerOpen(false)}
        wallets={walletConnection.availableWallets}
        onSelectWallet={handleSelectWallet}
      />

      <div className="flex flex-col items-center gap-5">
        {mode === "signup" ? (
          <span className="text-white text-sm">
            Already have an account?{" "}
            <Link
              href={"/login"}
              size="sm"
              className="text-strategic-blue hover:text-strategic-blue/80"
            >
              Log in
            </Link>
          </span>
        ) : (
          <span className="text-white text-sm">
            Don&#39;t have an account?{" "}
            <Link
              href={"/signup"}
              size="sm"
              className="text-strategic-blue hover:text-strategic-blue/80"
            >
              Sign up
            </Link>
          </span>
        )}

        <span className="text-white/80 text-xs text-center leading-relaxed">
          By continuing, you agree to{" "}
          <Link
            href={"/terms-of-service"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-strategic-blue underline hover:text-strategic-blue/80"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href={"/privacy-policy"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-strategic-blue underline hover:text-strategic-blue/80"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </div>
    </div>
  );
}
