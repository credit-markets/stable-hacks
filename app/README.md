# Credit Markets -- Frontend

Institutional-grade credit investment platform on Solana. Investors access asset-backed credit pools, facilitators originate and manage them, and admins govern the marketplace.

Built with Next.js 15, React 18, Tailwind CSS, TanStack Query, and Dynamic Labs for Solana wallet authentication.

## Architecture

```
                    +──────────────────+
                    │   Next.js 15     │
                    │   App Router     │
                    +────────┬─────────+
                             │
         +───────────────────┼───────────────────+
         │                   │                   │
+────────▼────────+ +────────▼────────+ +────────▼────────+
│ Dynamic Labs    │ │ Backend API     │ │ Solana Chain    │
│ Authentication  │ │ (NestJS :3030)  │ │ (Devnet/Main)   │
+─────────────────+ +────────┬────────+ +─────────────────+
                             │
                    +────────▼─────────+
                    │ Supabase         │
                    │ (PostgreSQL +    │
                    │  Realtime)       │
                    +──────────────────+
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 15.0.7 |
| UI | React, Tailwind CSS, NextUI | 18.3, 3.4, 2.4 |
| Data Fetching | TanStack React Query | 5.59 |
| Forms | TanStack React Form + Zod | 0.34 |
| Auth | Dynamic Labs SDK (Solana) | 4.66 |
| Blockchain | Solana Web3.js, Anchor | 1.95, 0.32 |
| Realtime | Supabase JS Client | 2.98 |
| Charts | ApexCharts, Recharts | |
| Linting | Biome | 1.9.4 |
| Testing | Vitest, React Testing Library | 4.0 |
| Package Manager | pnpm | 10.8 |

## Prerequisites

- **Node.js** 18+
- **pnpm** 10+ (`corepack enable` to auto-install)
- **Backend** running on port 3030 (see `../backend/`)
- **Supabase** project (for realtime transaction confirmations)
- **Dynamic Labs** account with Solana connectors enabled

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
# API
NEXT_PUBLIC_BASE_API_URL="http://localhost:3030"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Auth (Dynamic Labs) — must match backend's DYNAMIC_ENVIRONMENT_ID
NEXT_PUBLIC_DYNAMIC_ENV_ID="your-dynamic-env-id"

# Supabase (for realtime subscriptions)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Solana
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
```

```bash
# 3. Start dev server (requires backend running on :3030)
pnpm dev
# Open http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_BASE_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend URL (used for metadata, Open Graph) |
| `NEXT_PUBLIC_DYNAMIC_ENV_ID` | Yes | Dynamic Labs environment ID |
| `NEXT_PUBLIC_DYNAMIC_API_BASE_URL` | No | Custom hostname for cookie-based auth (production) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Yes | `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | No | Custom Solana RPC endpoint |
| `NEXT_PUBLIC_ATTESTER` | No | Platform attester address (admin forms) |
| `ANALYZE` | No | `true` to enable webpack bundle analyzer |

All variables are validated at build time via `@t3-oss/env-nextjs`. Missing required variables will fail the build.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Turbopack (port 3000) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run Biome linter + formatter with auto-fix |
| `pnpm test` | Run Vitest in watch mode |
| `pnpm test:run` | Run Vitest once (CI) |
| `pnpm test:coverage` | Run Vitest with v8 coverage report |
| `pnpm test:ui` | Open Vitest browser UI |

Type checking (not a script, run manually):

```bash
pnpm tsc --noEmit
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (dashboard)/      # Main app routes (marketplace, portfolio, pool detail)
│   ├── admin/            # Admin panel (role-gated)
│   ├── login/            # Auth pages
│   ├── signup/
│   ├── actions/          # Server Actions
│   └── components/       # Page-level view components
├── components/           # Shared React components
│   ├── ui/               # Primitives (buttons, skeletons, loading states)
│   ├── forms/            # TanStack Form field wrappers
│   ├── modals/           # Modal components
│   ├── pool/             # Pool detail components (term sheet, risk panels, charts)
│   ├── pools/            # Pool card and listing components
│   ├── portfolio/        # Portfolio dashboard components
│   ├── auth/             # Custom auth flow components
│   └── FileUpload/       # File upload with preview and progress
├── hooks/                # React Query hooks (organized by domain)
│   ├── auth/             # Auth flow hooks
│   ├── pools/            # Pool CRUD + Solana transaction hooks
│   ├── managers/         # Manager profile hooks
│   ├── kyb/              # KYB submission hooks
│   ├── risk/             # Risk score hooks
│   └── admin/            # Admin management hooks
├── services/             # API client layer (Axios)
├── types/                # TypeScript interfaces
├── lib/                  # Utilities, style system, validations
│   ├── styleClasses.ts   # Main design system (styles, cx)
│   ├── validations/      # Zod schemas
│   └── server/           # Server-only utilities
├── config/               # React Query, Solana configuration
├── constants/            # Static constants
├── styles/               # Global CSS, design tokens
├── env/                  # Environment variable validation
└── utils/                # Formatting, error handling, route constants
```

## Key Architectural Decisions

### Data Fetching: Service -> Hook -> Component

API calls go through three layers: Axios services (`services/`), React Query hooks (`hooks/`), and components. This separates network concerns from caching and UI.

### Authentication

Dynamic Labs handles wallet connection and email auth. The SDK sets an httpOnly JWT cookie, verified by both the Next.js middleware (for route protection) and the NestJS backend (for API authorization). No shared secrets -- both sides verify via JWKS.

### Custom Auth UI

The Dynamic Labs default modal is hidden via CSS. The app provides a fully custom auth experience through components in `components/auth/`.

### Solana Transactions

On-chain operations follow: backend builds unsigned transaction -> frontend signs via wallet -> frontend sends to Solana -> Supabase Realtime confirms settlement. See `hooks/pools/useSolanaTransaction.ts`.

### Style System

A centralized style system in `lib/styleClasses.ts` provides composable Tailwind class strings for consistent design. The design follows an "Institutional Monochrome Light" direction inspired by Bloomberg Terminal aesthetics.

### Type Safety

All environment variables are validated at build time via `@t3-oss/env-nextjs`. Canonical data types (Pool, User, Manager) are defined once in `services/api.ts` and re-exported by `types/`.

## Testing

Tests use Vitest with jsdom and React Testing Library. The setup file (`vitest.setup.ts`) mocks common dependencies (toast, Next.js navigation, cookies).

```bash
# Run all tests
pnpm test:run

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test:run src/hooks/useCurrentUser.test.tsx
```

Test fixtures are in `src/__tests__/fixtures/` and shared mocks in `src/__tests__/mocks/`.

## Development Workflow

```bash
# 1. Start backend (in sibling directory)
cd ../backend && pnpm dev

# 2. Start frontend
pnpm dev

# 3. Before committing
pnpm lint && pnpm tsc --noEmit && pnpm test:run
```

- **Swagger UI**: http://localhost:3030/api -- always check API docs before implementing
- **React Query Devtools**: visible in development (bottom-left corner)

## Deployment

The app builds as a standard Next.js application:

```bash
pnpm build   # Creates .next/ production bundle
pnpm start   # Starts production server
```

Security headers (HSTS, X-Frame-Options, CSP-adjacent) are configured in `next.config.mjs`. Bundle analysis available via `ANALYZE=true pnpm build`.

## Related Services

| Service | Location | URL |
|---------|----------|-----|
| Backend API | `../backend/` | http://localhost:3030 |
| Swagger UI | -- | http://localhost:3030/api |
| Backend Health | -- | http://localhost:3030/health |

## Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines including code conventions, component patterns, style system usage, and architecture rules.
