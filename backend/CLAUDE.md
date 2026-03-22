# CLAUDE.md

Credit Markets backend API -- NestJS 11 + Supabase (PostgreSQL) + Solana Web3.js/Anchor blockchain integration for institutional DeFi credit facilitation.

**Frontend**: Sibling `app/` directory (types must stay in sync)

---

## Commands

```bash
pnpm dev            # Start dev server with hot reload (port 3030)
pnpm build          # Production build (nest build -> dist/)
pnpm start:prod     # Run production build
pnpm test           # Run unit tests (Jest)
pnpm test:watch     # Tests in watch mode
pnpm test:cov       # Tests with coverage report
pnpm lint           # ESLint check and fix
pnpm validate       # lint + test (pre-commit check)
pnpm validate:ci    # lint + test:cov (CI pipeline)
```

**Swagger UI**: http://localhost:3030/api

---

## Module Map

```
src/
├── app.module.ts          # Root module -- registers all modules, JwtMiddleware, ThrottlerGuard
├── main.ts                # Bootstrap -- Helmet, CORS, ValidationPipe, Swagger, cookie-parser
│
├── auth/                  # Authentication & authorization
│   ├── auth.controller.ts          # Empty controller (tag placeholder)
│   ├── auth.module.ts              # Exports all guards + middleware + JWKS service
│   ├── middleware/
│   │   └── jwt.middleware.ts       # Extracts & verifies JWT, attaches userCredentials to request
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # CanActivate -- verifies JWT, resolves wallet from DB/Dynamic API
│   │   ├── admin.guard.ts          # Checks wallet === AUTHORITY env var
│   │   ├── pool-manager.guard.ts   # Checks wallet === pool.manager_address (needs :id or :poolId param)
│   │   └── attester.guard.ts       # Checks wallet is attester_address on any pool (cached 60s)
│   └── services/
│       ├── jwks-verification.service.ts  # RS256 JWKS verification via Dynamic Labs
│       ├── auth-guard.service.ts         # Resolves wallet credentials from DB or Dynamic API
│       └── auth-validation.service.ts    # Email/OTP format validation
│
├── blockchain/            # Solana on-chain integration
│   ├── solana.module.ts            # Global module -- exports SolanaService, HeliusWebhookService, PoolOnChainService
│   ├── solana.service.ts           # Connection, Anchor programs (SVS-11, Oracle, SAS), PDA derivation, account reads
│   ├── solana-config/
│   │   ├── index.ts                # SOLANA_CONFIG constants (program IDs, seeds, mints, decimals)
│   │   └── idl/                    # Anchor IDL files for SVS-11, Mock Oracle, Mock SAS
│   ├── helius-webhook.controller.ts # POST /webhooks/helius -- timing-safe secret auth
│   └── helius-webhook.service.ts    # Processes on-chain events, syncs pool state, writes TVL snapshots
│
├── common/                # Shared utilities (Global module)
│   ├── common.module.ts            # Provides STORAGE_SERVICE factory, USER_LOOKUP_SERVICE, re-exports AuthModule
│   ├── config/
│   │   ├── file-upload.config.ts   # Multer options
│   │   └── throttler.config.ts     # Rate limit config (100 req/min default, 10 uploads/5min)
│   ├── constants/
│   │   ├── file-types.constants.ts          # FILE_TYPES, FILE_SUB_TYPES, valid lists
│   │   ├── file-validation.constants.ts     # Size limits, MIME types, path patterns, URL expiration
│   │   ├── wallet.constants.ts              # DEFAULT_CHAIN, WALLET_NAMES, WALLET_PROVIDERS
│   │   └── index.ts
│   ├── decorators/
│   │   ├── authenticated-user.decorator.ts  # @AuthenticatedUser() -> { account, userCredentials }
│   │   └── public.decorator.ts              # @Public() -- skips JwtAuthGuard
│   ├── dto/
│   │   ├── query-filter.dto.ts     # QueryFilterDto, PaginatedResult<T>
│   │   └── nav-history-query.dto.ts
│   ├── guards/
│   │   └── file-upload-rate-limit.guard.ts  # Per-user upload rate limiter (10/min)
│   ├── interfaces/
│   │   ├── storage.interface.ts    # IStorageService (upload, delete, get, signedUrl, fileExists)
│   │   └── user-lookup.interface.ts
│   ├── services/
│   │   ├── supabase-storage.service.ts  # IStorageService for Supabase Storage (production)
│   │   ├── local-storage.service.ts     # IStorageService for local filesystem (development)
│   │   ├── user-auth.service.ts         # Auth-related user lookups (by address, provider ID, email)
│   │   └── user-query.service.ts        # Paginated user queries, search, filtering
│   ├── types/
│   │   ├── jwt.types.ts            # JWTCredential interface, Express request augmentation
│   │   ├── multer.types.ts         # MulterFile type alias
│   │   └── query.types.ts          # QueryFilter type
│   └── utils/
│       ├── error.util.ts           # logError(), getErrorMessage()
│       ├── token-extraction.util.ts # extractToken() from Authorization header
│       ├── file-validation.util.ts  # validateFile(), sanitizeFilename()
│       ├── file-security.util.ts    # performSecurityValidation() -- magic bytes, double extension
│       ├── file-path.util.ts        # generateFilePath(), validateFilePath()
│       ├── search-sanitize.util.ts  # sanitizeSearchTerm() for DB queries
│       ├── pagination.util.ts       # Pagination helpers
│       └── index.ts                 # Re-exports logError, getErrorMessage, extractToken
│
├── config/                # Global configuration
│   └── config.module.ts            # NestConfigModule.forRoot({ isGlobal: true })
│   └── swagger.config.ts           # Swagger DocumentBuilder, custom CSS/options
│
├── database/              # Supabase client
│   ├── supabase.module.ts          # Global module -- provides SupabaseService
│   ├── supabase.service.ts         # Creates typed SupabaseClient<Database>
│   └── database.types.ts           # Auto-generated Supabase types (Tables, Enums, Functions)
│
├── email/                 # Email service
│   ├── email.module.ts
│   └── email.service.ts            # Resend SDK -- sendOtpEmail() with HTML template
│
├── events/                # Execution event audit log
│   ├── events.module.ts
│   ├── events.controller.ts        # GET /events/admin (admin), GET /events/:targetType/:targetId
│   └── events.service.ts           # emit(), findAllPaginated(), findByTarget()
│
├── file-uploads/          # File upload management
│   ├── file-uploads.module.ts
│   └── file-uploads.controller.ts  # POST /files/upload, GET /files/url
│
├── health/                # Health checks
│   ├── health.module.ts
│   ├── health.controller.ts        # GET /health, /health/live, /health/ready, /health/detailed, /health/ping
│   └── health.service.ts           # Checks: Supabase, cache, storage, Solana RPC, CPU/memory
│
├── kyb/                   # Know Your Business verification
│   ├── kyb.module.ts
│   ├── kyb.controller.ts           # Full KYB workflow (draft, submit, UBOs, docs, wallets, review, approve/reject)
│   ├── guards/
│   │   └── kyb-owner.guard.ts      # Ensures user owns the KYB submission
│   ├── dto/                        # UpdateKybDto, AddUboDto, UpdateUboDto, AddWalletDto, ReviewKybDto, etc.
│   └── services/
│       ├── kyb-crud.service.ts     # CRUD for submissions, UBOs, documents, wallets
│       ├── kyb-workflow.service.ts # State machine: submit, approve, reject, requestResubmission, revoke
│       └── kyb-onchain.service.ts  # Build attestation/revoke transactions (Mock SAS program)
│
├── managers/              # Credit manager profiles
│   ├── managers.module.ts
│   ├── managers.controller.ts      # CRUD + admin endpoints (register, remove)
│   ├── managers.service.ts         # Orchestrator
│   ├── dto/                        # CreateManagerDto, UpdateManagerDto, ManagerDto, ManagerFilterDto, RegisterManagerDto
│   └── services/
│       ├── manager-crud.service.ts       # Database CRUD
│       └── manager-permission.service.ts # Ownership verification
│
├── marketplace/           # Public marketplace data
│   ├── marketplace.module.ts
│   ├── marketplace.controller.ts   # GET /marketplace/tvl (public, no auth)
│   └── marketplace.service.ts      # TVL calculations from tvl_snapshots + on-chain data
│
├── nota-fiscal-items/     # Brazilian nota fiscal (invoice) items for TIDC pools
│   ├── nota-fiscal-items.module.ts
│   ├── nota-fiscal-items.controller.ts  # GET /nota-fiscal-items/pool/:poolId, aggregates, :id
│   └── nota-fiscal-items.service.ts     # Query NF items with pagination, aggregates
│
├── pools/                 # Core pool management
│   ├── pools.module.ts
│   ├── pools.controller.ts         # Extensive -- CRUD, admin, deploy, invest, redeem, draw-down, repay, NAV
│   ├── pools.service.ts            # Orchestrator for pool operations
│   ├── dto/                        # UpdatePoolDto, ActivatePoolDto, pool-transaction DTOs, UpdatePoolVisibilityDto
│   └── services/
│       ├── pool-crud.service.ts        # Database CRUD, findAll, pagination, pipeline keys
│       ├── pool-deployment.service.ts  # Builds unsigned Solana transactions for all pool operations
│       └── pool-onchain.service.ts     # Reads on-chain vault state, investor balances, NAV oracle
│
├── portfolio/             # Investor portfolio tracking
│   ├── portfolio.module.ts
│   ├── portfolio.controller.ts     # GET /portfolio/summary, transactions, investment-requests, redemption-requests
│   └── portfolio.service.ts        # Aggregates positions across pools, on-chain balance reads
│
├── risk/                  # Risk assessment
│   ├── risk.module.ts
│   ├── risk.controller.ts          # GET /risk/definitions (public), :pipelineKey/score, :pipelineKey/monthly
│   ├── risk.service.ts             # Risk scores and monthly data (dispatches to FIDC/TIDC tables)
│   ├── risk-alerts.service.ts      # Deterioration alerts from risk scores
│   └── risk-definitions.ts         # Static metric definitions for UI tooltips
│
├── types/                 # Shared TypeScript types
│   └── express.d.ts                # Express Request augmentation (userCredentials, token)
│
└── users/                 # User management
    ├── users.module.ts
    ├── users.controller.ts         # CRUD, roles, admin endpoints
    ├── users.service.ts            # Orchestrator
    ├── dto/                        # CreateUserDto, UpdateUserDto, UserFilterDto
    ├── schemas/
    │   └── user.schema.ts          # UserDocument type
    └── services/
        ├── user-crud.service.ts    # Database operations
        ├── user-dynamic.service.ts # Dynamic Labs API interactions
        └── user-kyc.service.ts     # KYC status management
```

