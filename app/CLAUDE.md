# CLAUDE.md - Frontend (app/)

AI assistant guidance for the Credit Markets frontend. This is the single source of truth for code patterns, conventions, and project structure.

---

## Quick Reference

```bash
pnpm dev              # Dev server (Turbopack, port 3000)
pnpm build            # Production build
pnpm lint             # Biome check + auto-fix (./src)
pnpm tsc --noEmit     # Type check (not in scripts, run manually)
pnpm test             # Vitest (watch mode)
pnpm test:run         # Vitest (single run, CI)
pnpm test:coverage    # Vitest with v8 coverage
pnpm test:ui          # Vitest browser UI
```

**Pre-commit checklist:** `pnpm lint && pnpm tsc --noEmit && pnpm test:run`

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, RSC, Turbopack dev) | 15.0.7 |
| UI Library | React | 18.3.x |
| Component Library | NextUI | 2.4.x |
| Styling | Tailwind CSS 3.4 + custom design system |  |
| Data Fetching | TanStack React Query | 5.59.x |
| Forms | TanStack React Form + Zod | 0.34.x |
| HTTP Client | Axios | 1.7.x |
| Auth | Dynamic Labs SDK (Solana connectors) | 4.66.0 |
| Blockchain | Solana Web3.js 1.95 + Anchor 0.32 |  |
| Realtime | Supabase JS Client (Realtime subscriptions) | 2.98.x |
| Charts | ApexCharts + Recharts |  |
| Rich Text | MDX Editor | 3.29.x |
| Icons | Lucide React + Phosphor Icons |  |
| Fonts | Inter (body), IBM Plex Mono (terminal), Open Sauce Sans (legacy) |  |
| Linting | Biome | 1.9.4 |
| Testing | Vitest + React Testing Library + jsdom |  |
| Env Validation | @t3-oss/env-nextjs + Zod |  |

---

## Project Structure

