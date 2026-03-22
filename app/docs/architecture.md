# Frontend Architecture

This document describes the architecture of the Credit Markets frontend, a Next.js 15 application built with the App Router.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack dev) | 15.0.7 |
| UI Library | React | 18.3.x |
| Component Library | NextUI | 2.4.x |
| Styling | Tailwind CSS + custom design system (`styleClasses.ts`) | 3.4.x |
| Data Fetching | TanStack React Query | 5.59.x |
| Forms | TanStack React Form + Zod | 0.34.x |
| HTTP Client | Axios | 1.7.x |
| Auth | Dynamic Labs SDK (Solana connectors) | 4.66.0 |
| Blockchain | Solana Web3.js + Anchor | 1.95 / 0.32 |
| Realtime | Supabase JS Client | 2.98.x |
| Charts | ApexCharts + Recharts | |
| Rich Text | MDX Editor | 3.29.x |
| Icons | Lucide React + Phosphor Icons | |
| Linting | Biome | 1.9.4 |
| Testing | Vitest + React Testing Library + jsdom | |
| Env Validation | @t3-oss/env-nextjs + Zod | |

---

## Directory Structure

```
app/
├── public/
│   ├── assets/                 # Static images (banner.png, etc.)
│   └── favicon/                # Favicons
├── src/
│   ├── app/                    # Next.js App Router (pages, layouts, actions)
│   ├── components/             # Shared reusable components
│   ├── config/                 # Query client, Solana, query defaults
│   ├── constants/              # API URL, chart colors, file types, status colors
│   ├── env/                    # Build-time environment validation
│   ├── hooks/                  # Custom React hooks (data fetching, auth, pools)
│   ├── lib/                    # Style system, logger, cookies, validations, utils
│   ├── middleware.ts           # Auth middleware (JWT verification, role routing)
│   ├── services/               # API client layer (Axios service functions)
│   ├── styles/                 # Global CSS (design tokens, patterns)
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Formatting, error handling, route constants
├── biome.json                  # Linter configuration
├── next.config.mjs             # Next.js configuration
├── tailwind.config.ts          # Tailwind + NextUI design system
├── vitest.config.ts            # Test runner configuration
└── vitest.setup.ts             # Global test mocks
```

---

## App Router Structure

### Route Groups

The app uses Next.js route groups to apply different layouts to different sections:

| Route Group | Layout | Description |
|-------------|--------|-------------|
| `(dashboard)` | `AppLayout` (Header + Footer) | Main application pages |
| `admin` | Custom sidebar layout | Admin panel with sidebar navigation |
| `login`, `signup` | No layout | Standalone auth pages |

### Page Hierarchy

```
src/app/
├── layout.tsx              # Root layout (fonts, metadata, <Providers>)
├── providers.tsx           # Client providers (QueryClient, Dynamic, NextUI, Toaster)
├── error.tsx               # Global error boundary
├── not-found.tsx           # Global 404 page
├── actions/
│   └── auth.ts             # Server Action: clearAuthCookies()
├── components/
│   ├── DashboardView.tsx   # Marketplace page view component
│   ├── MarketplaceContent.tsx
│   └── PortfolioView.tsx   # Portfolio page view component
├── (dashboard)/
│   ├── layout.tsx          # Wraps children in AppLayout
│   ├── page.tsx            # / — Marketplace (pool listings)
│   ├── account/            # /account
│   ├── portfolio/          # /portfolio
│   ├── pool/[address]/     # /pool/:address (SSR with React.cache)
│   ├── manager/            # /manager, /manager/pools/:id, /manager/profile/*
│   ├── onboarding/kyb/     # /onboarding/kyb (multi-step wizard)
│   └── risk-methodology/   # /risk-methodology (static)
├── admin/
│   ├── layout.tsx          # Sidebar nav + role verification
│   ├── page.tsx            # /admin
│   ├── users/              # /admin/users
│   ├── pools/              # /admin/pools
│   ├── managers/           # /admin/managers
│   ├── kyb-queue/          # /admin/kyb-queue, /admin/kyb-queue/:id
│   └── events/             # /admin/events
├── login/                  # /login
└── signup/                 # /signup
```

### Route Constants

All routes are defined centrally in `src/utils/pages.ts` via the `PAGES` object:

```typescript
import PAGES from "@/utils/pages";

// Static routes
PAGES.HOME           // "/"
PAGES.LOGIN          // "/login"
PAGES.PORTFOLIO      // "/portfolio"

// Dynamic routes
PAGES.POOL.DETAILS(address)          // "/pool/:address"
PAGES.MANAGER.POOLS.DETAIL(poolId)   // "/manager/pools/:poolId"
PAGES.MANAGER.PROFILE.BY_ADDRESS(addr) // "/manager/profile/:address"
```

---

## Provider Tree

The root layout (`src/app/layout.tsx`) wraps the entire app in `<Providers>`:

```
<html>
  <body>
    <Providers>                          ← src/app/providers.tsx (client component)
      <QueryClientProvider>              ← TanStack React Query
        <DynamicContextProvider>          ← Dynamic Labs auth SDK
          <NextUIProvider>               ← NextUI component theme
            <Toaster />                  ← react-hot-toast notifications
            <ReactQueryDevtools />       ← Dev-only query inspector
            {children}                   ← Page content
          </NextUIProvider>
        </DynamicContextProvider>
      </QueryClientProvider>
    </Providers>
  </body>
</html>
```

Key configuration in `DynamicContextProvider`:
- `environmentId` from `NEXT_PUBLIC_DYNAMIC_ENV_ID`
- `walletConnectors: [SolanaWalletConnectors]` (Solana-only)
- `cssOverrides` hides the default Dynamic Labs modal UI (the app uses a fully custom auth UI)
- Optional `apiBaseUrl` for production cookie-based auth via custom hostname

---

## Data Flow: Service -> Hook -> Component

The application follows a strict three-tier data fetching pattern:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Service Layer  │────►│   Hook Layer    │────►│  Component Layer │
│  (src/services/) │     │  (src/hooks/)   │     │ (src/components/)│
│                  │     │                  │     │                  │
│  Plain async     │     │  useQuery /      │     │  Renders data,   │
│  functions using │     │  useMutation     │     │  handles loading │
│  Axios           │     │  wrappers        │     │  and error states│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Service Layer (`src/services/`)

Plain async functions that call the backend API via a pre-configured Axios instance:

- `api.ts` — Axios instance with `baseURL`, `withCredentials: true`, and a request interceptor that injects `Authorization: Bearer <jwt>` from the Dynamic Labs cookie
- `poolService.ts` — Pool CRUD, NAV history
- `userService.ts` — User roles endpoint
- `managerService.ts` — Manager profiles, image upload
- `kybService.ts` — KYB submissions (investor + attester methods)
- `fileService.ts` — File upload with progress, signed URL retrieval
- `riskService.ts` — Risk scores, monthly data, metric definitions
- `adminProfileService.ts` — Admin manager profile management
- `notaFiscalService.ts` — Trade receivable items and aggregates

### Hook Layer (`src/hooks/`)

React Query wrappers that cache data and manage loading/error states:

```typescript
// Example: src/hooks/pools/usePoolsQuery.ts
export function usePoolsQuery(options) {
  return useQuery({
    queryKey: ["pools", queryString],
    queryFn: () => getPools(queryString),
    ...queryConfigs,
  });
}
```

Hooks are organized by domain:
- `hooks/pools/` — Pool operations (query, invest, redeem, approve, NAV history)
- `hooks/auth/` — Auth flow (email, passkey, wallet connection, state management)
- `hooks/admin/` — Admin operations (events, managers, pools, pipeline keys)
- `hooks/managers/` — Manager profiles
- `hooks/kyb/` — KYB submissions
- `hooks/risk/` — Risk scores and monthly data
- `hooks/notaFiscal/` — Trade receivable hooks

### Component Layer

Components consume hooks and render UI. They handle loading skeletons, error states, and empty states using the hook return values (`isLoading`, `error`, `data`).

---

## Server vs Client Components

The application defaults to Server Components per Next.js 15 conventions:

**Server Components** (no `'use client'` directive):
- Page files (`page.tsx`) — render static metadata and wrap client views in `<Suspense>`
- Layout files — `(dashboard)/layout.tsx` simply wraps children in `AppLayout`
- `lib/server/cached-pool.ts` — uses `React.cache()` for SSR pool data deduplication

**Client Components** (`'use client'`):
- Any component using React hooks (`useState`, `useEffect`, `useQuery`)
- Components with event handlers (`onClick`, `onSubmit`)
- Components using browser APIs
- The `providers.tsx` file (wraps the entire provider tree)
- All hooks (they use React state and effects)

### SSR Data Deduplication

The pool detail page (`/pool/:address`) uses `React.cache()` in `lib/server/cached-pool.ts` to ensure that `generateMetadata()` and the page component share the same data fetch:

```typescript
export const getCachedPool = cache(async (poolIdOrAddress: string): Promise<Pool> => {
  return await getPool(poolIdOrAddress);
});
```

---

## Middleware and Route Protection

`src/middleware.ts` runs on every request (except static assets, `_next`, `api`):

1. **JWT Verification** — Verifies the Dynamic Labs JWT cookie using RS256 via JWKS. Checks `scope` includes `user:basic` (rejects MFA-pending tokens).

2. **Auth Page Redirect** — Authenticated users on `/login` or `/signup` are redirected to `/`.

3. **Unauthenticated Redirect** — Non-auth pages redirect unauthenticated users to `/login`.

4. **Admin Role Verification** — For `/admin/*` routes, calls the backend `/users/me/roles` endpoint to verify admin/attester role. Results are cached in an in-memory LRU-style Map (max 200 entries, 60s TTL).

