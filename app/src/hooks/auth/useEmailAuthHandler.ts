"use client";

import { logger } from "@/lib/logger";
import type { AuthState, AuthStep } from "@/types/auth";
import { getErrorMessage } from "@/utils/errorHandling";
import { type MutableRefObject, useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";

const EMAIL_AUTH_SUCCESS_EVENT = "dynamic:emailAuthSuccess";

/**
 * Email user object returned from Dynamic Labs authentication
 */
interface EmailUser {
  /** Unique user identifier from Dynamic Labs */
  userId: string;
  /** User's email address */
  email: string;
  /** Wallet credentials (populated asynchronously after email verification) */
  verifiedCredentials?: Array<{
    address: string;
  }>;
}

/**
 * Custom event emitted by Dynamic Labs SDK on successful email authentication
 */
interface CustomEmailAuthEvent extends Event {
  detail: {
    user: EmailUser;
  };
}

/**
 * Configuration parameters for email authentication handler
 */
interface UseEmailAuthHandlerParams {
  /** Updates the current authentication step in the UI flow */
  setStep: (step: AuthStep) => void;
  /** Updates the global authentication state */
  setAuthState: (state: AuthState) => void;
  /** Polls for wallet address after email verification */
  pollForWalletAddress: (emailUser: EmailUser) => Promise<string | null>;
  /** Processes user authentication after wallet is retrieved */
  handleUserAuthentication: (
    address: string,
    isEmailUser: boolean,
  ) => Promise<void>;
  /** Ref to track if authentication has been processed (prevents duplicate handling) */
  hasProcessedAuth: MutableRefObject<boolean>;
  /** Whether user lookup is in progress */
  isGetUserPending: boolean;
  /** Whether user creation is in progress */
  isCreateUserPending: boolean;
}

/**
 * Handles email authentication flow with Dynamic Labs SDK.
 *
 * This hook manages the complete email authentication event lifecycle, including:
 * - Setting up event listeners for Dynamic Labs authentication events
 * - Coordinating wallet address polling after successful email verification
 * - Processing user authentication after wallet address is retrieved
 * - Managing error states and user feedback via toast notifications
 * - Automatic cleanup of event listeners on component unmount
 *
 * @example
 * ```tsx
 * function AuthComponent() {
 *   const { step, setStep, setAuthState } = useAuthState();
 *   const { pollForWalletAddress } = useWalletPolling();
 *   const hasProcessedAuth = useRef(false);
 *
 *   useEmailAuthHandler({
 *     setStep,
 *     setAuthState,
 *     pollForWalletAddress,
 *     handleUserAuthentication: async (wallet, isEmail) => {
 *       // Verify user exists or create new user
 *       await authenticateUser(wallet, isEmail);
 *     },
 *     hasProcessedAuth,
 *     isGetUserPending: false,
 *     isCreateUserPending: false
 *   });
 *
 *   return <div>Authentication UI...</div>;
 * }
 * ```
 *
 * @remarks
 * **Event Flow**:
 * 1. User submits email in Dynamic SDK email form
 * 2. `dynamic:emailAuthSuccess` event fires with email user object
 * 3. Hook polls for wallet address (credentials populated asynchronously)
 * 4. On wallet found, calls `handleUserAuthentication` callback
 * 5. On error or timeout, shows error toast and resets to start step
 *
 * **Lock Mechanism**:
 * Uses a ref-based promise lock (`authLockRef`) to prevent duplicate event processing.
 * If an authentication event is already being processed, subsequent events are ignored
 * until the current one completes or fails.
 *
 * **Guard Conditions**:
 * Authentication is skipped if:
 * - Email user object is missing
 * - Authentication has already been processed (`hasProcessedAuth.current === true`)
 * - User lookup is pending (`isGetUserPending === true`)
 * - User creation is pending (`isCreateUserPending === true`)
 * - Another auth process is in progress (`authLockRef.current !== null`)
 *
 * **Error Handling**:
 * - Logs detailed error context for debugging
 * - Shows user-friendly toast notification with error message
 * - Resets auth state and returns to start step
 * - Sets `hasProcessedAuth` back to false to allow retry
 *
 * **Cleanup**:
 * Automatically removes event listeners when component unmounts to prevent memory leaks.
 *
 * @param params - Configuration object with auth flow dependencies
 *
 * @see {@link useWalletPolling} for the polling implementation
 * @see {@link useAuthState} for auth state management
 */
export function useEmailAuthHandler({
  setStep,
  setAuthState,
  pollForWalletAddress,
  handleUserAuthentication,
  hasProcessedAuth,
  isGetUserPending,
  isCreateUserPending,
}: UseEmailAuthHandlerParams): void {
  const authLockRef = useRef<Promise<void> | null>(null);

  const handleEmailAuth = useCallback(
    async (event: Event) => {
      const customEvent = event as CustomEmailAuthEvent;
      const { user: emailUser } = customEvent.detail;

      if (
        !emailUser ||
        hasProcessedAuth.current ||
        isGetUserPending ||
        isCreateUserPending
      ) {
        return;
      }

      if (authLockRef.current) {
        logger.warn(
          "Email/Google auth already in progress, skipping duplicate",
        );
        return;
      }

      const authProcess = (async () => {
        try {
          hasProcessedAuth.current = true;

          const walletAddress = await pollForWalletAddress(emailUser);
          if (!walletAddress) {
            logger.error(
              "No wallet address found for email/Google user",
              undefined,
              {
                userId: emailUser.userId,
                hasEmail: !!emailUser.email,
              },
            );
            toast.error("Failed to initialize wallet. Please try again.");
            hasProcessedAuth.current = false;
            setAuthState({
              loading: false,
              provider: null,
              error: "Wallet initialization failed",
            });
            setStep("start");
            return;
          }

          await handleUserAuthentication(walletAddress, true);
        } catch (error) {
          logger.error("Email/Google authentication failed", error, {
            userId: emailUser?.userId,
            hasEmail: !!emailUser?.email,
            walletFound: !!emailUser?.verifiedCredentials?.[0]?.address,
          });

          const errorMessage = getErrorMessage(error);
          toast.error(
            `Authentication failed: ${errorMessage}. Please try again.`,
          );

          hasProcessedAuth.current = false;
          setAuthState({
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
      await authProcess;
    },
    [
      hasProcessedAuth,
      isGetUserPending,
      isCreateUserPending,
      pollForWalletAddress,
      handleUserAuthentication,
      setAuthState,
      setStep,
    ],
  );

  useEffect(() => {
    window.addEventListener(EMAIL_AUTH_SUCCESS_EVENT, handleEmailAuth);
    return () => {
      window.removeEventListener(EMAIL_AUTH_SUCCESS_EVENT, handleEmailAuth);
    };
  }, [handleEmailAuth]);
}
