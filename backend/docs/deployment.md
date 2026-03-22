# Deployment Guide

## Overview

The Credit Markets backend is a NestJS application deployed as a Docker container. It connects to Supabase (PostgreSQL), Solana RPC, Dynamic Labs, Helius webhooks, and Resend email services.

---

## Infrastructure Requirements

| Component | Requirement |
|-----------|-------------|
| Runtime | Node.js 22+ |
| Package Manager | pnpm 10.8+ |
| Database | Supabase project (hosted) |
| Blockchain | Solana RPC endpoint (Helius recommended) |
| Auth Provider | Dynamic Labs account |
| Email | Resend account |
| Webhooks | Helius webhook subscription |
| Container | Docker (linux/amd64) |

---

## Docker

### Build

```bash
docker build -t credit-markets-backend .
```

The Dockerfile (`backend/Dockerfile`):
- Base image: `node:22-slim` (linux/amd64)
- Installs pnpm, copies source, runs `pnpm build`
- Exposes port 3030
- Entrypoint: `node dist/main.js`

### Run

```bash
docker run -p 3030:3030 --env-file .env credit-markets-backend
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3030:3030"
    env_file:
      - ./backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3030/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure all values.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full DB access) | `eyJ...` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://mainnet.helius-rpc.com/?api-key=...` |
| `SOLANA_OPERATOR_PK` | Operator keypair (JSON byte array) | `[1,2,3,...]` |
| `DYNAMIC_ENVIRONMENT_ID` | Dynamic Labs env ID | `abc123-def456` |
| `DYNAMIC_TOKEN` | Dynamic Labs API token | `dyn_...` |
| `DYNAMIC_API` | Dynamic Labs API URL | `https://app.dynamic.xyz/api/v0` |
| `RESEND_API_KEY` | Resend email API key | `re_...` |
| `EMAIL_SENDER` | Email sender address | `noreply@credit.markets` |
| `AUTHORITY` | Platform admin wallet address | `7xKX...` (Solana base58) |
| `ATTESTER` | Platform attester wallet address | `4azC...` (Solana base58) |
| `HELIUS_WEBHOOK_SECRET` | Helius webhook secret | Random string |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3030` | Server port |
| `NODE_ENV` | `development` | Environment (`development`, `staging`, `production`) |
| `SUPABASE_STORAGE_BUCKET` | `files` | Supabase Storage bucket name |
| `SWAGGER_PRODUCTION_URL` | `https://api.credit.markets` | Production Swagger server URL |
| `SWAGGER_STAGING_URL` | `https://staging-api.credit.markets` | Staging Swagger server URL |

### Production Notes

- `NODE_ENV=production` enables:
  - Supabase Storage (instead of local filesystem)
  - Secure cookies (`httpOnly`, `secure`, `sameSite: strict`)
  - Requires `SOLANA_RPC_URL` (no devnet fallback)
  - Disables static file serving for `/uploads/`

---

## Supabase Setup

### Project Configuration

