import { COOKIE_NAMES } from "@/lib/cookies";
import { logger } from "@/lib/logger";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/signup"] as const;
const ADMIN_CHECK_TIMEOUT_MS = 5000;
const ROLE_CACHE_TTL_MS = 60 * 1000;
const ROLE_CACHE_MAX_SIZE = 200;

// JWKS endpoint for Dynamic Labs JWT verification (RS256).
// Uses the canonical app.dynamic.xyz URL — docs only reference this endpoint,
// custom hostnames are CNAME proxies but JWKS path is not confirmed to mirror.
const DYNAMIC_ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID;

const JWKS = createRemoteJWKSet(
  new URL(
    `https://app.dynamic.xyz/api/v0/sdk/${DYNAMIC_ENV_ID}/.well-known/jwks`,
  ),
);

// Expected issuer claim varies by environment:
// - Custom hostname (production): auth.credit.markets/<env_id>
// - Default (sandbox/dev): app.dynamicauth.com/<env_id>
const CUSTOM_HOSTNAME = process.env.NEXT_PUBLIC_DYNAMIC_API_BASE_URL
  ? new URL(process.env.NEXT_PUBLIC_DYNAMIC_API_BASE_URL).hostname
  : null;
const EXPECTED_ISSUER = CUSTOM_HOSTNAME
  ? `${CUSTOM_HOSTNAME}/${DYNAMIC_ENV_ID}`
  : `app.dynamicauth.com/${DYNAMIC_ENV_ID}`;

// ─── JWT Verification ─────────────────────────────────────────────────────────

interface JwtResult {
  valid: boolean;
  jwt: string;
}

/**
 * Verify Dynamic Labs JWT per their docs:
 * - RS256 signature via JWKS
 * - exp (not expired)
 * - iss matches app.dynamic.xyz/<env_id>
 * - scope includes "user:basic" (rejects MFA-pending tokens)
 *
 * Returns the raw token string if valid, null otherwise.
 */
async function verifyJwt(request: NextRequest): Promise<JwtResult | null> {
  const token = request.cookies.get(COOKIE_NAMES.DYNAMIC_AUTH)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["RS256"],
      issuer: EXPECTED_ISSUER,
    });

    // Dynamic docs: "Verify the scope list includes user:basic to confirm
    // full authentication. Tokens with requiresAdditionalAuth (MFA pending)
    // should NOT be trusted for protected operations."
    const scopes = ((payload.scope as string) || "").split(" ");
    if (!scopes.includes("user:basic")) {
      return null;
    }

    return { valid: true, jwt: token };
  } catch (error) {
    logger.warn("JWT verification failed", { path: request.nextUrl.pathname, error: String(error) });
    return null;
  }
}

// ─── Role Cache (bounded LRU-style) ──────────────────────────────────────────

interface CachedRole {
  isAdmin: boolean;
  isAttester: boolean;
  expiresAt: number;
}

// Key by a short hash of the JWT (first 32 chars) rather than the full token
// to keep memory usage bounded. Collisions are acceptable since this is a
// performance cache, not a security gate — the backend re-verifies every request.
function cacheKey(jwt: string): string {
  return jwt.slice(-32);
}

const roleCache = new Map<string, CachedRole>();

function getCachedRole(
  jwt: string,
): { isAdmin: boolean; isAttester: boolean } | null {
  const key = cacheKey(jwt);
  const cached = roleCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    roleCache.delete(key);
    return null;
  }

  return { isAdmin: cached.isAdmin, isAttester: cached.isAttester };
}

function setCachedRole(
  jwt: string,
  roles: { isAdmin: boolean; isAttester: boolean },
): void {
  const key = cacheKey(jwt);

  // Evict expired entries when approaching capacity
  if (roleCache.size >= ROLE_CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [k, v] of roleCache) {
      if (now > v.expiresAt) roleCache.delete(k);
    }
    // If still at capacity after purge, drop oldest entries
    if (roleCache.size >= ROLE_CACHE_MAX_SIZE) {
      const excess = roleCache.size - ROLE_CACHE_MAX_SIZE + 1;
      const keys = roleCache.keys();
      for (let i = 0; i < excess; i++) {
        const next = keys.next();
        if (!next.done) roleCache.delete(next.value);
      }
    }
  }

  roleCache.set(key, {
    isAdmin: roles.isAdmin,
    isAttester: roles.isAttester,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  });
}

// ─── Admin Verification ──────────────────────────────────────────────────────

async function verifyAdminAccess(
  jwt: string,
): Promise<{ isAdmin: boolean; isAttester: boolean }> {
  const cached = getCachedRole(jwt);
  if (cached) return cached;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_API_URL}/users/me/roles`,
    {
      headers: { Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(ADMIN_CHECK_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    logger.warn("Role verification failed", { status: response.status, statusText: response.statusText });
    return { isAdmin: false, isAttester: false };
  }

  const { isAdmin, isAttester } = await response.json();
  const roles = { isAdmin: !!isAdmin, isAttester: !!isAttester };

  setCachedRole(jwt, roles);
  return roles;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createRedirectUrl(
  base: string,
  path: string,
  params?: Record<string, string>,
): URL {
  const url = new URL(path, base);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

/**
 * Validate that a redirect ref is a safe same-origin path.
 * Prevents open redirect attacks via crafted `?ref=` params.
 */
function isSafeRef(ref: string | null): ref is string {
  return !!ref && ref.startsWith("/") && !ref.startsWith("//");
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;

  const isAuthPage = AUTH_PAGES.includes(
    pathname as (typeof AUTH_PAGES)[number],
  );
  const isAdminPage = pathname.startsWith("/admin");

  // Dynamic Labs uses two storage modes:
  // - Cookie storage (production): httpOnly cookie readable by middleware
  // - In-app storage (dev/sandbox): JWT in localStorage, invisible to Edge middleware
  // When no cookie is present, skip auth redirects — backend guards still enforce auth.
  const result = await verifyJwt(request);
  const authenticated = !!result;

  // Cookie storage is enabled only when a custom hostname is configured (production).
  // Read at runtime (not module-level) so tests can set the env var.
  // Without it (dev/sandbox), the SDK uses in-app storage and the middleware
  // cannot determine auth state — let the client handle routing.
  const cookieAuthEnabled = !!process.env.NEXT_PUBLIC_DYNAMIC_API_BASE_URL;

  if (cookieAuthEnabled) {
    // Redirect authenticated users away from auth pages
    if (isAuthPage && authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Redirect unauthenticated users to login
    if (!isAuthPage && !authenticated) {
      const ref = searchParams.get("ref");
      const loginUrl = createRedirectUrl(
        request.url,
        "/login",
        isSafeRef(ref) ? { ref } : undefined,
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  // Verify role-based access for admin pages
  if (isAdminPage && result) {
    try {
      const { isAdmin, isAttester } = await verifyAdminAccess(result.jwt);
      const isKybRoute = pathname.startsWith("/admin/kyb-queue");

      if (isAdmin) {
        return NextResponse.next();
      }
      if (isAttester && isKybRoute) {
        return NextResponse.next();
      }
      if (isAttester) {
        return NextResponse.redirect(new URL("/admin/kyb-queue", request.url));
      }
      return NextResponse.redirect(createRedirectUrl(request.url, "/"));
    } catch (error) {
      logger.error("Admin verification failed", error, { pathname });
      return NextResponse.redirect(createRedirectUrl(request.url, "/"));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher:
    "/((?!api|_next/static|_next/image|assets|favicon|manifest|sitemap.xml|robots.txt).*)",
};