```
app/
├── @types/                     # Global type augmentations (if any)
├── public/
│   ├── assets/                 # Static images (banner.png, etc.)
│   └── favicon/                # Favicons
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (fonts, metadata, Providers)
│   │   ├── providers.tsx       # Client providers (QueryClient, Dynamic, NextUI, Toaster)
│   │   ├── error.tsx           # Global error boundary
│   │   ├── not-found.tsx       # Global 404
│   │   ├── actions/            # Server Actions
│   │   │   └── auth.ts         # clearAuthCookies()
│   │   ├── components/         # Page-level view components
│   │   │   ├── DashboardView.tsx
│   │   │   ├── MarketplaceContent.tsx
│   │   │   └── PortfolioView.tsx
│   │   ├── (dashboard)/        # Route group: main app (uses AppLayout with Header/Footer)
│   │   │   ├── layout.tsx      # Wraps children in AppLayout
│   │   │   ├── page.tsx        # / — Marketplace (pool listings)
│   │   │   ├── account/        # /account — User account settings
│   │   │   ├── portfolio/      # /portfolio — Investor portfolio dashboard
│   │   │   ├── pool/[address]/ # /pool/:address — Pool detail page (SSR)
│   │   │   ├── manager/        # /manager — Manager dashboard
│   │   │   │   ├── pools/[poolId]/ # /manager/pools/:poolId — Manager pool detail
│   │   │   │   ├── profile/        # /manager/profile — Own profile
│   │   │   │   ├── profile/[address]/ # /manager/profile/:address — View profile
│   │   │   │   └── profile/edit/   # /manager/profile/edit — Edit profile
│   │   │   ├── onboarding/kyb/ # /onboarding/kyb — KYB multi-step wizard
│   │   │   └── risk-methodology/ # /risk-methodology (static content)
│   │   ├── admin/              # Admin panel (separate layout, role-gated)
│   │   │   ├── layout.tsx      # Sidebar nav, admin/attester role check
│   │   │   ├── page.tsx        # /admin — Dashboard
│   │   │   ├── users/          # /admin/users — User management
│   │   │   ├── pools/          # /admin/pools — Pool management
│   │   │   ├── managers/       # /admin/managers — Manager management
│   │   │   ├── kyb-queue/      # /admin/kyb-queue — KYB review queue
│   │   │   │   └── [id]/       # /admin/kyb-queue/:id — Individual KYB review
│   │   │   └── events/         # /admin/events — Execution event log
│   │   ├── login/              # /login — Auth entry point
│   │   └── signup/             # /signup — Registration
│   ├── components/             # Shared components
│   │   ├── AppLayout.tsx       # Main app shell (Header + Footer + content)
│   │   ├── ConnectButton.tsx   # Dynamic Labs wallet connect button
│   │   ├── Header.tsx          # Dark gradient top bar
│   │   ├── Footer.tsx          # App footer
│   │   ├── auth/               # Custom auth UI (email, passkey, wallet picker)
│   │   │   └── steps/          # Auth flow step components
│   │   ├── FileUpload/         # File upload components (DocumentItem, ImageUpload)
│   │   ├── forms/              # Reusable form fields (TanStack Form + NextUI)
│   │   ├── icons/              # Custom SVG icons (Google, INA, Solana, Spinner)
│   │   ├── modals/             # BaseModal, DetailSection
│   │   ├── onboarding/         # EntityForm, IndividualForm
│   │   ├── pool/               # Pool detail components
│   │   │   ├── detail/         # TermSheet, NavPriceChart, HedgeInfo, etc.
│   │   │   │   └── risk/       # Risk analysis panels (7 panels + RiskTab)
│   │   │   ├── PoolInfoStrip.tsx
│   │   │   └── PoolTabContent.tsx
│   │   ├── pools/              # Pool list components (MarketplacePoolCard, etc.)
│   │   ├── portfolio/          # Portfolio components (PositionsTable, RiskPanel)
│   │   └── ui/                 # UI primitives
│   │       ├── buttons/        # BackButton, FormSubmitButton, IconActionButton, etc.
│   │       ├── skeletons/      # PageSkeleton, Shimmer, ContentReveal, StaggerReveal
│   │       ├── Breadcrumb.tsx
│   │       ├── EmptyState.tsx
│   │       ├── IconText.tsx
│   │       ├── LoadingOverlay.tsx
│   │       ├── MetricLabel.tsx
│   │       ├── SectionHeading.tsx
│   │       └── SectionTitle.tsx
│   ├── config/
│   │   ├── query.ts            # QueryClient factory (staleTime, toast on error)
│   │   ├── queryDefaults.ts    # QUERY_CONFIGS: realtime/standard/static presets
│   │   └── solana.ts           # SOLANA_CONFIG, USDC mints, token registry
│   ├── constants/
│   │   ├── api.ts              # API_URL from env
│   │   ├── chartColors.ts      # Chart color palette
│   │   ├── colors.ts           # Legacy color constants
│   │   ├── fileTypes.ts        # FILE_TYPES, FILE_SUB_TYPES for upload system
│   │   ├── fileUpload.ts       # Upload constraints
│   │   ├── poolOptions.ts      # Pool form option constants
│   │   ├── sizes.ts            # Size constants
│   │   └── statusColors.ts     # Status-to-color mappings
│   ├── env/
│   │   └── client.mjs          # @t3-oss/env-nextjs validation (ALL env vars)
│   ├── hooks/                  # Custom hooks
│   │   ├── useCurrentUser.ts   # Fetches /users/me, returns ExtendedUserData
│   │   ├── useUserRole.ts      # Fetches /users/me/roles (isAdmin, isManager, etc.)
│   │   ├── useUserCreation.ts  # Auto-creates user record on first login
│   │   ├── useAdminUsers.ts    # Admin user listing
│   │   ├── useFileUpload.ts    # File upload with progress tracking
│   │   ├── useFileUrl.ts       # Signed URL fetching for files
│   │   ├── useMediaQuery.ts    # Responsive breakpoint detection
│   │   ├── useMyInvestmentRequests.ts
│   │   ├── useMyRedemptionRequests.ts
│   │   ├── usePoolTabs.ts      # Pool detail tab state
│   │   ├── usePortfolio.ts     # Portfolio summary query
│   │   ├── usePortfolioTransactions.ts
│   │   ├── useRedemptionRequests.ts
│   │   ├── useReducedMotion.ts # Accessibility: prefers-reduced-motion
│   │   ├── useTVL.ts           # Total Value Locked query
│   │   ├── admin/              # Admin hooks (managers, pools, events, pipeline keys)
│   │   ├── auth/               # Auth flow hooks (email, passkey, wallet connection)
│   │   ├── kyb/                # KYB CRUD hooks (draft, submit, review, UBOs, docs)
│   │   ├── managers/           # Manager profile + pool management hooks
│   │   ├── notaFiscal/         # Trade receivable (nota fiscal) hooks
│   │   ├── pools/              # Pool operations (invest, redeem, approve, NAV, etc.)
│   │   └── risk/               # Risk score + monthly data hooks
│   ├── lib/
│   │   ├── styleClasses.ts     # MAIN STYLE SYSTEM (styles, cx, ICON_SIZES, etc.)
│   │   ├── cookies.ts          # Cookie name constants, deletion options
│   │   ├── logger.ts           # Structured logger (info/warn/error/debug)
│   │   ├── rate-limit.ts       # Client-side rate limiting
│   │   ├── auth/
│   │   │   └── safeLocalStorage.ts # SSR-safe localStorage wrapper
│   │   ├── server/
│   │   │   └── cached-pool.ts  # React cache() for SSR pool deduplication
│   │   ├── utils/
│   │   │   ├── pool-helpers.ts # Pool display helpers
│   │   │   ├── risk.ts         # Risk score formatting
│   │   │   ├── solana-transactions.ts # Solana error parsing
│   │   │   └── tvl.ts          # TVL computation
│   │   └── validations/
│   │       ├── kybSchema.ts    # Multi-step KYB Zod schemas (7 steps)
│   │       └── managerProfileSchema.ts # Manager profile Zod schema
│   ├── middleware.ts           # Auth middleware (JWT verification, role-based routing)
│   ├── services/               # API client layer (Axios)
│   │   ├── api.ts              # Axios instance + canonical types (Pool, User, Manager, etc.)
│   │   ├── poolService.ts      # Pool CRUD + NAV history
│   │   ├── userService.ts      # User roles endpoint
│   │   ├── managerService.ts   # Manager CRUD + image upload
│   │   ├── kybService.ts       # KYB CRUD (investor + attester methods)
│   │   ├── fileService.ts      # File upload + signed URL retrieval
│   │   ├── riskService.ts      # Risk score + monthly + definitions
│   │   ├── adminProfileService.ts # Admin manager profile management
│   │   └── notaFiscalService.ts # Trade receivable items + aggregates
│   ├── styles/
│   │   └── globals.css         # CSS reset, design tokens, shimmer effects, patterns
│   ├── types/
│   │   ├── api.ts              # TokenResponse
│   │   ├── auth.ts             # AuthConfig, AuthState, AuthStep, DBUserData
│   │   ├── kyb.ts              # KybSubmission, KybDocument, KybUbo, etc.
│   │   ├── manager.ts          # ManagerProfileResponse, ManagerProfileFormValues
│   │   ├── notaFiscal.ts       # NotaFiscalItem, NotaFiscalAggregates
│   │   ├── pagination.ts       # PaginationInfo, PaginatedResponse<T>
│   │   ├── pools.ts            # PoolsResponse
│   │   ├── portfolio.ts        # PortfolioSummary, PortfolioPosition, legacy types
│   │   ├── risk.ts             # FidcRiskScore, TidcRiskScore, monthly data types
│   │   └── users.ts            # Re-exports User from services/api
│   └── utils/
│       ├── constants.ts        # APP_NETWORK, EXPLORER_URL
│       ├── dateFormatters.ts   # Date formatting utilities
│       ├── errorHandling.ts    # getErrorMessage(), getFileUploadErrorMessage(), OTP errors
│       ├── exportCsv.ts        # CSV export utility
│       ├── fileValidation.ts   # Client-side file validation
│       ├── formatAddress.ts    # Solana address truncation (6...4)
│       ├── formatDate.ts       # Date formatting
│       ├── formatPrice.ts      # USD currency formatting (Intl.NumberFormat)
│       ├── pages.ts            # PAGES route constants object
│       ├── projectInfo.ts      # PROJECT_INFO (name, URLs, logos)
│       └── queryUtils.ts       # Query key utilities
├── biome.json                  # Biome config (recommended rules, double quotes)
├── next.config.mjs             # Security headers, bundle analyzer, package optimization
├── tailwind.config.ts          # Full design system (colors, fonts, NextUI, custom utils)
├── vitest.config.ts            # Vitest + jsdom + @/ alias
├── vitest.setup.ts             # Global mocks (toast, next/headers, next/navigation)
└── postcss.config.mjs
```

