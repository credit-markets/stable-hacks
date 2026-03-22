# Architecture — Credit Markets Platform

This document provides a comprehensive technical overview of the Credit Markets platform architecture for the StableHacks 2026 hackathon submission.

---

## System Overview

Credit Markets is a three-layer institutional DeFi platform built on Solana:

```
Layer 3: Analytics    ┌──────────────────────────────────────┐
(Risk Pipeline)       │  External Data Pipeline               │
                      │  CVM/BACEN filings → Risk tables      │
                      │  5 master tables, 6 FIDC metrics      │
                      └────────────────┬─────────────────────┘
                                       │ writes risk data
                                       ▼
Layer 2: Execution    ┌──────────────────────────────────────┐
(Platform)            │  Backend (NestJS 11)                  │
                      │  ┌─────────────────────────────────┐  │
                      │  │ execution_events (append-only)  │  │
                      │  │ Source of truth for all actions  │  │
                      │  └─────────────────────────────────┘  │
                      │  Auth · Pools · Portfolio · KYB        │
                      │  Risk · Managers · Compliance          │
                      └──────────────┬───────────────────────┘
                                     │ builds unsigned TXs
                                     ▼
Layer 1: Settlement   ┌──────────────────────────────────────┐
(Solana)              │  SVS-11 CreditVault Program           │
                      │  USDC deposits · Share tokens          │
                      │  Oracle NAV · Attestation · Freeze     │
                      │                                        │
                      │  Helius Webhooks → Supabase            │
                      └──────────────────────────────────────┘
```

**Core principle**: The platform is an execution and settlement engine that reads from a data pipeline. It does not originate risk data — it consumes it from regulatory filings and pipeline sources.

---

## Component Architecture

### Frontend (Next.js 15)

```
app/src/
├── app/                    # App Router (SSR + RSC)
│   ├── (dashboard)/        # Marketplace, portfolio, pool detail, manager
│   ├── admin/              # Admin panel (users, pools, KYB queue, events)
│   ├── login/ & signup/    # Auth pages (Dynamic Labs custom UI)
│   └── layout.tsx          # Root layout + providers
├── components/             # 26+ shared components
│   ├── pool/               # Pool detail (term sheet, NAV chart, risk panels)
│   ├── portfolio/          # Portfolio positions, risk panel
│   ├── auth/               # Custom Dynamic Labs auth UI
│   ├── onboarding/         # KYB multi-step forms
│   └── ui/                 # Primitives (buttons, skeletons, modals)
├── hooks/                  # 75+ React Query hooks
│   ├── pools/              # 18 pool hooks (CRUD, Solana transactions)
│   ├── auth/               # Auth flow hooks
│   ├── kyb/                # KYB workflow hooks
│   └── risk/               # Risk data hooks
├── services/               # 9 API service modules
├── types/                  # TypeScript domain types
├── lib/
│   ├── styleClasses.ts     # 334-line composable Tailwind design system
│   └── validations/        # Zod schemas
└── middleware.ts           # JWT verification via JWKS + role-based routing
```

**Key patterns**:
- **Data flow**: Service (API call) → Hook (React Query) → Component
- **Three cache tiers**: realtime (30s), standard (60s), static (5min)
- **SSR**: Pool detail page uses `React.cache()` for data deduplication
- **No global stores**: Server state via TanStack Query, auth via Dynamic Labs context

### Backend (NestJS 11)