---

## Authentication Architecture

### Flow

```
Frontend (Dynamic Labs SDK)
  └── User connects wallet (MetaMask/Google OAuth)
       └── Dynamic Labs issues JWT (RS256, kid in header)
            └── Backend receives: Authorization: Bearer <jwt>
                 ├── JwtMiddleware (applied to specific routes)
                 │    └── Extracts token, verifies via JWKS, attaches to req.userCredentials
                 └── JwtAuthGuard (applied per-endpoint)
                      ├── Reuses middleware payload if available (avoids double RSA)
                      ├── If verified_credentials missing from JWT:
                      │    ├── 1. Look up user in local DB by provider_id
                      │    └── 2. Fallback: fetch from Dynamic Labs API (for new users)
                      └── Attaches wallet address to request
```

### Middleware vs Guards

- **JwtMiddleware**: Applied via `app.module.ts` `configure()` to specific route patterns (`users/profile`, `users/me`, `marketplace/*`, `portfolio/*`, `managers/*`, `kyb/*`). Runs BEFORE guards.
- **JwtAuthGuard**: Applied per-endpoint with `@UseGuards(JwtAuthGuard)`. Can be used independently when middleware is not applied to that route.
- **Excluded routes**: `auth/(.*)`, `users/public`, `marketplace/tvl` -- no middleware.

