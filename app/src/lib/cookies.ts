import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

// Cookie name constants used throughout authentication
// DYNAMIC_JWT_TOKEN is the official cookie name set by Dynamic Labs SDK
// when cookie-based authentication is enabled via apiBaseUrl.
export const COOKIE_NAMES = {
  DYNAMIC_AUTH: "DYNAMIC_JWT_TOKEN",
} as const;

/**
 * Get cookie deletion options.
 * Sets expiration to Unix epoch (Jan 1, 1970) to delete the cookie.
 *
 * In production, Dynamic Labs' backend sets the JWT cookie as httpOnly
 * (via custom hostname + CNAME). The deletion must match those flags
 * or the browser will refuse to clear it.
 */
export function getDeleteCookieOptions(): Partial<ResponseCookie> {
  const prod = process.env.NODE_ENV === "production";

  return {
    path: "/",
    sameSite: prod ? "strict" : "lax",
    secure: prod,
    httpOnly: prod,
    expires: new Date(0),
  };
}
