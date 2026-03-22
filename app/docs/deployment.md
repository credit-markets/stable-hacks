# Frontend Deployment

This document describes the build process, environment configuration, and deployment considerations for the Credit Markets frontend.

---

## Build Process

### Commands

```bash
# Production build
pnpm build

# Start production server
pnpm start

# Analyze bundle size
ANALYZE=true pnpm build
```

### Build Steps

1. **Environment validation** — `@t3-oss/env-nextjs` validates all required env vars at build time via `src/env/client.mjs` (imported at the top of `next.config.mjs`). Missing variables cause the build to fail.

2. **Next.js compilation** — Compiles the App Router, generates static pages, bundles client code.

3. **Output** — `.next/` directory containing server and client bundles.

### Turbopack

Development uses Turbopack via `next dev --turbo` for faster HMR. Production builds use the standard webpack compiler.

---

## Environment Variables

### Required for Production

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BASE_API_URL` | `https://api.credit.markets` | Backend API URL |
| `NEXT_PUBLIC_APP_URL` | `https://credit.markets` | Frontend URL (must be valid URL) |
| `NEXT_PUBLIC_DYNAMIC_ENV_ID` | `abc123...` | Dynamic Labs environment ID |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anonymous key |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` | Solana network |

### Optional for Production

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DYNAMIC_API_BASE_URL` | `https://auth.credit.markets` | Custom hostname for Dynamic Labs cookie auth |
| `NEXT_PUBLIC_DYNAMIC_API_URL` | `https://api.dynamic.xyz` | Dynamic Labs API URL override |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://rpc.helius.xyz/...` | Custom Solana RPC (recommended for production) |
| `NEXT_PUBLIC_ATTESTER` | `7EcD...` | Platform attester Solana address |
| `ANALYZE` | `true` | Enable bundle analyzer |

### Critical Configuration

- `NEXT_PUBLIC_DYNAMIC_ENV_ID` must match the backend's `DYNAMIC_ENVIRONMENT_ID`
- `NEXT_PUBLIC_SOLANA_NETWORK` should be `mainnet-beta` for production
- A custom `NEXT_PUBLIC_SOLANA_RPC_URL` is recommended for production to avoid Solana public RPC rate limits

---

## Security Headers