### Guard Hierarchy

```typescript
// CORRECT order:
@UseGuards(JwtAuthGuard, AdminGuard)       // Admin endpoints
@UseGuards(JwtAuthGuard, PoolManagerGuard) // Pool manager endpoints (needs :id or :poolId param)
@UseGuards(JwtAuthGuard, AttesterGuard)    // Attester/KYB endpoints

// WRONG (role guard before auth):
@UseGuards(AdminGuard, JwtAuthGuard)
```

### Guard Details

| Guard | Checks | Caching |
|-------|--------|---------|
| `JwtAuthGuard` | JWT validity, resolves wallet address | Reuses middleware payload |
| `AdminGuard` | `wallet === AUTHORITY` env var | None (simple comparison) |
| `PoolManagerGuard` | `wallet === pool.manager_address` for given `:id`/`:poolId` | None (DB query each time) |
| `AttesterGuard` | `wallet` is `attester_address` on any pool | In-memory cache, 60s TTL, max 1000 entries |

### Custom Decorator

```typescript
@AuthenticatedUser() { account, userCredentials }: ExtractedUserCredentials
// account: string (Solana wallet address)
// userCredentials: full JWT payload with verified_credentials
```

---

## Database Patterns (Supabase)

### Client Access

```typescript
// Service role client (bypasses RLS) -- used by all backend services
const supabase = this.supabaseService.getClient();

// Typed queries
const { data, error } = await supabase
  .from('pools')
  .select('*')
  .eq('id', poolId)
  .single();
```

