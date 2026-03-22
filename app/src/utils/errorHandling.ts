/**
 * Unified error handling utilities for consistent error messages across the app.
 * Handles Axios HTTP errors, blockchain/transaction errors, and generic JavaScript errors.
 */

import axios from "axios";

/**
 * Type guard to check if an error is a blockchain/transaction error with shortMessage
 */
function isBlockchainError(
  error: unknown,
): error is Error & { shortMessage?: string; details?: string } {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const hasRelevantProperty = "shortMessage" in error || "name" in error;
  if (!hasRelevantProperty) {
    return false;
  }

  const errorName = (error as { name?: string }).name;
  if (errorName === undefined) {
    return false;
  }

  return errorName.includes("Error");
}

/**
 * Extracts a user-friendly error message from various error types.
 * Handles Axios, Viem, and standard JavaScript errors with specific HTTP status codes.
 *
 * @param error - The error to extract a message from
 * @returns A user-friendly error message string
 *
 * @example
 * try {
 *   await poolService.updatePool(id, data);
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   toast.error(message);
 * }
 */
export function getErrorMessage(error: unknown): string {
  // Handle Axios HTTP errors
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    // Authentication errors
    if (status === 401) return "Please log in again";

    // Authorization errors
    if (status === 403) {
      if (message?.includes("ownership")) {
        return "You can only access your own resources";
      }
      return "Permission denied";
    }

    // Not found errors
    if (status === 404) {
      return message || "Resource not found";
    }

    // Rate limiting errors
    if (status === 429) return "Too many requests. Please try again later.";

    // Client errors (400-499)
    if (status && status >= 400 && status < 500) {
      return message || "Invalid request";
    }

    // Server errors (500+)
    if (status && status >= 500) {
      return message || "Server error. Please try again later.";
    }

    // Fallback for Axios errors without response
    return message || error.message || "Network error. Please try again.";
  }

  // Handle blockchain/transaction errors
  if (isBlockchainError(error)) {
    // Use shortMessage if available (more user-friendly)
    if ("shortMessage" in error && error.shortMessage) {
      return error.shortMessage;
    }

    // Common blockchain error patterns
    const errorMessage = error.message || "";

    if (
      errorMessage.includes("User rejected") ||
      errorMessage.includes("user rejected")
    ) {
      return "Transaction rejected by user";
    }

    if (
      errorMessage.includes("insufficient funds") ||
      errorMessage.includes("Insufficient")
    ) {
      return "Insufficient funds for transaction";
    }

    if (
      errorMessage.includes("Blockhash not found") ||
      errorMessage.includes("expired")
    ) {
      return "Transaction expired. Please try again.";
    }

    if (errorMessage.includes("simulation failed")) {
      return "Transaction simulation failed. Please try again.";
    }

    // Fallback to the error message
    return errorMessage || "Transaction failed";
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Handle objects with message property
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  // Ultimate fallback
  return "An unexpected error occurred";
}

/**
 * Enhanced error classifier specifically for file upload operations.
 * Provides more granular error messages for upload-specific scenarios.
 *
 * @param error - The error to classify
 * @returns A user-friendly error message, or null if validation already showed a toast
 *
 * @example
 * try {
 *   await fileService.uploadFile(request);
 * } catch (error) {
 *   const message = getFileUploadErrorMessage(error);
 *   if (message) toast.error(message);
 * }
 */
export function getFileUploadErrorMessage(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401) return "Please log in again";
    if (status === 403) {
      if (message?.includes("ownership")) {
        return "You can only upload files to your own entities";
      }
      return "Upload permission denied";
    }
    if (status === 413) return "File too large";
    if (status === 400) {
      if (message?.includes("Invalid file type")) return "Invalid file type";
      if (message?.includes("File size exceeds")) return "File too large";
      if (message?.includes("file header")) return "Invalid file format";
      if (message?.includes("file path")) return "Invalid file path";
      if (message?.includes("Entity not found")) return "Entity not found";
      if (message?.includes("ownership"))
        return "You can only upload files to your own entities";
      return message || "Invalid request";
    }
    if (status && status >= 500) return "Server error";

    return message || "Upload failed. Please try again.";
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes("Authentication required"))
    return "Please log in again";
  if (errorMessage.includes("File validation failed")) return null; // Validation already showed toast
  if (errorMessage.includes("Network Error")) return "Network error";

  return "Upload failed";
}

/**
 * Get user-friendly error message for OTP verification failures
 *
 * @param errorMessage - The error message to classify
 * @returns A user-friendly error message string
 *
 * @example
 * try {
 *   await verifyOTP(code);
 * } catch (error) {
 *   const message = getOTPErrorMessage(getErrorMessage(error));
 *   toast.error(message);
 * }
 */
export function getOTPErrorMessage(errorMessage: string): string {
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("expired")) {
    return "Code has expired. Please request a new one.";
  }

  if (lowerMessage.includes("rate limit")) {
    return "Too many attempts. Please wait a moment.";
  }

  if (lowerMessage.includes("invalid")) {
    return "Invalid code. Please check and try again.";
  }

  return "Invalid code. Please try again.";
}

/**
 * Get user-friendly error message for resend code failures
 *
 * @param errorMessage - The error message to classify
 * @returns A user-friendly error message string
 *
 * @example
 * try {
 *   await resendCode();
 * } catch (error) {
 *   const message = getResendCodeErrorMessage(getErrorMessage(error));
 *   toast.error(message);
 * }
 */
export function getResendCodeErrorMessage(errorMessage: string): string {
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("rate limit")) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  if (lowerMessage.includes("delivery") || lowerMessage.includes("email")) {
    return "Email delivery failed. Please check your email address.";
  }

  if (lowerMessage.includes("network")) {
    return "Network error. Please check your connection.";
  }

  return "Failed to resend code. Please try again.";
}

/**
 * Get user-friendly error message for recovery code failures
 *
 * @param errorMessage - The error message to classify
 * @returns A user-friendly error message string
 *
 * @example
 * try {
 *   await setupRecoveryCodes();
 * } catch (error) {
 *   const message = getRecoveryCodeErrorMessage(getErrorMessage(error));
 *   toast.error(message);
 * }
 */
export function getRecoveryCodeErrorMessage(errorMessage: string): string {
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("session") || lowerMessage.includes("expired")) {
    return "Your session has expired. Please log in again.";
  }

  if (lowerMessage.includes("network") || lowerMessage.includes("timeout")) {
    return "Network error. Please check your connection and try again.";
  }

  if (lowerMessage.includes("unauthorized") || lowerMessage.includes("401")) {
    return "Authentication failed. Please log in again.";
  }

  return "Failed to complete setup. Please try again.";
}
