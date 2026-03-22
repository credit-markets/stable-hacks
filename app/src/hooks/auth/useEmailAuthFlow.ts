"use client";

import { logger } from "@/lib/logger";
import { AUTH_CONFIG } from "@/types/auth";
import {
  getErrorMessage,
  getOTPErrorMessage,
  getResendCodeErrorMessage,
} from "@/utils/errorHandling";
import {
  useConnectWithOtp,
  useDynamicEvents,
} from "@dynamic-labs/sdk-react-core";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

export function useEmailAuthFlow() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);

  const { connectWithEmail, retryOneTimePassword, verifyOneTimePassword } =
    useConnectWithOtp();

  // Listen for verification results from Dynamic SDK
  useDynamicEvents("emailVerificationResult", (success) => {
    setIsVerifyingOTP(false);
    if (!success) {
      toast.error("Invalid Verification. Please try again.");
      setOtp("");
    }
  });

  const handleVerifyOTP = useCallback(
    async (otpValue: string) => {
      setIsVerifyingOTP(true);

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setIsVerifyingOTP(false);
        logger.error("OTP verification timeout", undefined, {
          email,
          otpLength: otpValue.length,
        });
        toast.error("Verification timed out. Please try again.");
      }, 30000); // 30 second timeout

      try {
        await verifyOneTimePassword(otpValue);
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);

        const errorMessage = getErrorMessage(error);

        logger.error("OTP verification failed", error, {
          email,
          otpLength: otpValue.length,
          errorMessage,
        });

        toast.error(getOTPErrorMessage(errorMessage));
        setOtp("");
      } finally {
        clearTimeout(timeoutId);
        setIsVerifyingOTP(false);
      }
    },
    [verifyOneTimePassword, email],
  );

  const handleResendCode = useCallback(async () => {
    setIsResendingCode(true);
    try {
      await retryOneTimePassword();
      toast.success("New code sent!");
      logger.debug("OTP code resent successfully", { email });
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      logger.error("Failed to resend OTP code", error, {
        email,
        errorMessage,
      });

      toast.error(getResendCodeErrorMessage(errorMessage));
    } finally {
      setIsResendingCode(false);
    }
  }, [retryOneTimePassword, email]);

  const handleConnect = useCallback(
    async (emailValue: string) => {
      try {
        await connectWithEmail(emailValue);
        logger.debug("OTP email sent successfully", { email: emailValue });
      } catch (error) {
        const errorMessage = getErrorMessage(error);

        logger.error("Failed to send OTP email", error, {
          email: emailValue,
          errorMessage,
        });

        let userMessage = "Failed to send verification code. Please try again.";

        if (errorMessage.toLowerCase().includes("rate limit")) {
          userMessage = "Too many attempts. Please wait a moment.";
        } else if (errorMessage.toLowerCase().includes("invalid email")) {
          userMessage = "Invalid email address. Please check and try again.";
        } else if (errorMessage.toLowerCase().includes("network")) {
          userMessage = "Network error. Check your connection.";
        }

        toast.error(userMessage);
        throw error; // Re-throw so calling code knows it failed
      }
    },
    [connectWithEmail],
  );

  return {
    email,
    setEmail,
    otp,
    setOtp,
    isVerifyingOTP,
    isResendingCode,
    handleVerifyOTP,
    handleResendCode,
    handleConnect,
  };
}