Configured in `next.config.mjs` for all routes (`/:path*`):

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS enforcement (2 years) |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking prevention |
| `X-Content-Type-Options` | `nosniff` | MIME type sniffing prevention |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Referrer-Policy` | `origin-when-cross-origin` | Referrer leakage prevention |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused browser APIs |
| `X-DNS-Prefetch-Control` | `on` | DNS prefetching enabled |

---

## Image Optimization

Next.js image optimization is configured with:

```javascript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "**",
    },
  ],
},
```

This allows images from any HTTPS hostname. For tighter security in production, consider restricting to known image hosts.

---

## Bundle Optimization

### Package Tree Shaking

`next.config.mjs` uses `experimental.optimizePackageImports` to tree-shake large libraries:

```javascript
experimental: {
  optimizePackageImports: [
    "@dynamic-labs/sdk-react-core",
    "@dynamic-labs/solana",
    "@dynamic-labs/types",
    "@nextui-org/react",   // 76 files
    "lucide-react",        // 48 files
  ],
},
```

### Webpack Externals

These packages are excluded from the client bundle:

```javascript
config.externals.push("pino-pretty", "lokijs", "encoding");
```

### Bundle Analysis

Enable with:

```bash
ANALYZE=true pnpm build
```

This opens a browser window showing the bundle composition via `@next/bundle-analyzer`.

---

## Static vs Dynamic Routes

| Route Type | Examples | Rendering |
|------------|----------|-----------|
| Static | `/login`, `/signup`, `/risk-methodology` | Pre-rendered at build time |
| Dynamic | `/pool/[address]`, `/admin/kyb-queue/[id]` | Server-rendered per request |
| Client-rendered | `/portfolio`, `/account`, `/manager` | Server shell + client data fetching |

The pool detail page (`/pool/[address]`) uses SSR with `React.cache()` for data deduplication between `generateMetadata()` and the page component.

---

## Performance Considerations

### Fonts

Three font families are loaded via `@fontsource/*` packages (self-hosted, no external requests):
- **Inter** — Body text (400, 500, 600, 700)
- **IBM Plex Mono** — Terminal/code elements (400, 500)
- **Open Sauce Sans** — Legacy (400, 500, 600, 700) — can be removed after migration

### React Strict Mode

Enabled in `next.config.mjs`:

```javascript
reactStrictMode: true,
```

This helps catch potential issues but causes double-rendering in development.

### QueryClient Stale Times

Default stale time is 60 seconds, reducing unnecessary refetches. Three tiers are available:
- Realtime: 30s
- Standard: 60s
- Static: 5min

### Dynamic Imports

NextUI components and other large libraries are optimized via `optimizePackageImports`.

---

## Hosting Platform Requirements

The application is a standard Next.js 15 app that requires:

1. **Node.js runtime** — For SSR, middleware, and API routes
2. **Environment variable support** — All `NEXT_PUBLIC_*` variables must be set at build time
3. **Edge-compatible middleware** — The auth middleware uses `jose` for JWT verification (Edge Runtime compatible)

### Vercel (Recommended)

Next.js apps deploy seamlessly on Vercel:
- Automatic build and deploy
- Environment variables in project settings
- Edge middleware support
- Automatic image optimization
- Preview deployments per PR

### Other Platforms

Any platform supporting Next.js SSR works:
- **Docker**: Use `next build && next start`
- **AWS Amplify**: Native Next.js support
- **Cloudflare Pages**: With `@cloudflare/next-on-pages`
- **Self-hosted**: `pnpm build && pnpm start` (requires Node.js 18+)

---

## CI/CD Integration

### Pre-Deploy Checks

```bash
# Run before every deployment
pnpm lint          # Biome linting with auto-fix
pnpm tsc --noEmit  # TypeScript type checking (not in scripts, run manually)
pnpm test:run      # Vitest single run
pnpm build         # Production build (also validates env vars)
```

### Recommended CI Pipeline

```yaml
steps:
  - name: Install
    run: pnpm install --frozen-lockfile

  - name: Lint
    run: pnpm lint

  - name: Type Check
    run: pnpm tsc --noEmit

  - name: Test
    run: pnpm test:run

  - name: Build
    run: pnpm build
    env:
      NEXT_PUBLIC_BASE_API_URL: ${{ secrets.API_URL }}
      NEXT_PUBLIC_APP_URL: ${{ secrets.APP_URL }}
      NEXT_PUBLIC_DYNAMIC_ENV_ID: ${{ secrets.DYNAMIC_ENV_ID }}
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      NEXT_PUBLIC_SOLANA_NETWORK: mainnet-beta
```

---

## Domain and DNS

### Dynamic Labs Custom Hostname

For production cookie-based auth, Dynamic Labs requires a custom hostname (e.g., `auth.credit.markets`) configured as a CNAME to Dynamic Labs' servers. Set this in:

- Dynamic Labs dashboard: Custom domain configuration
- DNS: CNAME record pointing to Dynamic Labs
- Frontend: `NEXT_PUBLIC_DYNAMIC_API_BASE_URL=https://auth.credit.markets`

This enables `httpOnly` cookie setting for the JWT, improving security.

### JWT Issuer Configuration

The middleware expects the JWT issuer to match the custom hostname:
- Production: `auth.credit.markets/{env_id}`
- Development: `app.dynamicauth.com/{env_id}`

---

## Monitoring

### Error Tracking

The global error boundary (`src/app/error.tsx`) sends error reports to `/api/errors` in production:

```typescript
if (process.env.NODE_ENV === "production") {
  fetch("/api/errors", {
    method: "POST",
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    }),
  });
}
```

### Logging

The `logger` utility (`src/lib/logger.ts`) filters by environment:
- Production: Only `warn` and `error` levels
- Development: All levels

### React Query DevTools

Available in development only. Useful for inspecting cache state, query timing, and refetch behavior.
