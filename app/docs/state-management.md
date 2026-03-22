# State Management

This document describes the data fetching, caching, and state management patterns used in the Credit Markets frontend.

---

## Overview

The application uses a deliberate state management philosophy:

- **Server state** — Managed exclusively by TanStack React Query (no Redux, Zustand, or other global stores)
- **Local UI state** — `useState` and `useReducer` within components
- **Auth state** — Dynamic Labs SDK context
- **URL state** — Next.js `useSearchParams()` and route parameters

There are no global state stores. Server state lives in the React Query cache; everything else is local.

---

## React Query Setup

### QueryClient Configuration (`src/config/query.ts`)

```typescript
export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (_, query) => {
        if (query.meta?.success) {
          toast.success(query.meta.success.message);
        }
      },
      onError: (_, query) => {
        if (query.meta?.error) {
          toast.error(query.meta.error.message);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute default
      },
      mutations: {
        onError(error) {
          logger.error("Mutation failed", error);
          toast.error(err.details ?? err.shortMessage ?? err.message);
        },
      },
    },
  });
}
```

Key behaviors:
- **Default stale time**: 60 seconds
- **Query-level toast**: Queries can declare `meta.success` and `meta.error` for automatic toast notifications
- **Mutation error handling**: All mutations show toast errors by default via `defaultOptions.mutations.onError`
- **SSR safety**: `getQueryClient()` creates a new client for each server render, reuses the singleton on the browser

### Query Meta Type Extension

The QueryClient declares custom meta types for toast messages:

```typescript
declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      success?: { message: string; dismissId?: string };
      error?: { message: string; dismissId?: string };
    };
  }
}
```

### DevTools

React Query DevTools are included in development mode only:

```tsx
{process.env.NODE_ENV !== "production" && <ReactQueryDevtools initialIsOpen={false} />}
```

---

## Query Configuration Presets (`src/config/queryDefaults.ts`)

Three standard presets for different data freshness requirements:

| Preset | `staleTime` | `gcTime` | Use Case |
|--------|-------------|----------|----------|
| `QUERY_CONFIGS.realtime` | 30s | 1 min | Portfolio values, market data, TVL |
| `QUERY_CONFIGS.standard` | 60s | 5 min | Pool listings, user data, general queries |
| `QUERY_CONFIGS.static` | 5 min | 10 min | Contract ABIs, reference data, config |

All presets disable `refetchOnWindowFocus`.

Usage:

```typescript
import { QUERY_CONFIGS } from "@/config/queryDefaults";

export function usePoolsQuery() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: () => getPools(),
    ...QUERY_CONFIGS.standard,
  });
}
```

---

## Data Fetching Pattern: Service -> Hook -> Component

### Service Layer (`src/services/`)

Plain async functions that call the backend API:

```typescript
// src/services/poolService.ts
export const getPool = async (poolIdOrAddress: string): Promise<Pool> => {
  const response = await api.get<Pool>(endpoint);
  return response.data;
};
```

Services:
- `api.ts` — Axios instance with base URL, credentials, and auth interceptor
- `poolService.ts` — Pool CRUD, NAV history
- `userService.ts` — User roles
- `managerService.ts` — Manager profiles
- `kybService.ts` — KYB submissions
- `fileService.ts` — File upload, signed URLs
- `riskService.ts` — Risk scores, monthly data
- `adminProfileService.ts` — Admin manager profiles
- `notaFiscalService.ts` — Trade receivable data

### Hook Layer (`src/hooks/`)

React Query wrappers that:
1. Define query keys
2. Pass service functions as `queryFn`
3. Spread the appropriate `QUERY_CONFIGS` preset
4. Add `enabled` conditions for dependent queries

```typescript
// src/hooks/useCurrentUser.ts
export function useCurrentUser() {
  const { user, primaryWallet } = useDynamicContext();

  return useQuery<ExtendedUserData>({
    queryKey: ["currentUser", user?.userId, primaryWallet?.address],
    queryFn: async () => {
      const { data } = await api.get<DBUserData>("/users/me");
      return { ...data, walletAddress: primaryWallet?.address };
    },
    enabled: !!user && (!!user?.userId || !!primaryWallet?.address),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
}
```

### Component Layer

Components consume hooks and handle the three states: loading, error, and data.

