# Testing Guide

This document describes the testing setup, patterns, and conventions for the Credit Markets frontend.

---

## Framework

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.x | Test runner |
| React Testing Library | 16.x | Component rendering |
| jsdom | 27.x | Browser environment |
| @testing-library/jest-dom | 6.x | DOM matchers |
| @vitest/coverage-v8 | 4.x | Code coverage |

---

## Configuration

### Vitest Config (`vitest.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,          // vi, describe, it, expect available globally
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Key settings:
- **jsdom** environment for DOM APIs
- **globals: true** — No need to import `describe`, `it`, `expect`, `vi`
- **`@/` alias** — Matches the app's import path alias
- **`@vitejs/plugin-react`** — Enables JSX and React Fast Refresh in tests

### Setup File (`vitest.setup.ts`)

Global mocks and configuration applied before every test:

1. **`@testing-library/jest-dom`** — Extends `expect` with DOM matchers (`toBeInTheDocument`, `toHaveClass`, etc.)

2. **Environment variables**:
   ```typescript
   process.env.NEXT_PUBLIC_BASE_API_URL = "http://localhost:3030";
   process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
   process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID = "test-dynamic-env-id";
   process.env.NEXT_PUBLIC_APP_MODE = "testnet";
   ```

3. **BigInt serialization** for snapshots:
   ```typescript
   expect.addSnapshotSerializer({
     test: (val) => typeof val === "bigint",
     serialize: (val) => `BigInt(${val})`,
   });
   ```

4. **Global mocks**:
   - `react-hot-toast` — All toast methods mocked (`success`, `error`, `loading`, `dismiss`, `promise`)
   - `next/headers` — `cookies()` mocked
   - `next/navigation` — `useRouter`, `usePathname`, `useSearchParams` mocked
   - `URL.createObjectURL` / `URL.revokeObjectURL` — mocked for file upload tests

---

## Running Tests

```bash
# Watch mode (development)
pnpm test

# Single run (CI)
pnpm test:run

# With v8 coverage
pnpm test:coverage

# Browser-based test UI
pnpm test:ui
```

---

## Test File Organization

Tests are collocated with their source files:

```
src/
├── hooks/
│   ├── useCurrentUser.ts
│   ├── useCurrentUser.test.tsx       ← Collocated test
│   ├── useUserCreation.ts
│   ├── useUserCreation.test.ts
│   ├── auth/
│   │   ├── useEmailAuthHandler.ts
│   │   ├── useEmailAuthHandler.test.ts
│   │   ├── useWalletPolling.ts
│   │   ├── useWalletPolling.test.ts
│   │   └── __tests__/
│   │       └── useWalletConnection.test.ts
│   ├── pools/
│   │   ├── useInvest.ts
│   │   ├── useInvest.test.ts
│   │   ├── useSolanaTransaction.ts
│   │   └── useSolanaTransaction.test.ts
│   └── admin/
│       ├── useEventsQuery.test.ts
│       └── useTogglePoolVisibility.test.ts
├── services/
│   └── __tests__/
│       └── fileService.test.ts
├── lib/
│   ├── cookies.ts
│   ├── cookies.test.ts
│   ├── validations/
│   │   └── __tests__/
│   │       └── fileValidation.test.ts
│   ├── utils/
│   │   └── __tests__/
│   │       └── tvl.test.ts
│   └── server/
│       └── __tests__/
│           └── cached-pool.test.ts
├── components/
│   └── connect-button.test.tsx
├── app/
│   ├── actions/
│   │   └── auth.test.ts
│   ├── admin/
│   │   ├── layout.test.tsx
│   │   └── pools/components/
│   │       └── CreatePoolModal.test.tsx
│   └── (dashboard)/onboarding/kyb/
│       ├── components/KybStatusBanner.test.tsx
│       └── steps/ReviewSubmitStep.test.tsx
├── middleware.ts
└── middleware.test.ts
```

Both patterns are used:
- Direct colocation: `useCurrentUser.test.tsx` next to `useCurrentUser.ts`
- `__tests__/` subdirectory: For tests that need shared fixtures or multiple test files

---

## Test Utilities

### Test Wrapper (`src/__tests__/utils/test-wrapper.tsx`)

Provides a QueryClient wrapper for testing hooks:

```typescript
import { createTestWrapper, createTestWrapperWithClient } from "@/__tests__/utils/test-wrapper";

// Simple wrapper
const { result } = renderHook(() => useMyHook(), {
  wrapper: createTestWrapper(),
});

// Wrapper with client access (for assertions or cleanup)
const { wrapper, queryClient } = createTestWrapperWithClient();
const { result } = renderHook(() => useMyHook(), { wrapper });
```

The test QueryClient disables retries and sets `gcTime: 0` to prevent flaky tests.

### Axios Mock (`src/__tests__/mocks/axios.mock.ts`)

Provides mock Axios methods and helpers:

```typescript
import { mockAxios, mockAxiosSuccess, mockAxiosError, setupAxiosMocks } from "@/__tests__/mocks/axios.mock";

// Setup mocks (call once in test file)
beforeAll(() => {
  setupAxiosMocks();
});

// Mock a successful response
mockAxios.get.mockResolvedValue(mockAxiosSuccess({ id: "123", name: "Pool" }));

// Mock an error response
mockAxios.get.mockRejectedValue(mockAxiosError("Not found", 404));

// Reset between tests
beforeEach(() => {
  resetAxiosMocks();
});
```

`setupAxiosMocks()` mocks both `axios` and `@/services/api` modules.

### Dynamic Labs Mock (`src/__tests__/mocks/dynamic.mock.ts`)

