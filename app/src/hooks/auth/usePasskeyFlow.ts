"use client";

import { logger } from "@/lib/logger";
import {
  getErrorMessage,
  getRecoveryCodeErrorMessage,
} from "@/utils/errorHandling";
import {
  useAuthenticatePasskeyMFA,
  useDynamicContext,
  useGetPasskeys,
  useMfa,
  useRegisterPasskey,
  useSyncMfaFlow,
} from "@dynamic-labs/sdk-react-core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type PasskeyStep = "prompt" | "registering" | "authenticating";

export function usePasskeyFlow(
  onRecoveryCodes?: (codes: string[]) => void,
  onPasskeyPrompt?: () => void,
) {
  const [passkeyStep, setPasskeyStep] = useState<PasskeyStep>("prompt");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const { userWithMissingInfo, user, handleLogOut } = useDynamicContext();
  const { getRecoveryCodes, completeAcknowledgement } = useMfa();
  const getPasskeys = useGetPasskeys();
  const registerPasskey = useRegisterPasskey();
  const authenticatePasskeyMFA = useAuthenticatePasskeyMFA();
  const router = useRouter();

  useSyncMfaFlow({
    handler: async () => {
      if (userWithMissingInfo?.scope === "requiresAdditionalAuth") {
        try {
          const passkeys = await getPasskeys();

          if (passkeys.length === 0) {
            await registerPasskey();

            // Get recovery codes after successful registration
            const codes = await getRecoveryCodes();
            if (codes && codes.length > 0) {
              setRecoveryCodes(codes);
              onRecoveryCodes?.(codes);
            }
          } else {
            // Authenticate with existing passkey
            await authenticatePasskeyMFA({
              createMfaToken: {
                singleUse: true,
              },
            });
            router.replace("/");
          }
        } catch (error) {
          logger.error("Passkey registration/authentication failed", error);

          // Show manual trigger UI
          onPasskeyPrompt?.();
          setPasskeyStep("prompt");
        }
      } else if (userWithMissingInfo) {
        // Handle recovery codes
        try {
          const codes = await getRecoveryCodes();
          if (codes && codes.length > 0) {
            setRecoveryCodes(codes);
            onRecoveryCodes?.(codes);
          }
        } catch (error) {
          logger.debug("Recovery codes not ready yet", { error });
        }
      }
    },
  });

  const handleRegisterPasskey = async () => {
    setPasskeyStep("registering");
    try {
      await registerPasskey();
      // Let the useSyncMfaFlow handler take over after this
    } catch (error) {
      toast.error("Failed to create passkey");
      setPasskeyStep("prompt");
    }
  };

  const handleAcknowledgeRecoveryCodes = async () => {
    try {
      logger.debug("Starting recovery code acknowledgment", {
        userId: user?.userId,
        email: user?.email,
      });

      if (!user) {
        toast.error("Authentication required");
        return;
      }

      await completeAcknowledgement();

      logger.debug("Recovery code setup completed successfully", {
        userId: user?.userId,
      });

      // After acknowledgment, user should be fully authenticated
      router.replace("/");
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      logger.error("Failed to complete recovery code acknowledgment", error, {
        userId: user?.userId,
        email: user?.email,
        errorMessage,
        step: "recovery-codes",
      });

      const userMessage = getRecoveryCodeErrorMessage(errorMessage);
      const lowerMessage = errorMessage.toLowerCase();
      const shouldLogout =
        lowerMessage.includes("session") ||
        lowerMessage.includes("expired") ||
        lowerMessage.includes("unauthorized") ||
        lowerMessage.includes("401");

      if (shouldLogout) {
        logger.error(
          "Session expired during recovery code acknowledgment",
          undefined,
          {
            userId: user?.userId,
          },
        );
        await handleLogOut();
      }

      toast.error(userMessage);
    }
  };

  return {
    passkeyStep,
    recoveryCodes,
    handleRegisterPasskey,
    handleAcknowledgeRecoveryCodes,
  };
}