```tsx
function PoolList() {
  const { data, isLoading, error } = usePoolsQuery();

  if (isLoading) return <PageSkeleton />;
  if (error) return <EmptyState title="Failed to load pools" />;
  if (!data?.data?.length) return <EmptyState title="No pools found" />;

  return (
    <div className={styles.gridPools}>
      {data.data.map((pool) => (
        <MarketplacePoolCard key={pool.id} pool={pool} />
      ))}
    </div>
  );
}
```

---

## Query Key Conventions

Query keys follow a consistent pattern:

| Pattern | Example | Description |
|---------|---------|-------------|
| `["entity"]` | `["pools"]` | List query |
| `["entity", id]` | `["pool", "abc123"]` | Single item |
| `["entity", params]` | `["pools", "sortBy=title"]` | Filtered list |
| `["entity", id, "sub"]` | `["pool", "abc123", "nav-history"]` | Sub-resource |
| `["userRoles"]` | `["userRoles"]` | Current user roles |
| `["currentUser", userId, walletAddress]` | | Current user with identity keys |

Domain-specific prefixes:
- `pools`, `pool` — Pool data
- `portfolio-*` — Portfolio queries
- `tvl` — Total Value Locked
- `kyb-*` — KYB queries
- `admin-*` — Admin queries
- `manager-*` — Manager queries
- `risk-*` — Risk score queries

---

## Cache Invalidation

### After Mutations

Always invalidate related queries after successful mutations:

```typescript
const queryClient = useQueryClient();

useMutation({
  mutationFn: () => investInPool(poolId, amount),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["pools"] });
    queryClient.invalidateQueries({ queryKey: ["pool", poolId] });
  },
});
```

### After Solana Transactions

The `useSolanaTransaction` hook invalidates broadly after chain confirmation:

```typescript
// Invalidate specified keys
for (const key of options.invalidateKeys) {
  queryClient.invalidateQueries({ queryKey: key });
}

// Invalidate all portfolio queries
queryClient.invalidateQueries({
  predicate: (query) => {
    const k = query.queryKey;
    return Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("portfolio-");
  },
});

// Invalidate TVL
queryClient.invalidateQueries({ queryKey: ["tvl"] });
```

### Invalidation Strategy

- **Exact key invalidation** — For known affected queries
- **Prefix invalidation** — For domain-wide cache busting (e.g., all `portfolio-*`)
- **Predicate invalidation** — For complex matching patterns

---

## Loading and Error State Handling

### Page-Level Loading

Pages use `<Suspense>` with `<LoadingOverlay>` for initial load:

```tsx
<Suspense fallback={<LoadingOverlay height="lg" />}>
  <DashboardView />
</Suspense>
```

### Query Loading

Components show skeleton loaders during data fetching:

```tsx
const { data, isLoading } = usePoolsQuery();

if (isLoading) {
  return <PageSkeleton variant="marketplace" />;
}
```

### Error States

- **Query errors**: Rendered as `<EmptyState>` with error message
- **Mutation errors**: Shown as toast notifications via QueryClient default
- **Global errors**: Caught by `error.tsx` error boundary

---

## Real-Time Updates (Supabase Realtime)

The app uses Supabase Realtime for Solana transaction confirmations, not for general data syncing.

In `useSolanaTransaction.ts`:

```typescript
const channel = sb
  .channel(`tx-${signature}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "execution_events",
      filter: `correlation_id=eq.${correlationId}`,
    },
    (payload) => {
      if (payload.new.event_type === options.successEvent) {
        setStatus("success");
        toast.success(options.successMessage);
        // Invalidate queries
      }
    },
  )
  .subscribe();
