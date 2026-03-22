"use client";

import type { AuthStep } from "@/types/auth";
import { useCallback, useState } from "react";

/**
 * Wallet creation lifecycle states
 *
 * - `null`: No wallet creation in progress
 * - `creating`: Wallet creation initiated, waiting for completion
 * - `created`: Wallet successfully created, recovery codes available
 */
type WalletCreationState = "creating" | "created" | null;

/**
 * Return value for authentication state hook
 */
interface UseAuthStateReturn {
  /** Current authentication step in the UI flow */
  step: AuthStep;
  /** Updates the current authentication step */
  setStep: (step: AuthStep) => void;
  /** Current INA wallet creation state */
  inaWalletState: WalletCreationState;
  /** Updates the INA wallet creation state */
  setInaWalletState: (state: WalletCreationState) => void;
  /** Recovery codes generated during wallet creation */
  recoveryCodes: string[];
  /** Sets recovery codes after wallet creation */
  setRecoveryCodes: (codes: string[]) => void;
}

/**
 * Manages authentication flow state across multiple steps.
 *
 * Coordinates state for multi-step authentication process including:
 * - Current authentication step (start, otp, loading, passkey, recovery)
 * - INA wallet creation state (creating, created, null)
 * - Recovery codes for account recovery after wallet creation
 *
 * @example
 * ```tsx
 * function AuthFlow() {
 *   const {
 *     step,
 *     setStep,
 *     inaWalletState,
 *     setInaWalletState,
 *     recoveryCodes,
 *     setRecoveryCodes
 *   } = useAuthState();
 *
 *   return (
 *     <>
 *       {step === 'start' && (
 *         <AuthStartStep onSelectMethod={() => setStep('otp')} />
 *       )}
 *       {step === 'otp' && (
 *         <AuthOtpStep onVerify={() => setStep('loading')} />
 *       )}
 *       {step === 'passkey' && (
 *         <AuthPasskeyStep onComplete={() => setStep('recovery')} />
 *       )}
 *       {step === 'recovery' && (
 *         <RecoveryCodesStep codes={recoveryCodes} onComplete={() => setStep('start')} />
 *       )}
 *     </>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Managing wallet creation flow
 * function WalletCreation() {
 *   const { inaWalletState, setInaWalletState, setRecoveryCodes } = useAuthState();
 *
 *   async function createWallet() {
 *     setInaWalletState('creating');
 *     try {
 *       const { codes } = await walletService.create();
 *       setRecoveryCodes(codes);
 *       setInaWalletState('created');
 *     } catch (error) {
 *       setInaWalletState(null);
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       {inaWalletState === 'creating' && <Spinner />}
 *       {inaWalletState === 'created' && <RecoveryCodes />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns Object containing state values and setters
 *
 * @remarks
 * **Authentication Step Flow**:
 * 1. `start` - Initial login selection (email, Google, wallet, passkey)
 * 2. `otp` - Email OTP verification (if email auth chosen)
 * 3. `loading` - Processing authentication with backend
 * 4. `passkey` - Passkey registration or authentication
 * 5. `recovery` - Display recovery codes after new wallet creation
 *
 * **Wallet Creation States**:
 * - `null` - Default state, no wallet creation in progress
 * - `creating` - User initiated wallet creation, waiting for backend response
 * - `created` - Wallet successfully created, recovery codes ready to display
 *
 * **Recovery Codes**:
 * Array of strings provided after new INA wallet creation for account recovery.
 * User must save these codes before proceeding to dashboard.
 * Codes are used to recover account access if passkey is lost.
 *
 * **State Management**:
 * All setters are wrapped in `useCallback` to maintain referential stability
 * and prevent unnecessary re-renders in consuming components.
 *
 * **Reset Pattern**:
 * To reset auth flow to initial state:
 * ```tsx
 * setStep('start');
 * setInaWalletState(null);
 * setRecoveryCodes([]);
 * ```
 *
 * @see {@link AuthStep} in @/types/auth for valid step values
 * @see {@link useEmailAuthHandler} for email auth implementation
 * @see {@link useWalletPolling} for wallet address polling
 */
export function useAuthState(): UseAuthStateReturn {
  const [step, setStepState] = useState<AuthStep>("start");
  const [inaWalletState, setInaWalletStateInternal] =
    useState<WalletCreationState>(null);
  const [recoveryCodes, setRecoveryCodesInternal] = useState<string[]>([]);

  const setStep = useCallback((newStep: AuthStep) => {
    setStepState(newStep);
  }, []);

  const setInaWalletState = useCallback((state: WalletCreationState) => {
    setInaWalletStateInternal(state);
  }, []);

  const setRecoveryCodes = useCallback((codes: string[]) => {
    setRecoveryCodesInternal(codes);
  }, []);

  return {
    step,
    setStep,
    inaWalletState,
    setInaWalletState,
    recoveryCodes,
    setRecoveryCodes,
  };
}