### Type Safety

Types are auto-generated in `src/database/database.types.ts` from the Supabase schema. Services reference row types:

```typescript
import { Database } from '../../database/database.types';
type PoolRow = Database['public']['Tables']['pools']['Row'];
```

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles (account, provider_id, type, investor_classification) |
| `user_roles` | Role assignments (one-to-one with users) |
| `managers` | Credit manager profiles (company_name, owner_address, logo_path) |
| `pools` | Credit pools (title, status, on_chain_address, vault_id, manager/authority/attester addresses) |
| `pool_investment_windows` | Investment window tracking (open/close, counts, totals) |
| `pool_responsibilities` | Actor-pool role assignments |
| `nota_fiscal_items` | Brazilian invoice receivables (cedente, sacado, valor_nominal, status) |
| `nav_price_history` | NAV price snapshots per pool |
| `tvl_snapshots` | TVL data points per pool |
| `execution_events` | Audit log (event_type, actor, target, payload, chain_tx_id) |
| `actors` | System actors (wallets, services) |
| `tokens` | Token registry (address, symbol, decimals) |
| `otps` | OTP codes for email verification |
| `kyb_submissions` | KYB applications (status, business details, risk score) |
| `kyb_documents` | KYB uploaded documents |
| `kyb_ubos` | Ultimate Beneficial Owners |
| `kyb_wallet_declarations` | Declared wallet addresses for KYB |
| `risk_fidc_scores` | FIDC fund risk scores |
| `risk_fidc_monthly` | FIDC monthly risk time series |
| `risk_tidc_scores` | TIDC fund risk scores |
| `risk_tidc_monthly` | TIDC monthly risk time series |

### Database Functions (RPC)

| Function | Purpose |
|----------|---------|
| `get_current_tvl()` | Returns total TVL across all pools |
| `get_daily_tvl()` | Returns daily TVL series |
| `open_investment_window(p_pool_id)` | Opens a new investment window |
| `increment_window_requested(p_pool_id, p_amount)` | Increments window request counters |
| `increment_window_approved(p_pool_id, p_amount)` | Increments window approval counters |
| `increment_window_rejected(p_pool_id, p_amount)` | Increments window rejection counters |

### Enums

| Enum | Values |
|------|--------|
| `kyb_status` | draft, submitted, under_review, approved, resubmission_requested, rejected, revoked |
| `kyb_document_category` | certificate_of_incorporation, proof_of_address, register_of_directors, register_of_shareholders, ubo_id_document, financial_statements, regulatory_license, source_of_funds_evidence, authority_evidence, sanctions_screening_evidence, wallet_screening_evidence, other |

---

## Blockchain Integration

### Programs

| Program | ID | Purpose |
|---------|----|---------|
| SVS-11 (CreditVault) | `Bf17gDR2JdKTWdoTWK3Va9YQtkpePRAAVxMCaokj8ZFW` | Pool vaults, investments, redemptions |
| Mock Oracle | `EbFcZZApkGcX6LqRmzSWVLasnDM457wY4WvhJRnVjdZF` | NAV price oracle |
| Mock SAS | `4azCqYgLHDRmsiR6kmYu6v5qvzamaYGqZcmx8MrnrKMc` | KYB attestation |

### PDA Seeds (must match on-chain)

| Account | Seeds |
|---------|-------|
| CreditVault | `["credit_vault", asset_mint, vault_id_le_bytes]` |
| SharesMint | `["shares", vault_pda]` |
| DepositVault | `["deposit_vault", vault_pda]` |
| InvestmentRequest | `["investment_request", vault_pda, investor]` |
| RedemptionRequest | `["redemption_request", vault_pda, investor]` |
| RedemptionEscrow | `["redemption_escrow", vault_pda]` |
| FrozenAccount | `["frozen_account", vault_pda, investor]` |
| Attestation | `["attestation", subject, issuer, [attestation_type]]` |

### Transaction Building Pattern

The backend builds **unsigned transactions** that the frontend signs with the user's wallet:

```typescript
// Pool deployment service builds the instruction, serializes as base64
const { transaction, message } = await this.poolDeploymentService.buildInitializePoolTx({...});
// Frontend receives, signs, submits to Solana
```

### Helius Webhooks