```

The Supabase client is created on-demand with the user's auth token for authenticated Realtime subscriptions.

Fallback: If no Realtime confirmation arrives within 60 seconds, a one-shot query checks the `execution_events` table.

---

## Local State Patterns

### `useState`

Used for simple UI state:

```typescript
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [sortBy, setSortBy] = useState<SortByOption>("created_at");
```

### `useCallback`

Used in hooks that expose setters to prevent unnecessary re-renders:

```typescript
const setStep = useCallback((newStep: AuthStep) => {
  setStepState(newStep);
}, []);
```

### Auth Flow State (`useAuthState`)

Multi-step auth flow managed with `useState` + `useCallback`:
- `step`: Current auth step (`start`, `otp`, `loading`, `passkey`, `recovery`)
- `inaWalletState`: Wallet creation lifecycle (`null`, `creating`, `created`)
- `recoveryCodes`: Recovery codes array

### No Context Providers for Data

The application does not use React Context for data sharing. All server data flows through React Query. Context is only used for:
- Dynamic Labs SDK (`DynamicContextProvider`)
- React Query (`QueryClientProvider`)
- NextUI theme (`NextUIProvider`)

---

## URL State

### Route Parameters

Next.js 15 uses async params:

```typescript
export default async function Page({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const pool = await getCachedPool(address);
}
```

### Search Parameters

Used for filtering and sorting:

```typescript
import { useSearchParams } from "next/navigation";

const searchParams = useSearchParams();
const filter = searchParams.get("filter");
```

---

## SSR Data Deduplication

For Server Components that share data (e.g., `generateMetadata` and the page component both need pool data), `React.cache()` is used:

```typescript
// src/lib/server/cached-pool.ts
export const getCachedPool = cache(async (poolIdOrAddress: string): Promise<Pool> => {
  return await getPool(poolIdOrAddress);
});
```

This ensures the pool is fetched once per render cycle, even if called multiple times.

---

## Hooks by Domain

### Core Hooks

| Hook | Query Key | Config | Description |
|------|-----------|--------|-------------|
| `useCurrentUser()` | `["currentUser", userId, address]` | 5min stale | Current user data from `/users/me` |
| `useUserRole()` | `["userRoles"]` | 5min stale | User roles (isAdmin, isManager, isAttester) |
| `useUserCreation()` | — | — | Auto-creates user on first login |

### Pool Hooks (`src/hooks/pools/`)

| Hook | Description |
|------|-------------|
| `usePoolsQuery()` | Pool listings with sort/filter |
| `usePoolLive()` | Single pool with live data |
| `useNavHistory()` | NAV price history |
| `useInvest()` | Invest USDC into pool |
| `useRedeem()` | Request share redemption |
| `useApproveInvestment()` | Manager approves investment |
| `useRejectInvestment()` | Manager rejects investment |
| `useApproveRedemption()` | Manager approves redemption |
| `useOpenWindow()` | Open investment window |
| `useCloseWindow()` | Close investment window |
| `useDrawDown()` | Manager draw down |
| `useRepay()` | Manager repay |
| `useInvestmentRequests()` | Investment request list |
| `useInvestorBalanceStates()` | Investor balance states |
| `usePoolTransactions()` | Pool transaction history |
| `useSolanaTransaction()` | Base Solana tx hook |

### Auth Hooks (`src/hooks/auth/`)

| Hook | Description |
|------|-------------|
| `useAuthState()` | Multi-step auth flow state |
| `useEmailAuthFlow()` | Email auth flow |
| `useEmailAuthHandler()` | Email OTP handler |
| `usePasskeyFlow()` | Passkey authentication |
| `useWalletConnection()` | Wallet connection flow |
| `useWalletPolling()` | Wallet address polling |

### Other Domain Hooks

| Directory | Hooks |
|-----------|-------|
| `hooks/admin/` | Manager, pool, event, pipeline key admin hooks |
| `hooks/managers/` | Manager profile hooks |
| `hooks/kyb/` | KYB CRUD hooks (draft, submit, review, UBOs, docs) |
| `hooks/risk/` | Risk score and monthly data hooks |
| `hooks/notaFiscal/` | Trade receivable hooks |

### Utility Hooks

| Hook | Description |
|------|-------------|
| `useFileUpload()` | File upload with progress tracking |
| `useFileUrl()` | Signed URL fetching |
| `useMediaQuery()` | Responsive breakpoint detection |
| `useReducedMotion()` | `prefers-reduced-motion` detection |
| `usePoolTabs()` | Pool detail tab state |
| `usePortfolio()` | Portfolio summary |
| `usePortfolioTransactions()` | Portfolio transaction history |
| `useTVL()` | Total Value Locked |
| `useMyInvestmentRequests()` | User's investment requests |
| `useMyRedemptionRequests()` | User's redemption requests |
| `useRedemptionRequests()` | All redemption requests |