```
backend/src/
├── auth/                   # JWT middleware, JWKS verification, role guards
├── users/                  # User CRUD, KYC status, wallet management
├── pools/                  # Pool CRUD + blockchain orchestration
│   ├── pools.service.ts    # Orchestrator (coordinates all pool operations)
│   ├── pool-crud.service.ts        # Database operations
│   ├── pool-deployment.service.ts  # Unsigned transaction building
│   └── pool-onchain.service.ts     # On-chain state reads
├── marketplace/            # Public pool browsing, TVL endpoint
├── portfolio/              # Investment tracking, positions, history
├── managers/               # Credit manager profiles
├── kyb/                    # KYB verification workflows
├── risk/                   # Risk scoring, alerts, metric definitions
├── events/                 # Execution event log (audit trail)
├── blockchain/             # Solana Web3.js + Anchor, Helius webhooks
├── nota-fiscal-items/      # TIDC receivables
├── file-uploads/           # Supabase Storage + security validation
├── email/                  # Resend transactional emails
├── health/                 # Liveness, readiness, detailed diagnostics
├── common/                 # Shared guards, decorators, storage factory
└── database/               # Supabase client (auto-generated types)
```

**Key patterns**:
- **Orchestrator pattern**: `PoolsService` coordinates CRUD, deployment, on-chain reads
- **Storage factory**: `STORAGE_SERVICE` switches Supabase Storage (prod) / local filesystem (dev)
- **Guard ordering**: `JwtAuthGuard` MUST run before role guards (`AdminGuard`, `PoolManagerGuard`, `AttesterGuard`)
- **3-check file security**: Rate limit → magic bytes + embedded script detection → MIME + size validation

### SVS-11 Program (Anchor/Rust)

```
programs/svs-11/src/
├── lib.rs                  # 21 instruction entry points
├── state.rs                # CreditVault, InvestmentRequest, RedemptionRequest, FrozenAccount
├── instructions/           # One file per instruction group
│   ├── initialize_pool.rs
│   ├── request_deposit.rs / approve_deposit.rs / claim_deposit.rs
│   ├── request_redeem.rs / approve_redeem.rs / claim_redeem.rs
│   ├── draw_down.rs / repay.rs
│   ├── investment_window.rs
│   ├── compliance.rs       # freeze/unfreeze
│   └── admin.rs            # pause, authority transfer, oracle config
├── attestation.rs          # KYC validation logic
├── oracle.rs               # NAV oracle reading + staleness check
├── error.rs                # 28 error codes
├── events.rs               # 16 event types
└── constants.rs            # PDA seeds, config values
```

---

## Authentication & Authorization

### Auth Flow

```
User ──► Dynamic Labs (wallet or email login)
              │
              ▼
         JWT issued (httpOnly cookie, RS256)
              │
              ▼
         Frontend middleware verifies JWT via JWKS
         (Dynamic Labs public keys, no shared secrets)
              │
              ▼
         Backend JwtMiddleware re-verifies independently
              │
              ▼
         Role guards check authorization:
         ├─ AdminGuard:       wallet === AUTHORITY env var
         ├─ PoolManagerGuard: wallet === pool.manager_address
         ├─ AttesterGuard:    wallet is attester on any pool
         └─ KybOwnerGuard:    user owns KYB submission
```

**Security properties**:
- No shared JWT secrets — both frontend and backend verify via JWKS public keys
- MFA-pending tokens rejected (scope check for `user:basic`)
- Admin role caching: 60s LRU (max 200 entries) in frontend middleware
- Timing-safe comparison for webhook secrets (Helius)

### On-Chain Access Control (SVS-11)

| Role | Signer | Capabilities |
|------|--------|--------------|
| **Authority** | `vault.authority` | Pause/unpause, transfer authority, change manager, update oracle/attester |
| **Manager** | `vault.manager` | Approve/reject deposits, approve redemptions, draw_down, repay, freeze/unfreeze, investment windows |
| **Investor** | TX signer + attestation | Request deposits/redemptions, cancel own requests, claim approved requests |
| **Attester** | `vault.attester` | Issues KYC attestations (off-chain, validated on-chain) |

---

## Transaction Flow

The platform uses a **backend-builds, frontend-signs** pattern:

