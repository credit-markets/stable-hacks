"use client";

import { logger } from "@/lib/logger";
import { useCallback } from "react";

/**
 * Email user object from Dynamic Labs with optional wallet credentials
 */
interface EmailUser {
  /** Unique user identifier from Dynamic Labs */
  userId: string;
  /** User's email address */
  email: string;
  /** Wallet credentials array (populated asynchronously) */
  verifiedCredentials?: Array<{
    address: string;
  }>;
}

/**
 * Return value for wallet polling hook
 */
interface UseWalletPollingReturn {
  /** Polls email user object until wallet address is available */
  pollForWalletAddress: (
    emailUser: EmailUser,
    maxAttempts?: number,
    intervalMs?: number,
  ) => Promise<string | null>;
}

/**
 * Polls for wallet address retrieval after Dynamic Labs email authentication.
 *
 * The Dynamic Labs SDK creates wallet credentials asynchronously after email verification.
 * This hook repeatedly checks the `verifiedCredentials` array until the wallet address
 * becomes available or the maximum number of attempts is reached.
 *
 * @example
 * ```tsx
 * function AuthComponent() {
 *   const { pollForWalletAddress } = useWalletPolling();
 *
 *   async function handleEmailAuth(emailUser: EmailUser) {
 *     // Poll with default settings (10 attempts × 100ms = 1 second max)
 *     const wallet = await pollForWalletAddress(emailUser);
 *
 *     if (wallet) {
 *       console.log('Wallet found:', wallet);
 *       // Proceed with authentication
 *     } else {
 *       console.error('Wallet not found after 1 second');
 *       // Show error to user
 *     }
 *   }
 *
 *   return <button onClick={() => handleEmailAuth(user)}>Login</button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Custom polling configuration (longer timeout)
 * const wallet = await pollForWalletAddress(emailUser, 30, 100);
 * // 30 attempts × 100ms = 3 seconds max
 * ```
 *
 * @returns Object with polling function
 * @returns pollForWalletAddress - Function to start polling for wallet address
 *
 * @remarks
 * **Default Polling Strategy**:
 * - Maximum attempts: 10
 * - Interval between attempts: 100ms
 * - Total timeout: ~1 second (10 × 100ms)
 *
 * **Why Polling is Necessary**:
 * Dynamic Labs SDK's `verifiedCredentials.address` is not immediately available
 * after email verification completes. The credentials are created asynchronously
 * on the Dynamic Labs backend, requiring client-side polling until they appear
 * in the user object.
 *
 * **Success Scenario**:
 * - Returns wallet address string as soon as it's found
 * - Logs attempt number and timing information
 * - Typically resolves within 1-3 attempts (100-300ms)
 *
 * **Failure Scenarios**:
 * Returns `null` when:
 * - Wallet address not found after `maxAttempts` (timeout)
 * - Email user object is malformed or missing
 * - `verifiedCredentials` array remains empty
 *
 * **Performance Considerations**:
 * - Fast polling interval (100ms) ensures minimal perceived delay
 * - Short total timeout (1 second) prevents indefinite waiting
 * - Early exit on success minimizes unnecessary polling
 *
 * **Error Logging**:
 * Logs detailed context on timeout:
 * - User ID and email
 * - Total attempts and time elapsed
 * - Whether credentials array exists
 * - Length of credentials array (for debugging)
 *
 * @see {@link useEmailAuthHandler} for the auth flow that uses this hook
 */
export function useWalletPolling(): UseWalletPollingReturn {
  const pollForWalletAddress = useCallback(
    async (
      emailUser: EmailUser,
      maxAttempts = 10,
      intervalMs = 100,
    ): Promise<string | null> => {
      const { userId, email: userEmail } = emailUser;

      logger.debug("Starting wallet address polling", {
        userId,
        userEmail,
        maxAttempts,
        intervalMs,
      });

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const walletAddress = emailUser.verifiedCredentials?.[0]?.address;
        if (walletAddress) {
          logger.debug("Wallet address found", {
            userId,
            userEmail,
            address: walletAddress,
            attemptNumber: attempt + 1,
          });
          return walletAddress;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      logger.error("Wallet address polling timeout", undefined, {
        userId,
        userEmail,
        maxAttempts,
        totalTimeMs: maxAttempts * intervalMs,
        credentialsPresent: !!emailUser.verifiedCredentials,
        credentialsLength: emailUser.verifiedCredentials?.length || 0,
      });

      return null;
    },
    [],
  );

  return {
    pollForWalletAddress,
  };
}