5. **Attester Restriction** — Attester role users can only access `/admin/kyb-queue/*`. They are redirected there from other admin pages.

6. **Open Redirect Prevention** — The `?ref=` parameter is validated to be a safe same-origin path (starts with `/`, not `//`).

Matcher pattern:
```
/((?!api|_next/static|_next/image|assets|favicon|manifest|sitemap.xml|robots.txt).*)
```

---

## Environment Configuration

All environment variables are validated at build time via `@t3-oss/env-nextjs` in `src/env/client.mjs`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_BASE_API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend URL (must be valid URL) |
| `NEXT_PUBLIC_DYNAMIC_ENV_ID` | Yes | Dynamic Labs environment ID |
| `NEXT_PUBLIC_DYNAMIC_API_BASE_URL` | No | Custom hostname for Dynamic Labs (production) |
| `NEXT_PUBLIC_DYNAMIC_API_URL` | No | Dynamic Labs API URL override |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Yes | `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | No | Custom RPC URL |
| `NEXT_PUBLIC_ATTESTER` | No | Platform attester Solana address |
| `ANALYZE` | No | `true` enables bundle analyzer |

If any required variable is missing, the build fails with a descriptive error.

---

## Error Handling

### Global Error Boundary

`src/app/error.tsx` catches unhandled errors at the application level:
- Logs errors via `logger.error()` with context (digest, stack, user agent)
- In production, sends error reports to `/api/errors`
- Renders a user-friendly error page with "Try again" and "Go to homepage" buttons

### 404 Page

`src/app/not-found.tsx` renders a custom 404 page within the `AppLayout`.

### API Error Handling

- **Mutations**: The QueryClient's `defaultOptions.mutations.onError` shows toast errors for all failed mutations
- **Queries**: Query-level `meta.error` shows toast errors when configured
- **Axios interceptor**: The API client passes errors through to React Query for handling

### Pool Fetch Errors

`lib/server/cached-pool.ts` maps Axios errors to named errors (`PoolNotFoundError`, `PoolServerError`) for error boundaries to handle.

---

## Loading States

### Suspense Boundaries

Pages wrap client views in `<Suspense>` with `<LoadingOverlay>` fallbacks:

```tsx
<Suspense fallback={<LoadingOverlay height="lg" />}>
  <DashboardView />
</Suspense>
```

### Skeleton Loading

The style system provides skeleton tokens (`styles.sk.*`) for content placeholder animations:

```tsx
<div className={cx(styles.sk.base, styles.sk.textMd, "w-48")} />
```

Components like `PageSkeleton`, `ContentReveal`, and `StaggerReveal` provide higher-level loading patterns.

---

## Build and Bundle Strategy

### Next.js Configuration (`next.config.mjs`)

- **React Strict Mode** enabled
- **Image optimization**: Remote patterns allow all HTTPS hostnames
- **Package optimization**: `experimental.optimizePackageImports` tree-shakes Dynamic Labs, NextUI, and Lucide React
- **Bundle analyzer**: Enabled via `ANALYZE=true` environment variable
- **Security headers**: Applied to all routes (HSTS, X-Frame-Options, CSP-related headers)
- **Webpack externals**: `pino-pretty`, `lokijs`, `encoding` excluded from client bundle

### Import Aliases

- `@/*` maps to `./src/*`
- `@shared/*` maps to `../shared/*` (monorepo shared code)

All imports must use the `@/` alias; relative imports are not allowed.

---

## Logging

`src/lib/logger.ts` provides a structured logging utility:

- **Levels**: `info`, `warn`, `error`, `debug`
- **Format**: `[ISO timestamp] [LEVEL] message {context}`
- **Production**: Only `warn` and `error` are logged
- **Development**: All levels are logged

---

## Solana / Web3 Integration

### Configuration (`src/config/solana.ts`)

- `SOLANA_NETWORK`: `devnet` or `mainnet-beta` from env
- `SOLANA_RPC_URL`: Custom RPC or public endpoint
- `SOLANA_CONFIG.SVS11_PROGRAM_ID`: CreditVault program address
- `SOLANA_CONFIG.USDC_MINT`: Network-specific USDC mint addresses
- `SHARE_DECIMALS`: 6 (Token-2022 share tokens)
- Token registry for resolving mint addresses to metadata

### Transaction Flow

The `useSolanaTransaction` hook (`hooks/pools/useSolanaTransaction.ts`) implements:

1. **Build** — POST to backend, receive unsigned transaction + correlationId
2. **Sign** — Dynamic Labs Solana connector signs the transaction
3. **Send** — Send raw transaction to Solana RPC
4. **Confirm** — Subscribe to Supabase Realtime for execution event
5. **Fallback** — 60s timeout, then one-shot query as fallback
6. **Retry** — Auto-rebuilds on blockhash expiry (user took >2min to sign)

Status lifecycle: `idle` -> `building_tx` -> `awaiting_signature` -> `confirming` -> `success` | `error`