```
┌──────────┐  1. User action    ┌──────────┐  2. POST /build-tx   ┌──────────┐
│ Frontend │ ──────────────────►│ Frontend │ ────────────────────►│ Backend  │
│ (UI)     │                    │ (Hook)   │                      │ (NestJS) │
└──────────┘                    └──────────┘                      └──────────┘
                                     │                                 │
                                     │  3. Returns base64              │
                                     │     unsigned transaction        │
                                     ◄─────────────────────────────────┘
                                     │
                                     │  4. Sign via Dynamic Labs wallet
                                     ▼
                                ┌──────────┐  5. sendRawTransaction  ┌──────────┐
                                │ Wallet   │ ──────────────────────►│ Solana   │
                                │ (Phantom)│                        │ RPC      │
                                └──────────┘                        └──────────┘
                                     │                                   │
                                     │  6. Subscribe to Supabase         │
                                     │     Realtime (execution_events)   │
                                     ◄───────────────────────────────────┘
                                     │     via Helius webhook
                                     │
                                     ▼
                                ┌──────────┐
                                │ Success  │  (60s timeout, then fallback query)
                                └──────────┘
```

**Status progression**: `idle` → `building_tx` → `awaiting_signature` → `confirming` → `success`/`error`

---

## Database Schema

### Core Tables (Supabase / PostgreSQL)

| Table | Purpose |
|-------|---------|
| `users` | User accounts (provider_id, type, classification, wallet) |
| `user_roles` | Role assignments (admin, attester) |
| `managers` | Credit manager profiles (company, overview, logo, owner_address) |
| `pools` | Credit pools (status, terms, on_chain_address, vault_id, manager) |
| `pool_investment_windows` | Current investment window state |
| `pool_responsibilities` | Actor-pool role assignments (responsibility chain) |
| `execution_events` | Append-only audit log (event_type, actor, target, payload, chain_tx_id) |
| `nav_price_history` | NAV price snapshots per pool (from Helius webhook) |
| `tvl_snapshots` | TVL data points per pool |
| `kyb_submissions` | KYB applications (status, risk_score, attestation details) |
| `kyb_documents` | KYB uploaded documents |
| `kyb_ubos` | Ultimate Beneficial Owners |
| `kyb_wallet_declarations` | Declared wallet addresses |
| `nota_fiscal_items` | TIDC receivables (cedente, sacado, valor_nominal) |

### Risk Tables (Pipeline-Sourced)

| Table | Pool Type | Content |
|-------|-----------|---------|
| `risk_fidc_scores` | FIDC | Fund risk scores (6 risk dimensions) |
| `risk_fidc_monthly` | FIDC | Monthly risk time series |
| `risk_tidc_scores` | TIDC | Receivable portfolio risk |
| `risk_tidc_monthly` | TIDC | Monthly receivable metrics |

### Database Functions (RPC)

- `get_current_tvl()` — Total value locked across all pools
- `get_daily_tvl()` — Daily TVL time series
- `open_investment_window(p_pool_id)` — Opens new investment window
- `increment_window_requested/approved/rejected(p_pool_id, p_amount)` — Window counters

---

## KYB Verification Workflow

```
┌──────────┐   Create Draft   ┌──────────┐   Submit    ┌──────────────┐
│ Manager  │ ───────────────►│  Draft   │ ──────────►│  Submitted   │
│ applies  │                  │ (7 steps)│             │              │
└──────────┘                  └──────────┘             └──────┬───────┘
                                                              │
                              ┌──────────────────────────────┘
                              │
                              ▼
                       ┌──────────────┐   Approve    ┌──────────────┐
                       │ Under Review │ ────────────►│   Approved   │
                       │ (Admin/      │              │ (On-chain    │
                       │  Attester)   │              │  attestation)│
                       └──────┬───────┘              └──────────────┘
                              │
                         Reject / Request Resubmission
                              │
                              ▼
                       ┌──────────────┐
                       │  Rejected /  │
                       │  Resubmit    │
                       └──────────────┘
```