Provides mock Dynamic Labs context:

```typescript
import { setupDynamicMocks, mockDynamicContext, createMockDynamicContext } from "@/__tests__/mocks/dynamic.mock";

// Setup (mocks useDynamicContext)
beforeEach(() => {
  setupDynamicMocks();
});

// Customize context
const context = createMockDynamicContext({
  primaryWallet: null, // No wallet connected
});
```

Default mock context includes:
- `user.userId`: `"test-user-123"`
- `user.email`: `"test@example.com"`
- `primaryWallet.address`: `"7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV"`
- `primaryWallet.connector.name`: `"Phantom"`
- `handleLogOut`: `vi.fn()`

### Test Fixtures

Located in `src/__tests__/fixtures/`:

- `blockchain.fixtures.ts` — Solana addresses, transaction data, keypairs
- `file.fixtures.ts` — File objects, upload responses, file metadata

---

## Testing Patterns

### Hook Testing

Use `renderHook` from `@testing-library/react` with the test wrapper:

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { createTestWrapper } from "@/__tests__/utils/test-wrapper";

describe("useCurrentUser", () => {
  it("fetches user data when authenticated", async () => {
    setupDynamicMocks();
    setupAxiosMocks();

    mockAxios.get.mockResolvedValue(
      mockAxiosSuccess({ id: "user-1", account: "0xabc" })
    );

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.account).toBe("0xabc");
  });
});
```

### Component Testing

Use `render` from `@testing-library/react`:

```typescript
import { render, screen } from "@testing-library/react";

describe("ConnectButton", () => {
  it("renders connect button", () => {
    render(<ConnectButton />, { wrapper: createTestWrapper() });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```

### Mocking Patterns

#### Module Mocking

```typescript
vi.mock("@/services/poolService", () => ({
  getPool: vi.fn(),
  getPools: vi.fn(),
}));
```

#### Inline Mocking (per test)

```typescript
vi.mocked(getPool).mockResolvedValue(mockPool);
```

#### Mocking Next.js Navigation

Already mocked globally in `vitest.setup.ts`. To customize per test:

```typescript
import { useRouter } from "next/navigation";

vi.mocked(useRouter).mockReturnValue({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
});
```

### Testing Async Operations

Use `waitFor` for async state changes:

```typescript
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

Use `act` for triggering mutations:

```typescript
await act(async () => {
  result.current.mutate({ poolId: "123", amount: 1000 });
});

await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

---

## What to Test

### High Priority

- **Hooks** — Data fetching hooks (query key correctness, enabled conditions, error handling)
- **Middleware** — JWT verification, route protection, role-based redirects
- **Services** — API endpoint construction, error handling
- **Utility functions** — Formatting, validation, calculations
- **Server Actions** — Cookie management

### Medium Priority

- **Components** — User interactions, conditional rendering, form submission
- **Validation schemas** — Zod schema edge cases

### Lower Priority

- **Pure UI components** — Simple presentational components with no logic
- **Style classes** — Covered by visual inspection

---

## What NOT to Test

- NextUI component internals (tested by the library)
- Tailwind CSS class output
- Dynamic Labs SDK internals
- Third-party library behavior

---

## Test Naming

Tests describe behavior, not implementation:

```typescript
// Good
it("redirects to login when JWT is invalid")
it("shows error toast when investment fails")
it("invalidates pool queries after successful investment")

// Avoid
it("calls verifyJwt with correct params")
it("sets status to error")
```

---

## Coverage

Run coverage with:

```bash
pnpm test:coverage
```

Uses `@vitest/coverage-v8` for V8 coverage instrumentation.

---

## Existing Test Files

The current test suite covers:

| File | Tests |
|------|-------|
| `middleware.test.ts` | JWT verification, route redirects, admin role checks |
| `app/actions/auth.test.ts` | Server action cookie cleanup |
| `hooks/useCurrentUser.test.tsx` | User data fetching, auth state |
| `hooks/useUserCreation.test.ts` | Auto user creation on first login |
| `hooks/auth/useEmailAuthHandler.test.ts` | Email OTP handling |
| `hooks/auth/useWalletPolling.test.ts` | Wallet address polling |
| `hooks/auth/__tests__/useWalletConnection.test.ts` | Wallet connection flow |
| `hooks/pools/useInvest.test.ts` | Investment flow |
| `hooks/pools/useSolanaTransaction.test.ts` | Solana transaction lifecycle |
| `hooks/admin/useEventsQuery.test.ts` | Admin event query |
| `hooks/admin/useTogglePoolVisibility.test.ts` | Pool visibility toggle |
| `hooks/managers/useManagerProfile.test.ts` | Manager profile fetching |
| `hooks/__tests__/useFileUpload.test.tsx` | File upload with progress |
| `services/__tests__/fileService.test.ts` | File service API calls |
| `lib/cookies.test.ts` | Cookie utilities |
| `lib/validations/__tests__/fileValidation.test.ts` | File validation logic |
| `lib/utils/__tests__/tvl.test.ts` | TVL computation |
| `lib/server/__tests__/cached-pool.test.ts` | SSR pool caching |
| `components/connect-button.test.tsx` | Connect button rendering |
| `app/admin/layout.test.tsx` | Admin layout role gating |
| `app/admin/pools/components/CreatePoolModal.test.tsx` | Pool creation modal |
| `app/(dashboard)/onboarding/kyb/components/KybStatusBanner.test.tsx` | KYB status display |
| `app/(dashboard)/onboarding/kyb/steps/ReviewSubmitStep.test.tsx` | KYB review step |