`POST /webhooks/helius` receives on-chain events. Authentication uses timing-safe comparison of `Authorization: Bearer <secret>` header. The service processes:
- Pool state changes (deposits, redemptions, window opens/closes)
- NAV oracle updates -> `nav_price_history` snapshots
- TVL changes -> `tvl_snapshots`

---

## Architecture Rules (Do Not Break)

### 1. Service Decomposition

Never create monolithic services. Use orchestrator + specialized services:

```
pools/
├── pools.service.ts              # Orchestrator (coordinates)
├── services/
│   ├── pool-crud.service.ts      # Database operations
│   ├── pool-deployment.service.ts # Blockchain tx building
│   └── pool-onchain.service.ts   # On-chain reads
```

Keep specialized services under ~200 lines.

### 2. Authentication: JWKS Only

Never use shared JWT secrets:

```typescript
// WRONG: jwt.verify(token, process.env.JWT_KEY)
// RIGHT: await this.jwksVerificationService.verifyToken(token)
```

### 3. File Upload Security (3 Checks Required)

All uploads must have in order:

1. `@UseGuards(FileUploadRateLimitGuard)` -- rate limiting
2. `performSecurityValidation(file)` -- magic bytes, double extension detection
3. `validateFile(file, { allowedMimeTypes, maxFileSize })` -- MIME + size check
4. `sanitizeFilename(file.originalname)` -- path traversal prevention (KYB uploads)

### 4. Environment-Aware Storage

Storage is swapped via the `STORAGE_SERVICE` factory in `CommonModule`:
- **Production:** `SupabaseStorageService` (Supabase Storage bucket)
- **Development:** `LocalStorageService` (local `uploads/` directory)

All consumers inject `@Inject('STORAGE_SERVICE')` and code against `IStorageService` -- never reference a concrete implementation directly.

### 5. Guard Order Matters

```typescript
// CORRECT:
@UseGuards(JwtAuthGuard, AdminGuard)       // Admin endpoints
@UseGuards(JwtAuthGuard, PoolManagerGuard) // Pool manager endpoints (needs :id or :poolId param)
@UseGuards(JwtAuthGuard, AttesterGuard)    // Attester/KYB endpoints

// WRONG (role guard before auth):
@UseGuards(AdminGuard, JwtAuthGuard)
```

### 6. Frontend Type Sync

When changing backend schemas, update frontend types:

| Backend Schema | Frontend Type |
|----------------|---------------|
| `src/pools/schemas/pool.schema.ts` | `app/src/types/pools.ts` |
| `src/users/schemas/user.schema.ts` | `app/src/types/users.ts` |
| `src/managers/schemas/manager.schema.ts` | `app/src/types/manager.ts` |

### 7. Swagger Required

Every controller endpoint needs:

```typescript
@ApiOperation({ summary: 'Create pool' })
@ApiResponse({ status: 201, description: 'Pool created' })
```

### 8. ConfigService Over process.env

```typescript
// WRONG: const url = process.env.SUPABASE_URL
// RIGHT: const url = this.configService.getOrThrow<string>('SUPABASE_URL')
```

---

## Code Conventions

### Error Handling

Use consolidated utilities:

```typescript
import { logError, getErrorMessage } from '../common/utils';

logError(this.logger, 'Failed to create pool', error, { poolId });
```

### Wallet & Program Addresses

Solana base58 addresses are **case-sensitive** -- NEVER use `.toLowerCase()`:

```typescript
// WRONG (corrupts base58): wallet.toLowerCase()
// RIGHT: use the address as-is
wallet: wallet
```

Program addresses are centralized in `src/blockchain/solana-config/index.ts` (SOLANA_CONFIG).
Do not use env vars for program IDs -- update the constants file instead.

### Pagination

Use centralized `PaginatedResult`:

```typescript
import { PaginatedResult } from '../common/dto/query-filter.dto';
return new PaginatedResult(pools, total, page, pageSize);
```

### Database Sort Column Validation

Prevent SQL injection through sort parameters:

```typescript
const ALLOWED_SORT_COLUMNS = new Set(['created_at', 'updated_at', 'account']);
const safeSort = ALLOWED_SORT_COLUMNS.has(sortBy) ? sortBy : 'created_at';
```

---

## Common Utilities

Import from `src/common/utils`:

```typescript
import { logError, getErrorMessage, extractToken } from '../common/utils';
import { PaginatedResult } from '../common/dto/query-filter.dto';
```

