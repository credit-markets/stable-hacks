# Authentication & Authorization

This document describes the authentication and authorization system of the Credit Markets frontend. Auth is powered by Dynamic Labs SDK with custom UI, JWT-based middleware protection, and role-based access control.

---

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Authentication Flow                        │
│                                                                    │
│  User ──► Custom Auth UI ──► Dynamic Labs SDK ──► JWT Cookie      │
│                                                                    │
│  JWT Cookie ──► Middleware (JWKS verify) ──► Route Access          │
│                                                                    │
│  JWT Cookie ──► Axios Interceptor ──► Backend API (Bearer token)  │
│                                                                    │
│  Backend ──► Independent JWKS verification (no shared secrets)    │
└──────────────────────────────────────────────────────────────────┘
```

There are no shared secrets between frontend and backend. Both verify the Dynamic Labs JWT independently via JWKS (RS256).

---

## Dynamic Labs Integration

### Provider Setup (`src/app/providers.tsx`)

The `DynamicContextProvider` is configured in the provider tree:

```tsx
<DynamicContextProvider
  settings={{
    environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
    apiBaseUrl: process.env.NEXT_PUBLIC_DYNAMIC_API_BASE_URL || undefined,
    walletConnectors: [SolanaWalletConnectors],
    cssOverrides: `
      .widget-portal,
      .dynamic-widget-modal,
      .dynamic-widget-inline-controls {
        display: none !important;
      }
    `,
  }}
>
```

Key configuration:
- **`environmentId`** — Must match the backend's `DYNAMIC_ENVIRONMENT_ID`
- **`apiBaseUrl`** — Custom hostname for production cookie-based auth (e.g., `https://auth.credit.markets`). In dev/sandbox, the SDK uses `app.dynamic.xyz` with open CORS for localhost.
- **`walletConnectors`** — Only Solana wallet connectors are enabled
- **`cssOverrides`** — Hides the default Dynamic Labs modal. The app uses a fully custom auth UI.

The Dynamic Labs shadow DOM is also hidden in `globals.css`:

```css
.dynamic-shadow-dom {
  position: fixed !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  clip-path: inset(50%) !important;
  pointer-events: none !important;
  opacity: 0 !important;
}
```

### Environment Configuration

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_DYNAMIC_ENV_ID` | Dynamic Labs environment ID (required) |
| `NEXT_PUBLIC_DYNAMIC_API_BASE_URL` | Custom hostname for cookie auth (production only) |
| `NEXT_PUBLIC_DYNAMIC_API_URL` | Dynamic Labs API URL override (optional) |

---

## JWT Token Flow

### 1. Token Acquisition

When a user authenticates via Dynamic Labs (email, wallet, Google, passkey), the SDK sets a cookie named `DYNAMIC_JWT_TOKEN`.

### 2. Cookie Storage

The JWT is stored as a browser cookie. In production with a custom hostname, Dynamic Labs sets this as an `httpOnly` cookie via CNAME proxy.

Cookie name constant is defined in `src/lib/cookies.ts`:

```typescript
export const COOKIE_NAMES = {
  DYNAMIC_AUTH: "DYNAMIC_JWT_TOKEN",
} as const;
```

### 3. Middleware Verification

The Next.js middleware (`src/middleware.ts`) verifies the JWT on every request:

```typescript
const { payload } = await jwtVerify(token, JWKS, {
  algorithms: ["RS256"],
  issuer: EXPECTED_ISSUER,
});

// Verify scope includes "user:basic"
const scopes = ((payload.scope as string) || "").split(" ");
if (!scopes.includes("user:basic")) {
  return null; // Reject MFA-pending tokens
}
```

JWKS endpoint: `https://app.dynamic.xyz/api/v0/sdk/${DYNAMIC_ENV_ID}/.well-known/jwks`