---

## Environment Variables

All validated at build time via `src/env/client.mjs` using `@t3-oss/env-nextjs`.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_BASE_API_URL` | Yes | Backend API URL (default: `http://localhost:3030`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend URL (must be valid URL, e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_DYNAMIC_ENV_ID` | Yes | Dynamic Labs environment ID (must match backend's `DYNAMIC_ENVIRONMENT_ID`) |
| `NEXT_PUBLIC_DYNAMIC_API_BASE_URL` | No | Custom hostname for Dynamic Labs cookie auth (production only) |
| `NEXT_PUBLIC_DYNAMIC_API_URL` | No | Dynamic Labs API URL override |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (for Realtime subscriptions) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Yes | `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | No | Custom RPC URL (defaults to Solana public RPC) |
| `NEXT_PUBLIC_ATTESTER` | No | Platform attester Solana address (auto-fills admin forms) |
| `ANALYZE` | No | Set to `true` to enable bundle analyzer |

---

## Core Patterns

### Imports

Always use the `@/` path alias. Never use relative paths:

```typescript
import { styles, cx } from "@/lib/styleClasses";   // Correct
import { styles } from "../../../lib/styleClasses";  // Wrong
```

A `@shared/*` alias also exists mapping to `../shared/*` (monorepo shared code).

### Data Fetching Layer

Three-tier pattern: **Service -> Hook -> Component**.

```
services/poolService.ts     # Raw Axios calls, returns typed data
    |
hooks/pools/usePoolsQuery.ts  # React Query wrapper, cache config
    |
Component                      # Uses hook, renders data
```

**Services** (`src/services/`): Plain async functions that call `api.get/post/patch/delete`. The `api` instance (in `services/api.ts`) is a pre-configured Axios client with:
- `baseURL` from `NEXT_PUBLIC_BASE_API_URL`
- `withCredentials: true` (cookie auth)
- Request interceptor that injects `Authorization: Bearer <jwt>` from Dynamic Labs cookie as fallback

**Hooks** (`src/hooks/`): Wrap services in `useQuery`/`useMutation`. Use standardized configs:

```typescript
import { QUERY_CONFIGS } from "@/config/queryDefaults";

export function usePoolsQuery() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: () => getPools(),
    ...QUERY_CONFIGS.standard,  // staleTime: 60s, gcTime: 5min
  });
}
```

Three query config tiers:
- `QUERY_CONFIGS.realtime` — 30s stale (portfolio values, market data)
- `QUERY_CONFIGS.standard` — 60s stale (most queries)
- `QUERY_CONFIGS.static` — 5min stale (config, ABIs, reference data)

**Cache invalidation**: Always invalidate after mutations:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["pools"] });
}
```

### Canonical Types

The main Pool, User, and Manager types are defined in `services/api.ts` (not in `types/`). The `types/` directory re-exports or extends these. Always import canonical types from `@/services/api`:

```typescript
import type { Pool, User, Manager } from "@/services/api";
```

### Forms

**Library**: TanStack React Form (`@tanstack/react-form`) with Zod adapter (`@tanstack/zod-form-adapter`).

**NOT** React Hook Form (the existing CLAUDE.md was incorrect). Validation schemas live in `lib/validations/`.

Reusable `<FormField>` component in `components/forms/` wraps TanStack Form + NextUI inputs. See `components/forms/README.md` for usage.

### Server Components vs Client Components

- Default to Server Components
- Add `'use client'` only when you need hooks, event handlers, or browser APIs
- Pool detail page uses Server Components with `React.cache()` for SSR data deduplication (`lib/server/cached-pool.ts`)

---

## Authentication Flow

```
Dynamic Labs SDK (providers.tsx)
  |
  v
User connects wallet / logs in via email
  |
  v
Dynamic Labs sets DYNAMIC_JWT_TOKEN cookie
  |
  v
middleware.ts verifies JWT (RS256 via JWKS, checks scope "user:basic")
  |
  v
Authenticated requests: Axios interceptor attaches Bearer token
  |
  v
Backend verifies same JWT independently (no shared secrets)
```

**Middleware** (`src/middleware.ts`):
- Verifies JWT signature + expiry against Dynamic Labs JWKS
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from `/login`, `/signup`
- Admin pages (`/admin/*`): verifies admin/attester role via backend API call (cached 60s, LRU max 200)
- Attester role: can only access `/admin/kyb-queue`
- Matcher excludes `api`, `_next`, `assets`, `favicon`

**Server Actions**: `clearAuthCookies()` in `app/actions/auth.ts` handles logout cookie cleanup.

**Key hooks**:
- `useCurrentUser()` — fetches `/users/me`, caches 5min
- `useUserRole()` — fetches `/users/me/roles` (isAdmin, isManager, isAttester)
- `useUserCreation()` — auto-creates user record on first login
- `useAuthState()`, `useEmailAuthFlow()`, `usePasskeyFlow()`, `useWalletConnection()` — custom auth UI flow hooks

---

## Style System

### Primary: `src/lib/styleClasses.ts`

This is the main styling API. Provides composable Tailwind class strings:

```typescript
import { styles, cx } from "@/lib/styleClasses";

// Layout
<div className={styles.pageContainer}>
  <div className={styles.contentWrapper}>...</div>
</div>

// Typography
<h2 className={styles.headingLg}>Title</h2>
<p className={styles.bodyMd}>Description</p>
<span className={styles.labelPrimary}>LABEL</span>

// Values (financial numbers - uses tabular-nums, NOT font-mono)
<span className={styles.valueLg}>$1,234,567.89</span>

// Cards
<div className={cx(styles.card, styles.cardPadding)}>...</div>

// Buttons
<button className={cx(styles.btnBase, styles.btnPrimary, styles.btnMd)}>Submit</button>

// Status chips (terminal-style border-only)
<span className={cx(styles.chipBase, styles.chipOpen)}>OPEN</span>

// Dark surface text (portfolio header, terminal strips)
<span className={styles.onDark.primary}>White text</span>
<span className={styles.onDark.accent}>Blue accent</span>

// Skeleton loading states
<div className={cx(styles.sk.base, styles.sk.textSm, "w-32")} />

// Conditional combining
<div className={cx(styles.card, isActive && styles.cardInteractive)}>
```

**Style categories in `styles` object:**
- Layout: `pageContainer`, `contentWrapper`, `sectionGap`, `contentArea`
- Typography: `displayLg/Md`, `headingLg/Md/Sm`, `bodyLg/Md/Sm`, `labelPrimary/Sans/Secondary`, `caption`
- Values: `valueLg/Md/Sm/Xs`, `valuePositive/Negative/Accent` (financial metrics)
- Cards: `card`, `cardInteractive`, `cardPadding`, `cardPaddingLg`
- Buttons: `btnBase` + `btnPrimary/Secondary/Ghost/Danger` + `btnSm/Md/Lg`
- Chips: `chipBase` + `chipOpen/Funded/Ongoing/Pending/Closed/Rejected/Settled`
- Terminal: `terminalStrip*`, `terminalStripDark*` (Bloomberg-style data displays)
- Header: `header`, `headerContent`, `headerBtn`
- Navigation: `navTab`, `navTabActive`, `navTabInactive`
- Grids: `gridPools`, `gridOnboarding`, `gridMetrics`
- Forms: `input`, `select`
- Tables: `tableHeader`, `tableCell`, `tableCellValue`
- Skeletons: `sk.base/dark`, `sk.textXs/Sm/Md/Lg`, `sk.heading`, `sk.icon`, `sk.avatar`, `sk.chip`, `sk.card`
- Reveal: `reveal.fadeIn`, `reveal.fadeUp`
- Dark surface: `onDark.primary/secondary/muted/subtle/accent/danger`

**Also exported:** `ICON_SIZES`, `TRANSITIONS`, `TYPOGRAPHY_STYLES`, `BUTTON_STYLES`

**Deprecated aliases** (still in codebase, prefer new names): `label` -> `labelPrimary`, `monoLg` -> `valueLg`, `monoMd` -> `valueMd`, `monoSm` -> `valueSm`

### Tailwind Config (`tailwind.config.ts`)

- Custom color palette: `text-primary`, `surface-card`, `terminal-green/amber/red/gray`, `strategic-blue`, etc.
- Custom fonts: Inter (sans), IBM Plex Mono (mono)
- NextUI plugin with custom theme (primary color is black `#1A1A1A`, not blue)
- Typography plugin for rich text
- Custom utility classes: `.toolbar-row`, `.inline-group`, `.stack`, `.card-container`, `.icon-sm/md/lg`
- Custom animations: `terminal-shimmer`, `fade-in`, `fade-up`

### CSS (`src/styles/globals.css`)

- CSS custom properties (color, shadow, typography, radius tokens)
- Shimmer gradients for skeleton loading
- Bloomberg-inspired background patterns: `terminal-herringbone`, `terminal-dots`, `terminal-losange`, `geometric-pattern`, etc.
- `.prose` and `.terminal-prose` for rich text rendering
- Mobile-first resets (tap highlight, iOS zoom prevention)

---

## Solana / Web3 Integration

### Config (`src/config/solana.ts`)

- `SOLANA_NETWORK`: `devnet` | `mainnet-beta` (from env)
- `SOLANA_RPC_URL`: custom RPC or default public endpoint
- `SOLANA_CONFIG.SVS11_PROGRAM_ID`: CreditVault program address
- `SOLANA_CONFIG.USDC_MINT`: network-specific USDC mint addresses
- `SHARE_DECIMALS`: 6 (Token-2022 share tokens)

### Transaction Flow (`hooks/pools/useSolanaTransaction.ts`)

1. **Build**: POST to backend, get unsigned transaction + correlationId
2. **Sign**: Dynamic Labs Solana connector signs the transaction
3. **Send**: Send raw transaction to Solana RPC
4. **Confirm**: Subscribe to Supabase Realtime for execution event (via `execution_events` table)
5. **Fallback**: 60s timeout, then one-shot query as fallback
6. **Retry**: Auto-rebuilds on blockhash expiry (user took >2min to sign)

Status states: `idle` -> `building_tx` -> `awaiting_signature` -> `confirming` -> `success`/`error`

### Pool Operation Hooks

- `useInvest` — Invest USDC into pool
- `useRedeem` — Request share redemption
- `useApproveInvestment`, `useRejectInvestment` — Manager approves/rejects
- `useApproveRedemption` — Manager approves redemption
- `useOpenWindow`, `useCloseWindow` — Investment window management
- `useDrawDown`, `useRepay` — Manager draw down / repay operations

---

## Routing

### Dashboard Routes (AppLayout with Header/Footer)

| Route | Page | Access |
|-------|------|--------|
| `/` | Marketplace — pool listings | Authenticated |
| `/portfolio` | Investor portfolio dashboard | Authenticated |
| `/account` | User account settings | Authenticated |
| `/pool/:address` | Pool detail (SSR, error/loading/not-found) | Authenticated |
| `/manager` | Manager dashboard | Authenticated |
| `/manager/pools/:poolId` | Manager pool management | Manager |
| `/manager/profile` | Own manager profile | Manager |
| `/manager/profile/:address` | View manager profile | Authenticated |
| `/manager/profile/edit` | Edit manager profile | Manager |
| `/onboarding/kyb` | KYB wizard (multi-step) | Authenticated |

### Admin Routes (Sidebar layout, role-gated in middleware)

| Route | Page | Access |
|-------|------|--------|
| `/admin` | Admin dashboard | Admin |
| `/admin/users` | User management | Admin |
| `/admin/pools` | Pool management | Admin |
| `/admin/managers` | Manager management | Admin |
| `/admin/kyb-queue` | KYB review queue | Admin or Attester |
| `/admin/kyb-queue/:id` | Individual KYB review | Admin or Attester |
| `/admin/events` | Execution event log | Admin |

### Auth Routes (No layout)

| Route | Page |
|-------|------|
| `/login` | Login page |
| `/signup` | Signup page |

Route constants defined in `src/utils/pages.ts` as the `PAGES` object.

---

## Reusable Components

| Component | Import | Use Case |
|-----------|--------|----------|
| `LoadingOverlay` | `@/components/ui/LoadingOverlay` | Full-screen loading state |
| `EmptyState` | `@/components/ui/EmptyState` | No-data displays |
| `SectionTitle` | `@/components/ui/SectionTitle` | Semantic section headings |
| `SectionHeading` | `@/components/ui/SectionHeading` | Page section headings |
| `IconText` | `@/components/ui/IconText` | Icon + label pairs |
| `MetricLabel` | `@/components/ui/MetricLabel` | Labeled metric values |
| `Breadcrumb` | `@/components/ui/Breadcrumb` | Breadcrumb navigation |
| `BackButton` | `@/components/ui/buttons/BackButton` | Navigation back button |
| `FormSubmitButton` | `@/components/ui/buttons/FormSubmitButton` | Form submit with loading |
| `IconActionButton` | `@/components/ui/buttons/IconActionButton` | Icon-only action button |
| `PageSkeleton` | `@/components/ui/skeletons/PageSkeleton` | Full page skeleton loader |
| `ContentReveal` | `@/components/ui/skeletons/ContentReveal` | Animated content reveal |
| `StaggerReveal` | `@/components/ui/skeletons/StaggerReveal` | Staggered animation |
| `BaseModal` | `@/components/modals/BaseModal` | Base modal wrapper |
| `FormField` | `@/components/forms` | TanStack Form field wrapper |
| `FileUpload` | `@/components/FileUpload` | File upload with preview |

Always check existing components before creating new ones.

---

## Testing

### Setup

- **Framework**: Vitest + jsdom + React Testing Library
- **Config**: `vitest.config.ts` (jsdom env, `@/` alias)
- **Setup file**: `vitest.setup.ts` (mocks for toast, next/headers, next/navigation, URL APIs)
- **Test fixtures**: `src/__tests__/fixtures/` (blockchain.fixtures.ts, file.fixtures.ts)
- **Test mocks**: `src/__tests__/mocks/` (axios.mock.ts, dynamic.mock.ts)
- **Test wrapper**: `src/__tests__/utils/test-wrapper.tsx` (QueryClient + providers)

### Conventions

- Test files collocated with source: `useCurrentUser.test.tsx` next to `useCurrentUser.ts`
- Or in `__tests__/` subdirectories within feature folders
- Test names describe behavior, not implementation

### Running

```bash
pnpm test              # Watch mode
pnpm test:run          # Single run (CI)
pnpm test:coverage     # With v8 coverage
pnpm test:ui           # Browser-based test UI
```

---

## Architecture Rules (Do Not Break)

1. **Types MUST match backend** — see Type Sync Table below
2. **No direct fetch()** — always use React Query hooks via the service layer
3. **No global state stores** — server state via React Query, local state via useState
4. **Wallet addresses are case-sensitive** — Solana base58 addresses must NOT be lowercased
5. **Client components must be explicit** — add `'use client'` only when hooks/events are needed
6. **Import via @/ alias** — never use relative imports
7. **All env vars validated at build** — add new ones to `src/env/client.mjs`
8. **Canonical types in services/api.ts** — types/ re-exports or extends

---

## Type Sync with Backend

| Backend Schema | Frontend Type |
|----------------|---------------|
| `backend/src/pools/dto/*` | `app/src/services/api.ts` (Pool interface) |
| `backend/src/users/dto/*` | `app/src/services/api.ts` (User interface) |
| `backend/src/managers/dto/*` | `app/src/services/api.ts` (Manager interface) |
| `backend/src/kyb/dto/*` | `app/src/types/kyb.ts` |
| `backend/src/risk/dto/*` | `app/src/types/risk.ts` |
| `backend/src/portfolio/dto/*` | `app/src/types/portfolio.ts` |

When backend schemas change, update:
1. Type definitions in `services/api.ts` or `types/`
2. Zod validation schemas in `lib/validations/`
3. Service function signatures in `services/`

---

## Gotchas

### Next.js 15 Async Params

```typescript
// Correct (Next.js 15) — params is a Promise:
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// Wrong (Next.js 14 style):
export default function Page({ params }: { params: { id: string } }) {}
```

### Dynamic Labs SDK Hidden

The Dynamic Labs default modal UI is hidden via CSS (`globals.css` + `providers.tsx` cssOverrides). The app uses a fully custom auth UI built with Dynamic Labs hooks. Do not re-enable the default widget.

### NextUI Primary Color

NextUI's primary color is overridden to black (`#1A1A1A`), not the default blue. This affects all NextUI components using `color="primary"`.

### Financial Values: No font-mono

Financial values use `tabular-nums` via the `valueLg/Md/Sm` styles, NOT `font-mono`. The deprecated `monoLg/monoMd/monoSm` aliases should not be used in new code.

### Security Headers

`next.config.mjs` sets security headers on all routes: HSTS, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, X-XSS-Protection, Permissions-Policy (camera/mic/geo disabled), Referrer-Policy.

### Package Optimization

`next.config.mjs` uses `experimental.optimizePackageImports` for Dynamic Labs, NextUI, and Lucide to reduce bundle size.

### Server-side Pool Caching

`lib/server/cached-pool.ts` uses React `cache()` to deduplicate pool fetches within a single render cycle (metadata + page component share the same data).

---

## Accessibility

- `useReducedMotion()` hook for animation preferences
- Touch targets: minimum 44x44px
- `aria-label` required for icon-only buttons
- Semantic HTML (`<main>`, `<section>`, `<nav>`)
- `globals.css` respects `prefers-reduced-motion: reduce`

---

## Resources

- **Backend**: `../backend/`
- **Backend API (Swagger)**: http://localhost:3030/api
- **Style System**: `src/lib/styleClasses.ts`
- **Route Constants**: `src/utils/pages.ts`
- **Dynamic Labs Docs**: https://docs.dynamic.xyz
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **TanStack Query**: https://tanstack.com/query
- **TanStack Form**: https://tanstack.com/form
- **NextUI**: https://nextui.org
- **Biome**: https://biomejs.dev