| Utility | Purpose |
|---------|---------|
| `logError(logger, msg, error, context?)` | Structured error logging |
| `getErrorMessage(error)` | Safe error message extraction |
| `extractToken(request)` | JWT from Authorization header |
| `PaginatedResult` | Standardized pagination response |
| `validateFile(file, opts)` | MIME type + size validation |
| `performSecurityValidation(file)` | Magic bytes + double extension check |
| `sanitizeFilename(name)` | Remove path traversal characters |
| `sanitizeSearchTerm(term)` | Escape special characters for DB search |
| `generateFilePath(address, type, subType, file)` | Create storage path |
| `validateFilePath(path)` | Validate path format against patterns |

---

## Rate Limiting

Global rate limiter via `@nestjs/throttler` (applied as APP_GUARD):

| Scope | Window | Limit |
|-------|--------|-------|
| Default (all endpoints) | 1 minute | 100 requests |
| File uploads | 1 minute | 10 uploads per user |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS) |
| `SOLANA_RPC_URL` | Yes (prod) | Solana RPC endpoint (falls back to devnet in dev) |
| `SOLANA_OPERATOR_PK` | Yes | Operator keypair as JSON array (signs backend txs) |
| `DYNAMIC_ENVIRONMENT_ID` | Yes | Dynamic Labs environment ID (must match frontend) |
| `DYNAMIC_TOKEN` | Yes | Dynamic Labs API token (for wallet lookups) |
| `DYNAMIC_API` | Yes | Dynamic Labs API URL (https://app.dynamic.xyz/api/v0) |
| `RESEND_API_KEY` | Yes | Resend email service API key |
| `EMAIL_SENDER` | Yes | Email sender address |
| `AUTHORITY` | Yes | Platform authority Solana address (admin wallet) |
| `ATTESTER` | Yes | Platform attester Solana address |
| `HELIUS_WEBHOOK_SECRET` | Yes | Helius webhook authentication secret |
| `SUPABASE_STORAGE_BUCKET` | No | Supabase Storage bucket name (default: `files`) |
| `PORT` | No | Server port (default: `3030`) |
| `NODE_ENV` | No | Environment: development, staging, production (default: `development`) |
| `SWAGGER_PRODUCTION_URL` | No | Production API URL for Swagger |
| `SWAGGER_STAGING_URL` | No | Staging API URL for Swagger |
| `SWAGGER_LOCAL_URL` | No | Local dev URL for Swagger |

---

## Testing Patterns

- Test framework: Jest with ts-jest
- Test files: `*.spec.ts` co-located with source
- 31 spec files across guards, services, controllers, and utilities
- Mock external services (Supabase, Solana, Dynamic Labs, Resend)
- Use `@nestjs/testing` `Test.createTestingModule()` for DI

```bash
pnpm test           # All tests
pnpm test:cov       # Coverage report in ./coverage/
```

---

## Gotchas

1. **Guard order**: JwtAuthGuard must come before role guards (AdminGuard, PoolManagerGuard, AttesterGuard)
2. **Wallet casing**: Solana base58 addresses are case-sensitive -- never lowercase them
3. **Circular deps**: Use `forwardRef(() => Module)` when needed
4. **Async controllers**: Always use async even if service isn't (allows future changes)
5. **PoolManagerGuard requires pool ID**: Must have `:id` or `:poolId` in route params
6. **AttesterGuard caches**: Results cached 60s -- clear cache if attester role changes mid-session
7. **Helius webhook auth**: Uses timing-safe comparison -- do not use `===` for secret comparison
8. **Database types**: `database.types.ts` is auto-generated -- regenerate after schema changes, do not edit manually
9. **STORAGE_SERVICE injection**: Always inject with `@Inject('STORAGE_SERVICE')`, never import concrete class directly
10. **Middleware excludes**: `auth/(.*)`, `users/public`, `marketplace/tvl` skip JwtMiddleware but may still need JwtAuthGuard

---

## How to Work Safely

```bash
# Before committing:
pnpm lint && pnpm test
```

- Read code before modifying
- Check Swagger UI after API changes
- Update frontend types when schemas change
- Regenerate `database.types.ts` after Supabase schema changes

---

## Deeper Docs

- `docs/security.md` -- Security architecture, auth flow, guard details, file upload security
- `docs/testing.md` -- Testing guidelines, coverage goals, mocking patterns
- `docs/deployment.md` -- Production deployment guide, Docker, health checks
- `docs/api-reference.md` -- Complete API endpoint reference
- `docs/database.md` -- Database schema, Supabase patterns, type generation