1. Create a Supabase project at [supabase.com](https://supabase.com/)
2. Copy the project URL and service role key from Settings > API
3. Create a storage bucket named `files` (or custom name via `SUPABASE_STORAGE_BUCKET`)

### Database Schema

The schema is managed through Supabase migrations. Key tables:

- `users` -- User profiles with wallet addresses
- `pools` -- Credit pool configurations and on-chain state
- `managers` -- Credit manager profiles
- `kyb_submissions`, `kyb_documents`, `kyb_ubos`, `kyb_wallet_declarations` -- KYB workflow
- `execution_events` -- Audit log
- `nota_fiscal_items` -- Brazilian invoice receivables
- `nav_price_history`, `tvl_snapshots` -- Market data
- `risk_fidc_scores`, `risk_fidc_monthly`, `risk_tidc_scores`, `risk_tidc_monthly` -- Risk data

### Type Generation

Database types are auto-generated. After schema changes:

```bash
npx supabase gen types typescript --project-id <project-id> > src/database/database.types.ts
```

---

## Solana RPC Provider

### Recommended: Helius

[Helius](https://www.helius.dev/) provides:
- High-performance RPC with enhanced transaction parsing
- Webhook subscriptions for on-chain event monitoring
- Required for the Helius webhook integration

### Configuration

- **Mainnet**: Use a dedicated RPC endpoint (rate limits matter for production)
- **Devnet**: Falls back to `https://api.devnet.solana.com` if `SOLANA_RPC_URL` not set
- **Operator key**: JSON byte array of a Solana keypair; if invalid, service runs in read-only mode

### Helius Webhook Setup

1. Create a webhook in the Helius dashboard
2. Set the webhook URL to `https://your-api-domain/webhooks/helius`
3. Subscribe to the CreditVault program address (`Bf17gDR2JdKTWdoTWK3Va9YQtkpePRAAVxMCaokj8ZFW`)
4. Copy the webhook secret to `HELIUS_WEBHOOK_SECRET`

---

## Health Check Endpoints

| Endpoint | Auth | Purpose | Use For |
|----------|------|---------|---------|
| `GET /health` | None | Basic status | Uptime monitoring |
| `GET /health/live` | None | Liveness probe | Kubernetes liveness |
| `GET /health/ready` | None | Readiness probe (checks DB) | Kubernetes readiness |
| `GET /health/detailed` | Admin | Full system status | Operations dashboard |
| `GET /health/ping` | None | Minimal ping | Load balancer |

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3030
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3030
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
```

### Detailed Health Check

`GET /health/detailed` (requires Admin auth) checks:
- **Supabase** (critical) -- DB connectivity
- **Cache** -- In-memory cache operations
- **Supabase Storage** -- File storage access
- **Solana RPC** -- Blockchain connectivity (latest slot)
- **System metrics** -- CPU usage, memory usage, uptime

Status hierarchy:
- `UP` -- All services healthy
- `DEGRADED` -- Non-critical services down (e.g., Solana RPC)
- `DOWN` -- Critical services down (e.g., Supabase)

---

## CI/CD

### GitHub Actions

The CI pipeline (`.github/workflows/ci.yml`) runs on PRs and pushes to `main`/`dev`:

1. Checkout code
2. Install pnpm + Node.js 20
3. `pnpm install --frozen-lockfile`
4. `pnpm lint` (non-blocking)
5. `pnpm test --coverage` (with `NODE_ENV=test`)
6. Upload coverage to Codecov

---

## Monitoring

### Recommended Setup

| Aspect | Tool | Endpoint |
|--------|------|----------|
| Uptime | Any HTTP monitor | `GET /health` |
| Readiness | Kubernetes | `GET /health/ready` |
| System metrics | Admin dashboard | `GET /health/detailed` |
| Logs | Structured logging | NestJS Logger (stdout) |
| Errors | Error tracking service | Catch unhandled exceptions |
| Performance | APM tool | Request duration via Swagger |

### Logging

The application uses NestJS `Logger` with structured context:

```typescript
this.logger.log('Pool deployed', { poolId, txHash });
this.logger.error('Deployment failed', { poolId, error: error.message });
logError(this.logger, 'Operation failed', error, { context });
```

---

## SSL/TLS

- The application itself does not terminate TLS
- Use a reverse proxy (nginx, Caddy, AWS ALB, Cloudflare) for HTTPS
- Set `NODE_ENV=production` to enable secure cookies
- CORS is configured for `https://staging.credit.markets` and `https://credit.markets`

---

## Production Checklist

- [ ] `NODE_ENV=production` set
- [ ] All required environment variables configured
- [ ] Supabase project created with correct schema
- [ ] Supabase Storage bucket created
- [ ] Solana RPC endpoint configured (not devnet)
- [ ] Dynamic Labs environment ID matches frontend
- [ ] Helius webhook configured and secret set
- [ ] Resend API key and sender email configured
- [ ] AUTHORITY and ATTESTER wallet addresses set
- [ ] SSL/TLS termination configured
- [ ] Health check monitoring enabled
- [ ] Log aggregation configured
- [ ] Rate limiting tested
- [ ] CORS origins verified for production domains
- [ ] Secrets rotated from development values

---

## Scaling Considerations

- **Stateless**: The application is stateless (no in-memory sessions). Rate limit state and guard caches are per-instance, which is acceptable for moderate scale.
- **Horizontal scaling**: Multiple instances behind a load balancer. Use `/health/ready` for health checks.
- **Database**: Supabase handles connection pooling. Service role key bypasses RLS.
- **RPC**: Solana RPC rate limits are the primary bottleneck for on-chain reads. Use a dedicated Helius plan for production.
- **File uploads**: Supabase Storage handles file serving. The backend only proxies uploads.

---

## Backup Strategy

| Data | Strategy |
|------|----------|
| Database | Supabase automated backups (Point-in-Time Recovery on Pro plan) |
| File storage | Supabase Storage (managed by Supabase infrastructure) |
| On-chain data | Immutable on Solana blockchain |
| Environment config | Store in secrets manager (AWS Secrets Manager, Vault, etc.) |
| Source code | Git repository |
