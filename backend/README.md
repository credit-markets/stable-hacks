# Credit Markets Backend

Backend API for Credit Markets -- an institutional DeFi protocol enabling credit facilitation on Solana. Built with NestJS 11, Supabase (PostgreSQL), and Solana Web3.js/Anchor.

## Overview

Credit Markets connects institutional credit facilitators (originators) with investors seeking yield-generating, asset-backed credit products. This backend handles:

- **Pool lifecycle** -- creation, on-chain deployment, investment windows, draw-downs, redemptions
- **Investor portfolio** -- positions, transaction history, pending requests
- **KYB verification** -- multi-step submission workflow with document management and on-chain attestation
- **Risk analytics** -- FIDC/TIDC-specific risk scores, monthly time series, deterioration alerts
- **Marketplace** -- public TVL data, pool browsing
- **Blockchain sync** -- Helius webhook integration for on-chain event processing

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | NestJS | 11 |
| Language | TypeScript | 5.7 |
| Database | Supabase (PostgreSQL) | Client 2.98 |
| Blockchain | Solana Web3.js + Anchor | 1.95 / 0.32 |
| Auth | Dynamic Labs (JWKS) | -- |
| Email | Resend | 4.1 |
| Testing | Jest + ts-jest | 29 |
| Linting | ESLint + Prettier | 9 / 3.4 |
| Build | NestJS CLI + SWC | 11 / 1.10 |

## Prerequisites