**7-step KYB form**:
1. Pre-screening (entity type, jurisdiction)
2. Company information (name, registration, address)
3. UBO declaration (Ultimate Beneficial Owners)
4. Source of funds
5. PEP/RCA checks (Politically Exposed Persons)
6. Document uploads (cert of incorporation, proof of address, etc.)
7. Declarations & submission

---

## Risk Analytics

### FIDC Risk Model (6 dimensions)

Risk scores sourced from CVM/BACEN regulatory filings via external data pipeline:

| Dimension | Description |
|-----------|-------------|
| Credit Risk | Default probability, recovery rates |
| Liquidity Risk | Redemption capacity, cash reserves |
| Concentration Risk | Portfolio diversification |
| Operational Risk | Servicer quality, infrastructure |
| Legal Risk | Regulatory compliance, documentation |
| Market Risk | Interest rate sensitivity, FX exposure |

### TIDC Risk Model

Risk assessment based on receivable portfolio quality:
- Nota fiscal item analysis (cedente, sacado, valor_nominal, vencimento)
- Receivable aging, concentration, default rates
- Originator credit quality

---

## Security Measures

### Network Layer
- **Helmet** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **CORS** — Whitelist: `staging.credit.markets`, `credit.markets`, `localhost:3000/3001`
- **Rate limiting** — 100 req/min global, 10 file uploads/min per user

### Application Layer
- **JWKS verification** — RS256, no shared secrets, expiration enforced
- **Role guards** — Always auth-first, then role check
- **IDOR prevention** — Ownership checks on all resource access
- **File upload 3-check** — Rate limit → magic byte detection → MIME + size validation
- **Search sanitization** — Prevents SQL injection in search queries
- **Wallet addresses** — Case-sensitive (Solana base58), never `.toLowerCase()`

### On-Chain Layer
- **Attestation validation** — Every deposit/redemption checks KYC attestation (not revoked, not expired)
- **Account freezing** — Per-investor compliance freeze
- **Vault pause** — Emergency stop (blocks approvals + draws, allows claims)
- **Liquidity checks** — Reserves pending deposits on redemption approval
- **Checked arithmetic** — No silent overflows in share/asset calculations
- **PDA bump storage** — Prevents bump collision attacks

---

## Deployment

| Component | Environment | URL |
|-----------|-------------|-----|
| Frontend | Staging | [staging.credit.markets](https://staging.credit.markets/) |
| Backend API | Staging | `api.staging.credit.markets` |
| Swagger Docs | Staging | `/api` endpoint |
| SVS-11 Program | Solana Devnet | [`Bf17gDR2JdKTWdoTWK3Va9YQtkpePRAAVxMCaokj8ZFW`](https://explorer.solana.com/address/Bf17gDR2JdKTWdoTWK3Va9YQtkpePRAAVxMCaokj8ZFW?cluster=devnet) |
| Database | Supabase | Hosted PostgreSQL + Storage |

### Health Checks

- `GET /health` — Full system report (DB, cache, storage, RPC, CPU/memory)
- `GET /health/live` — Liveness probe
- `GET /health/ready` — Readiness probe (DB available?)

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Smart Contracts | Rust + Anchor | 0.31.1 |
| Frontend | Next.js (App Router) | 15.0.7 |
| Backend | NestJS | 11.0.1 |
| Language | TypeScript | 5.7.x |
| Database | Supabase (PostgreSQL) | @supabase/supabase-js 2.98 |
| UI | Tailwind CSS + NextUI | 3.4 / 2.4 |
| State | TanStack Query | 5.59 |
| Forms | TanStack Form + Zod | 0.34 / 3.23 |
| Auth | Dynamic Labs SDK | 4.66 |
| Blockchain | Solana Web3.js + Anchor | 1.95 / 0.32 |
| Indexer | Helius Webhooks | — |
| Email | Resend | 4.1 |
| Testing | Vitest (FE) + Jest (BE) | 4.0 / 29.7 |
| Linting | Biome (FE) + ESLint (BE) | 1.9 / 9.18 |