Expected issuer:
- Production (custom hostname): `{custom_hostname}/{env_id}` (e.g., `auth.credit.markets/{env_id}`)
- Development: `app.dynamicauth.com/{env_id}`

### 4. API Request Authorization

The Axios instance (`src/services/api.ts`) includes:
- `withCredentials: true` — sends cookies with cross-origin requests
- A request interceptor that reads the `DYNAMIC_JWT_TOKEN` cookie and sets `Authorization: Bearer <token>` as a fallback (for Safari ITP or strict cookie modes)

```typescript
api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${DYNAMIC_AUTH_COOKIE}=`));
    if (match) {
      const token = match.split("=").slice(1).join("=");
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
```

### 5. Backend Verification

The backend independently verifies the same JWT using JWKS. No shared secrets exist between frontend and backend.

---

## Middleware Route Protection (`src/middleware.ts`)

### Matcher

The middleware runs on all routes except static assets:

```typescript
export const config = {
  matcher: "/((?!api|_next/static|_next/image|assets|favicon|manifest|sitemap.xml|robots.txt).*)",
};
```

### Protection Logic

```
Request arrives
  │
  ├─► Verify JWT (signature + expiry + scope)
  │
  ├─► Auth page (/login, /signup) + authenticated? → Redirect to /
  │
  ├─► Non-auth page + not authenticated? → Redirect to /login
  │
  ├─► Admin page (/admin/*) + authenticated?
  │     │
  │     ├─► Fetch roles from backend (/users/me/roles)
  │     │
  │     ├─► isAdmin? → Allow access to all admin pages
  │     │
  │     ├─► isAttester + on /admin/kyb-queue? → Allow access
  │     │
  │     ├─► isAttester + on other admin page? → Redirect to /admin/kyb-queue
  │     │
  │     └─► Neither? → Redirect to /
  │
  └─► All other authenticated routes → Allow access
```

### Role Cache

Admin role verification results are cached in-memory:
- **TTL**: 60 seconds
- **Max entries**: 200 (LRU-style eviction)
- **Key**: Last 32 characters of JWT
- **Timeout**: 5 seconds for the backend role check API call

This is a performance optimization only; the backend re-verifies every API request independently.

### Open Redirect Prevention

The `?ref=` parameter is validated:

```typescript
function isSafeRef(ref: string | null): ref is string {
  return !!ref && ref.startsWith("/") && !ref.startsWith("//");
}
```

---

## Role-Based Access

### User Roles

Roles are fetched from the backend via `/users/me/roles`:

```typescript
interface UserRoles {
  isAdmin: boolean;
  isManager: boolean;
  isAttester: boolean;
  managedPoolIds: string[];
}
```

### Route Access Matrix

| Route Pattern | Required Role |
|---------------|--------------|
| `/login`, `/signup` | Unauthenticated only |
| `/`, `/portfolio`, `/account`, `/pool/*` | Any authenticated user |
| `/manager`, `/manager/*` | Any authenticated user (features gated in UI) |
| `/onboarding/kyb` | Any authenticated user |
| `/admin` (all pages except KYB) | Admin |
| `/admin/kyb-queue`, `/admin/kyb-queue/*` | Admin or Attester |

### Role Hooks

**`useUserRole()`** — `src/hooks/useUserRole.ts`

Fetches roles from `/users/me/roles` via React Query. Cached for 5 minutes.

```typescript
const { data: roles, isLoading } = useUserRole();

if (roles?.isAdmin) { /* show admin features */ }
if (roles?.isManager) { /* show manager features */ }
```

**`useCurrentUser()`** — `src/hooks/useCurrentUser.ts`

Fetches user data from `/users/me`. Returns `ExtendedUserData` which includes the wallet address from Dynamic Labs context.

```typescript
const { data: user, isLoading } = useCurrentUser();
```

---

## Auth UI Flow

The app uses a fully custom auth UI instead of the default Dynamic Labs widget.

### Auth Steps

Managed by `useAuthState()` hook (`src/hooks/auth/useAuthState.ts`):

1. **`start`** — Initial login selection (email, Google, wallet, passkey)
2. **`otp`** — Email OTP verification
3. **`loading`** — Processing authentication with backend
4. **`passkey`** — Passkey registration or authentication
5. **`recovery`** — Display recovery codes after new wallet creation

### Auth Hooks

Located in `src/hooks/auth/`:

| Hook | Purpose |
|------|---------|
| `useAuthState()` | Multi-step auth flow state management |
| `useEmailAuthFlow()` | Email authentication flow |
| `useEmailAuthHandler()` | Email OTP handling |
| `usePasskeyFlow()` | Passkey registration and authentication |
| `useWalletConnection()` | Wallet connection flow |
| `useWalletPolling()` | Polls for wallet address after connection |

### User Creation

**`useUserCreation()`** — `src/hooks/useUserCreation.ts`

Automatically creates a user record in the backend on first login. Runs after Dynamic Labs authentication completes.

---

## Wallet Connection

### ConnectButton

`src/components/ConnectButton.tsx` — The wallet connect button used in the Header and Admin layout. Uses Dynamic Labs `useDynamicContext()` to manage wallet state.

### Wallet Address Handling

Solana base58 addresses are **case-sensitive**. Never use `.toLowerCase()` on wallet addresses.

```typescript
// WRONG:
wallet.toLowerCase()

// RIGHT:
wallet // use as-is from JWT/chain
```

---

## Logout

### Server Action

`src/app/actions/auth.ts` provides a server action for cookie cleanup:

```typescript
"use server";

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.DYNAMIC_AUTH, "", deleteOptions);
}
```

Cookie deletion options (`src/lib/cookies.ts`):
- Production: `httpOnly: true`, `secure: true`, `sameSite: "strict"`
- Development: `secure: false`, `sameSite: "lax"`
- `expires: new Date(0)` — sets to Unix epoch to delete

### Dynamic Labs Logout

The `handleLogOut()` function from `useDynamicContext()` handles the Dynamic Labs SDK logout. Combined with `clearAuthCookies()`, this fully clears the session.

---

## Session Handling

- **Token storage**: Browser cookie (`DYNAMIC_JWT_TOKEN`)
- **Token lifetime**: Controlled by Dynamic Labs (not configurable on frontend)
- **Session persistence**: Cookie persists across page refreshes
- **Expiry handling**: Middleware rejects expired tokens and redirects to `/login`
- **No refresh token**: Dynamic Labs manages token refresh internally

---

## Auth Patterns in Components

### Checking Authentication State

```typescript
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const { user, primaryWallet } = useDynamicContext();

// User is authenticated if `user` exists
if (user) { /* authenticated */ }

// Wallet is connected if `primaryWallet` exists
if (primaryWallet?.address) { /* wallet connected */ }
```

### Conditional Rendering by Role

```typescript
const { data: roles } = useUserRole();

{roles?.isAdmin && <AdminPanel />}
{roles?.isManager && <ManagerDashboard />}
```

### Protecting API Calls

API calls are automatically authenticated via the Axios interceptor. No manual token handling is needed in components:

```typescript
// The api instance automatically includes the Bearer token
const response = await api.get("/pools");
```

---

## Security Considerations

1. **No shared secrets** — Frontend and backend verify JWTs independently via JWKS
2. **RS256 algorithm** — Asymmetric signing (public key verification only)
3. **Scope verification** — Middleware rejects MFA-pending tokens (missing `user:basic` scope)
4. **httpOnly cookies** — In production, the JWT cookie is httpOnly (set by Dynamic Labs via CNAME)
5. **Open redirect prevention** — `?ref=` parameter validated against path traversal
6. **Role cache is advisory** — The middleware role cache is for performance; the backend re-verifies every request
7. **HSTS and security headers** — Configured in `next.config.mjs`
