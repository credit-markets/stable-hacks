// Authentication-related TypeScript types

export interface AuthConfig {
  readonly PENDING_AUTH_KEY: string;
  readonly STALE_AUTH_TIMEOUT: number;
  readonly OTP_LENGTH: number;
}

// Authentication configuration constants
export const AUTH_CONFIG: AuthConfig = {
  PENDING_AUTH_KEY: "pendingGoogleAuth",
  STALE_AUTH_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  OTP_LENGTH: 6,
} as const;

export interface AuthError {
  message: string;
  code?: string;
  type: "network" | "validation" | "authentication" | "unknown";
}

import type { User } from "@/services/api";

// DBUserData is an alias for the canonical User type from api.ts.
// The backend now returns flat Supabase fields (id, account, etc.)
export type DBUserData = User;

export interface AuthState {
  loading: boolean;
  provider: "google" | "wallet" | "email" | null;
  error: string | null;
}

export type AuthStep =
  | "start"
  | "loading"
  | "otp"
  | "passkey"
  | "recovery-codes";
