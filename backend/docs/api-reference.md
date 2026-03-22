# API Reference

## Overview

The Credit Markets backend API runs on port 3030 by default. Interactive documentation is available at:

- **Swagger UI**: http://localhost:3030/api
- **Base URL**: `http://localhost:3030` (development) / `https://api.credit.markets` (production)

All authenticated endpoints require `Authorization: Bearer <jwt>` header with a Dynamic Labs JWT.

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| -- | -- | Auth controller is a placeholder. Authentication is handled by Dynamic Labs on the frontend. The backend verifies JWTs via JWKS. |

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Simple health check (returns `{ status: "ok", timestamp }`) |
| GET | `/health/live` | None | Liveness probe (returns `{ status: "alive", uptime }`) |
| GET | `/health/ready` | None | Readiness probe -- checks DB connection (returns 200 or 503) |
| GET | `/health/detailed` | Admin | Comprehensive health check (Supabase, cache, storage, Solana RPC, CPU, memory) |
| GET | `/health/ping` | None | Returns `"pong"` (not in Swagger) |

---

## Users

All endpoints require JWT authentication unless noted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/all` | Admin | Get all users with pagination (query: `search`, `wallet`, `page`, `pageSize`, `sortBy`, `sortOrder`) |
| GET | `/users/me` | JWT | Get current authenticated user profile |
| GET | `/users/me/roles` | JWT | Get role flags: `{ isAdmin, isManager, isAttester, managedPoolIds }` |
| GET | `/users/:address` | JWT | Get user by wallet address (non-admins can only access own profile) |
| GET | `/users/id/:id` | Admin | Get user by database ID |
| POST | `/users` | JWT | Create new user (body: `CreateUserDto`, sets auth cookie) |
| PATCH | `/users/:id` | JWT | Update user (body: `UpdateUserDto`, non-admins can only update own profile) |

---

## Pools

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pools` | None | Get all pools with pagination and filtering (query: `page`, `pageSize`, `sortBy`, `sortOrder`, `status`, `includeAll`) |
| GET | `/pools/manager` | JWT | Get pools managed by authenticated user (query: `type`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`) |
| GET | `/pools/by-id/:id` | None | Get pool by database ID (with enhanced data) |
| GET | `/pools/by-address/:address` | None | Get pool by blockchain address |
| GET | `/pools/by-address/:address/id` | None | Get pool database ID by blockchain address |
| PATCH | `/pools/by-id/:id` | Admin | Update pool fields |
| DELETE | `/pools/:poolId` | Admin | Delete pool (blocks deletion of deployed pools) |

### Admin Pool Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pools/admin/pipeline-keys` | Admin | List available (not deployed) pipeline keys |
| GET | `/pools/admin/all` | Admin | List all pools with on-chain data (query: `pool_type`, `deployed`) |
| POST | `/pools/admin/activate` | Admin | Activate pool from pipeline key (body: `ActivatePoolDto`) |
| GET | `/pools/admin/redemption-requests` | Admin | Get pending redemption requests cross-pool (query: `poolId`) |
| PATCH | `/pools/:id/visibility` | Admin | Toggle pool marketplace visibility (body: `{ is_visible }`) |

### Pool Transaction Builders (return unsigned Solana transactions)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pools/:id/deploy/build-tx` | Admin | Build `initialize_pool` transaction |
| POST | `/pools/:id/open-window/build-tx` | PoolManager | Build `open_investment_window` transaction |
| POST | `/pools/:id/close-window/build-tx` | PoolManager | Build `close_investment_window` transaction |
| POST | `/pools/:id/update-attester/build-tx` | Admin | Build `update_attester` transaction (body: `UpdateAttesterDto`) |

### Investment Flow

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pools/:id/invest/build-tx` | JWT | Build `request_deposit` transaction (body: `{ amount }`) |
| POST | `/pools/:id/invest/cancel/build-tx` | JWT | Build `cancel_deposit` transaction |
| POST | `/pools/:id/invest/claim/build-tx` | JWT | Build `claim_deposit` transaction |
| POST | `/pools/:id/invest/approve/build-tx` | PoolManager | Build `approve_deposit` transaction (body: `{ investorAddress }`) |
| POST | `/pools/:id/invest/reject/build-tx` | PoolManager | Build `reject_deposit` transaction (body: `{ investorAddress, reasonCode }`) |

### Redemption Flow

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pools/:id/redeem/build-tx` | JWT | Build `request_redeem` transaction (body: `{ shares }`) |
| POST | `/pools/:id/redeem/approve/build-tx` | PoolManager | Build `approve_redeem` transaction (body: `{ investorAddress }`) |
| POST | `/pools/:id/redeem/cancel/build-tx` | JWT | Build `cancel_redeem` transaction |
| POST | `/pools/:id/redeem/claim/build-tx` | JWT | Build `claim_redemption` transaction |

### Manager Operations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pools/:id/draw-down/build-tx` | PoolManager | Build `draw_down` transaction (body: `{ amount }`) |
| POST | `/pools/:id/repay/build-tx` | PoolManager | Build `repay` transaction (body: `{ amount }`) |

### Pool Data

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pools/:id/transactions` | PoolManager | Get pool transaction history (query: `page`, `size`, `type`) |
| GET | `/pools/:id/nav-history` | JWT | Get NAV price history (query: `from`, `to`, `limit`) |
| GET | `/pools/:id/investor/balance-states` | JWT | Get investor balance states (free shares, locked shares, claimable USDC, wallet USDC) |
| GET | `/pools/:id/investment-requests` | PoolManager | Get investment requests (query: `status`) |
| GET | `/pools/:id/redemption-requests` | PoolManager | Get redemption requests (query: `status`) |

---

## Managers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/managers` | JWT | Create manager profile (body: `CreateManagerDto`) |
| GET | `/managers/profile` | JWT | Get authenticated user's manager profile |
| GET | `/managers` | Admin | Get all managers with pagination (query: `ManagerFilterDto`) |
| GET | `/managers/address/:address` | JWT | Get manager by owner wallet address |
| GET | `/managers/:id` | JWT | Get manager by ID |
| PATCH | `/managers/:id` | JWT | Update manager profile (body: `UpdateManagerDto`) |
| DELETE | `/managers/:id` | JWT | Delete own manager profile |
| POST | `/managers/admin/register` | Admin | Register manager by wallet address (body: `{ wallet_address }`) |
| DELETE | `/managers/admin/:id` | Admin | Remove manager (admin) |

---

## Portfolio

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/portfolio/summary` | JWT | Portfolio summary with analytics (positions, allocation, risk metrics) |
| GET | `/portfolio/transactions` | JWT | Paginated transaction history (query: `page`, `size`) |
| GET | `/portfolio/investment-requests` | JWT | Pending investment requests for authenticated user |
| GET | `/portfolio/redemption-requests` | JWT | Pending redemption requests for authenticated user |

---

## Marketplace

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/marketplace/tvl` | None (public) | Get Total Value Locked (TVL) day data |

---

## KYB (Know Your Business)

### Investor Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/kyb` | JWT | Create KYB draft submission |
| GET | `/kyb/me` | JWT | Get my KYB submission |
| PATCH | `/kyb/:id` | JWT + Owner | Update submission (step-by-step save, body: `UpdateKybDto`) |
| POST | `/kyb/:id/submit` | JWT + Owner | Submit for review |

### UBO Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/kyb/:id/ubos` | JWT + Owner | Add UBO (body: `AddUboDto`) |
| PATCH | `/kyb/:id/ubos/:uboId` | JWT + Owner | Update UBO (body: `UpdateUboDto`) |
| DELETE | `/kyb/:id/ubos/:uboId` | JWT + Owner | Delete UBO |

### Document Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/kyb/:id/documents` | JWT + Owner + RateLimit | Upload document (multipart: `file`, `category`, optional `ubo_id`) |
| DELETE | `/kyb/:id/documents/:docId` | JWT + Owner | Delete document |

### Wallet Declarations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/kyb/:id/wallets` | JWT + Owner | Add wallet declaration (body: `AddWalletDto`) |
| DELETE | `/kyb/:id/wallets/:walletId` | JWT + Owner | Delete wallet declaration |

### Attester Review Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/kyb/queue` | Attester | Get submissions queue (query: `status`, `page`, `pageSize`) |
| GET | `/kyb/:id/review` | Attester | Get full submission for review |
| PATCH | `/kyb/:id/review` | Attester | Update review (risk scoring, notes; body: `ReviewKybDto`) |
| POST | `/kyb/:id/approve` | Attester | Approve and build attestation transaction |
| POST | `/kyb/:id/reject` | Attester | Reject submission (body: `{ rejection_reason }`) |
| POST | `/kyb/:id/request-resubmission` | Attester | Request resubmission with checklist (body: `{ resubmission_items }`) |
| POST | `/kyb/:id/revoke` | Attester | Revoke attestation and build revoke transaction |
| PATCH | `/kyb/:id/attestation-tx` | Attester | Confirm attestation transaction signature (body: `{ attestation_tx }`) |
| GET | `/kyb/:id/documents/:docId/preview` | Attester | Get signed document preview URL |
| GET | `/kyb/:id/documents/:docId/download` | Attester | Get signed document download URL |

---

## Files

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/files/upload` | JWT + RateLimit | Upload file (multipart: `file`, `fileType`, `subType`) |
| GET | `/files/url` | JWT | Get signed URL for file access (query: `path`, optional `expires` in hours) |

---

## Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events/admin` | Admin | List all execution events, paginated |
| GET | `/events/:targetType/:targetId` | JWT | Get events for target entity (targetType: pool, fund, investment, withdrawal) |

---

## Risk

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/risk/definitions` | None | Get risk metric definitions (for UI tooltips) |
| GET | `/risk/:pipelineKey/score` | JWT | Get risk score for a pool |
| GET | `/risk/:pipelineKey/monthly` | JWT | Get monthly risk time series (query: `limit`, max 120) |

---

## Nota Fiscal Items

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/nota-fiscal-items/pool/:poolId` | JWT | Get NF items for pool, paginated (query: `status`, `page`, `pageSize`) |
| GET | `/nota-fiscal-items/pool/:poolId/aggregates` | JWT | Get aggregate statistics |
| GET | `/nota-fiscal-items/:id` | JWT | Get single NF item |

---

## Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks/helius` | Bearer secret | Helius on-chain event webhook (timing-safe auth) |

---

## Auth Legend

| Label | Meaning |
|-------|---------|
| None | No authentication required |
| JWT | Requires `Authorization: Bearer <jwt>` |
| Admin | JWT + AdminGuard (wallet === AUTHORITY) |
| PoolManager | JWT + PoolManagerGuard (wallet === pool.manager_address) |
| Attester | JWT + AttesterGuard (wallet is attester on any pool) |
| Owner | JWT + KybOwnerGuard (user owns the KYB submission) |
| RateLimit | FileUploadRateLimitGuard (10 uploads/minute) |
| Bearer secret | `Authorization: Bearer <HELIUS_WEBHOOK_SECRET>` |

---

## Pagination

Paginated endpoints accept these query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number |
| `pageSize` | 10 | Items per page |
| `sortBy` | varies | Sort field |
| `sortOrder` | `descending` | `ascending` or `descending` |

Response format:

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

---

## Error Responses

Standard NestJS error format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request -- invalid input |
| 401 | Unauthorized -- missing or invalid JWT |
| 403 | Forbidden -- insufficient permissions |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate attestation PDA) |
| 429 | Too Many Requests -- rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable -- readiness check failed |