- **Node.js** 22+
- **pnpm** 10.8+
- [Supabase](https://supabase.com/) project (hosted)
- Solana RPC endpoint ([Helius](https://www.helius.dev/) recommended)
- [Dynamic Labs](https://www.dynamic.xyz/) account
- [Resend](https://resend.com/) account

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start development server (hot reload)
pnpm dev

# Verify
open http://localhost:3030/api     # Swagger UI
curl http://localhost:3030/health  # Health check
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (full DB access) |
| `SOLANA_RPC_URL` | Yes (prod) | Solana RPC endpoint (devnet fallback in dev) |
| `SOLANA_OPERATOR_PK` | Yes | Operator keypair as JSON byte array |
| `DYNAMIC_ENVIRONMENT_ID` | Yes | Dynamic Labs env ID (must match frontend) |
| `DYNAMIC_TOKEN` | Yes | Dynamic Labs API token |
| `DYNAMIC_API` | Yes | Dynamic Labs API URL |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `EMAIL_SENDER` | Yes | Sender email address |
| `AUTHORITY` | Yes | Platform admin Solana wallet |
| `ATTESTER` | Yes | Platform attester Solana wallet |
| `HELIUS_WEBHOOK_SECRET` | Yes | Helius webhook secret |
| `SUPABASE_STORAGE_BUCKET` | No | Storage bucket (default: `files`) |
| `PORT` | No | Server port (default: `3030`) |
| `NODE_ENV` | No | Environment (default: `development`) |

See `.env.example` for the full template.

## Development

```bash
pnpm dev          # Start with hot reload (port 3030)
pnpm build        # Production build
pnpm start:prod   # Run production build
pnpm test         # Run tests
pnpm test:cov     # Coverage report
pnpm test:watch   # Watch mode
pnpm lint         # ESLint check + fix
pnpm validate     # lint + test (pre-commit)
```

### Before Committing

```bash
pnpm lint && pnpm test
```

## Architecture

### Module Structure

```
src/
├── auth/              # JWKS verification, JWT middleware, guards (Admin, PoolManager, Attester)
├── blockchain/        # Solana Web3.js + Anchor, Helius webhooks, on-chain reads
├── common/            # Shared guards, utils, decorators, storage service factory
├── config/            # NestJS ConfigModule, Swagger config
├── database/          # Supabase client + auto-generated types
├── email/             # Resend email service
├── events/            # Execution event audit log
├── file-uploads/      # File upload with security validation
├── health/            # Health checks (simple, liveness, readiness, detailed)
├── kyb/               # Know Your Business verification workflow
├── managers/          # Credit manager profiles
├── marketplace/       # Public marketplace data (TVL)
├── nota-fiscal-items/ # Brazilian invoice receivables (TIDC)
├── pools/             # Pool CRUD, deployment, transactions, NAV
├── portfolio/         # Investor portfolio tracking
├── risk/              # Risk assessment (FIDC/TIDC scores, monthly data)
├── types/             # Shared TypeScript definitions
└── users/             # User management, roles
```

### Service Decomposition Pattern

Complex modules use an orchestrator + specialized services pattern:

```
pools/
├── pools.service.ts              # Orchestrator
└── services/
    ├── pool-crud.service.ts      # Database operations
    ├── pool-deployment.service.ts # Solana transaction building
    └── pool-onchain.service.ts   # On-chain state reads
```

## Authentication

Authentication uses Dynamic Labs with JWKS verification:

1. User connects wallet via Dynamic Labs (frontend)
2. Dynamic Labs issues RS256 JWT
3. Backend verifies JWT against JWKS endpoint (no shared secrets)
4. Wallet address extracted from verified credentials

```typescript
// Guard usage on endpoints
@UseGuards(JwtAuthGuard)              // Any authenticated user
@UseGuards(JwtAuthGuard, AdminGuard)  // Admin only
@UseGuards(JwtAuthGuard, PoolManagerGuard) // Pool manager
@UseGuards(JwtAuthGuard, AttesterGuard)    // KYB attester
```

## Authorization

Role-based access derived from on-chain state:

| Role | Determination | Guard |
|------|---------------|-------|
| **Admin** | Wallet === `AUTHORITY` env var | `AdminGuard` |
| **Pool Manager** | Wallet === pool's `manager_address` | `PoolManagerGuard` |
| **Attester** | Wallet is `attester_address` on any pool | `AttesterGuard` |
| **Investor** | Any authenticated user | `JwtAuthGuard` only |

Guard order matters -- always `JwtAuthGuard` first, then role guard.

## API Documentation

**Swagger UI**: http://localhost:3030/api

Key endpoint groups:

| Tag | Prefix | Description |
|-----|--------|-------------|
| health | `/health` | Health checks and probes |
| users | `/users` | User profiles and roles |
| pools | `/pools` | Pool management and transaction building |
| managers | `/managers` | Manager profiles |
| portfolio | `/portfolio` | Investor portfolio |
| marketplace | `/marketplace` | Public TVL data |
| kyb | `/kyb` | KYB verification workflow |
| files | `/files` | File upload and access |
| events | `/events` | Execution event audit log |
| risk | `/risk` | Risk scores and metrics |
| Nota Fiscal Items | `/nota-fiscal-items` | Invoice receivables |

See [docs/api-reference.md](docs/api-reference.md) for the complete endpoint listing.

## Health Checks

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /health` | None | Basic status |
| `GET /health/live` | None | Kubernetes liveness probe |
| `GET /health/ready` | None | Kubernetes readiness probe (checks DB) |
| `GET /health/detailed` | Admin | Full system diagnostics |

```yaml
# Kubernetes probe config
livenessProbe:
  httpGet:
    path: /health/live
    port: 3030
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3030
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Deployment

### Docker

```bash
docker build -t credit-markets-backend .
docker run -p 3030:3030 --env-file .env credit-markets-backend
```

See [docs/deployment.md](docs/deployment.md) for production deployment, scaling, and monitoring.

### Production Checklist

- [ ] All required environment variables configured
- [ ] `NODE_ENV=production` set
- [ ] Supabase project with correct schema and storage bucket
- [ ] Solana RPC endpoint (not devnet)
- [ ] Dynamic Labs environment ID matches frontend
- [ ] Helius webhook configured
- [ ] SSL/TLS termination via reverse proxy
- [ ] Health check monitoring active

## Testing

```bash
pnpm test         # Run all tests
pnpm test:cov     # With coverage
pnpm test:watch   # Watch mode
```

Coverage requirements: 90% for auth/security, 80% for business logic, 70% for CRUD.

See [docs/testing.md](docs/testing.md) for patterns and mocking guides.

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | AI assistant guidance and complete module map |
| [docs/security.md](docs/security.md) | Security architecture, auth flow, RBAC |
| [docs/testing.md](docs/testing.md) | Testing patterns, mocking, coverage |
| [docs/deployment.md](docs/deployment.md) | Production deployment guide |
| [docs/api-reference.md](docs/api-reference.md) | Complete API endpoint reference |
| [docs/database.md](docs/database.md) | Database schema, Supabase patterns |

## Related

| Component | Location | Port |
|-----------|----------|------|
| Frontend (Next.js 15) | `../app/` | 3000 |
| Backend (NestJS 11) | `./` | 3030 |
| Swagger UI | -- | http://localhost:3030/api |

## Security

For security issues, email security@credit.markets (do not open public issues).

See [docs/security.md](docs/security.md) for the full security architecture.

## License

UNLICENSED -- Proprietary
