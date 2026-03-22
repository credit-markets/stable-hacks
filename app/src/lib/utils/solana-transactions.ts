/**
 * Parse Anchor program errors into human-readable messages.
 * The vault program has 10 custom error codes (6000-6009).
 *
 * Anchor errors come as structured objects with `code` and `msg` fields,
 * NOT as plain strings. Without parsing, the user sees "Transaction failed"
 * instead of a useful message.
 */
/** Anchor framework errors (100-199) */
const ANCHOR_ERRORS: Record<number, string> = {
  100: "Instruction decoding failed: not enough data.",
  101: "Instruction decoding failed: unknown instruction.",
  102: "Instruction deserialization failed — the IDL may be out of sync with the deployed program.",
  103: "Account decoding failed: not enough data.",
  104: "Account decoding failed: unknown account.",
  150: "A required signer is missing.",
  151: "Insufficient lamports for rent exemption.",
  152: "An account constraint was violated.",
  153: "An address constraint was violated.",
  2000: "Account discriminator mismatch.",
  2006: "Account already initialized.",
  3000: "Constraint violated: account owner mismatch.",
};

/** Custom program errors (6000+) */
const PROGRAM_ERRORS: Record<number, string> = {
  6000: "Investment window is not open.",
  6001: "Amount is below the minimum investment.",
  6002: "Your KYC membership has expired. Please update your verification.",
  6003: "Your account is frozen by compliance. Contact support.",
  6004: "This request is no longer in pending status.",
  6005: "Redemption notice period has not elapsed yet.",
  6006: "Insufficient vault liquidity for this redemption.",
  6007: "Unauthorized — you are not the pool manager.",
  6008: "Invalid NAV per share — must be greater than zero.",
  6009: "You already have a pending request for this pool.",
};

/**
 * Check whether the error represents a user-initiated wallet rejection.
 * Dynamic Labs passes through the underlying wallet provider's error,
 * so the message varies by provider (Phantom, Solflare, etc.).
 */
export function isUserRejection(error: Record<string, any>): boolean {
  const msg = (error?.message || "").toLowerCase();
  return (
    msg.includes("user rejected") || // Phantom
    msg.includes("user cancelled") || // Solflare
    msg.includes("user denied") || // Generic
    msg.includes("rejected the request") || // Some providers
    msg.includes("transaction declined") || // Backpack
    error?.code === 4001 // EIP-1193 standard
  );
}

export function parseSolanaError(error: Record<string, any>): string {
  // Wallet rejection — clear, non-alarming message
  if (isUserRejection(error)) {
    return "Transaction cancelled.";
  }

  // Axios error with backend response — extract the server message
  if (error?.response?.data?.message) {
    const msg = error.response.data.message;
    return typeof msg === "string"
      ? msg
      : Array.isArray(msg)
        ? msg.join(". ")
        : String(msg);
  }

  // Normalize message — NestJS may return { message: string[] }
  if (error?.message && typeof error.message !== "string") {
    const msg = Array.isArray(error.message)
      ? error.message.join(". ")
      : String(error.message);
    return msg || "Transaction failed. Please try again.";
  }

  // Anchor error with code
  if (error?.code !== undefined) {
    if (PROGRAM_ERRORS[error.code]) return PROGRAM_ERRORS[error.code];
    if (ANCHOR_ERRORS[error.code]) return ANCHOR_ERRORS[error.code];
  }

  // Extract hex error code from SendTransactionError or simulation logs
  const match = error?.message?.match(/custom program error: 0x([0-9a-fA-F]+)/);
  if (match) {
    const code = Number.parseInt(match[1], 16);
    if (PROGRAM_ERRORS[code]) return PROGRAM_ERRORS[code];
    if (ANCHOR_ERRORS[code]) return ANCHOR_ERRORS[code];
    if (code === 0) {
      return "Transaction failed during simulation. This may indicate an account constraint violation or an uninitialized account.";
    }
    return `Program error (code ${code} / 0x${match[1]}).`;
  }

  // Extract AnchorError message from logs
  const anchorMatch = error?.message?.match(
    /AnchorError.*?Error Code: (\w+).*?Error Number: (\d+).*?Error Message: ([^."]+)/,
  );
  if (anchorMatch) {
    const code = Number.parseInt(anchorMatch[2], 10);
    const knownMsg = PROGRAM_ERRORS[code] || ANCHOR_ERRORS[code];
    return knownMsg || `${anchorMatch[1]}: ${anchorMatch[3]}.`;
  }

  // Simulation failure — extract the readable part
  if (error?.message?.includes("Simulation failed")) {
    const simMatch = error.message.match(/Error Message: ([^."]+)/);
    if (simMatch) return `Simulation failed: ${simMatch[1]}.`;
  }

  // SendTransactionError with logs — extract useful info
  if (error?.logs && Array.isArray(error.logs)) {
    const errorLog = error.logs.find(
      (log: string) =>
        log.includes("Error") ||
        log.includes("failed") ||
        log.includes("insufficient"),
    );
    if (errorLog) return `Transaction failed: ${errorLog}`;
  }

  // Backend 409 conflict (duplicate request check)
  if (error?.status === 409) return error.message;

  // Fallback
  return error?.message || "Transaction failed. Please try again.";
}
