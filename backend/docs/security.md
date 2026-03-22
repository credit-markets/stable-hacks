# Security Documentation

## Overview

Credit Markets is an institutional investment platform handling financial transactions on Solana. Security is enforced at multiple layers: network (CORS, Helmet, rate limiting), authentication (Dynamic Labs JWKS), authorization (role-based guards), input validation (DTOs + class-validator), file upload security, and database access controls.

---

## Authentication

### Dynamic Labs JWKS Flow

```
User connects wallet via Dynamic Labs (frontend)
  -> Dynamic Labs issues RS256 JWT with kid header
    -> Frontend sends: Authorization: Bearer <jwt>
      -> Backend JwtMiddleware extracts and verifies token
        -> JwksVerificationService fetches public key from Dynamic Labs JWKS endpoint
          -> jwt.verify(token, publicKey, { algorithms: ['RS256'] })
            -> Decoded payload attached to req.userCredentials
```

**Key properties:**
- No shared secrets between frontend and backend
- RS256 asymmetric signing (public key verification only)
- JWKS keys cached for 10 minutes, rate-limited
- Token expiration strictly enforced (`ignoreExpiration: false`)
- MFA scope check: tokens with `requiresAdditionalAuth` scope are rejected

### JWKS Endpoint

```
https://app.dynamic.xyz/api/v0/sdk/{DYNAMIC_ENVIRONMENT_ID}/.well-known/jwks
```

### Token Resolution

When the JWT payload lacks `verified_credentials` (e.g., Dynamic SDK v4+ minimal tokens):

1. **Local DB lookup**: Query `users` table by `provider_id` (JWT `sub` claim)
2. **Dynamic API fallback**: Call `GET /environments/{envId}/users/{userId}/wallets` with `DYNAMIC_TOKEN`
3. **Cache**: Dynamic API results cached 60 seconds per user

### Security Headers

Helmet is configured with:
- Content Security Policy (CSP) with restricted directives
- Cross-Origin Resource Policy: `cross-origin` (allows Swagger UI)
- Cross-Origin Embedder Policy: disabled (for Swagger)
- All other Helmet defaults enabled (X-Frame-Options, HSTS, etc.)

---

## Authorization

### Guard Architecture

Guards are NestJS `CanActivate` implementations. They run AFTER middleware, BEFORE the route handler.

| Guard | Purpose | How It Works |
|-------|---------|--------------|
| `JwtAuthGuard` | Verify authentication | Validates JWT, resolves wallet address, attaches to request |
| `AdminGuard` | Admin-only access | Compares `wallet === AUTHORITY` environment variable |
| `PoolManagerGuard` | Pool manager access | Queries DB: `pool.manager_address === wallet` for given `:id`/`:poolId` |
| `AttesterGuard` | KYB attester access | Queries DB: any pool with `attester_address === wallet` (cached 60s) |
| `KybOwnerGuard` | KYB submission owner | Ensures the authenticated user owns the KYB submission |
| `FileUploadRateLimitGuard` | Upload rate limiting | Per-user rate limit (10 uploads/minute) |

### Guard Ordering Rules

```typescript
// Auth MUST run before role guards:
@UseGuards(JwtAuthGuard, AdminGuard)        // Admin endpoints
@UseGuards(JwtAuthGuard, PoolManagerGuard)  // Pool manager endpoints
@UseGuards(JwtAuthGuard, AttesterGuard)     // Attester/KYB endpoints
@UseGuards(JwtAuthGuard, KybOwnerGuard)     // KYB owner endpoints

// WRONG (role guard before auth -- will fail):
@UseGuards(AdminGuard, JwtAuthGuard)
```

### Role Definitions

Roles are derived from on-chain state synced to the database -- there is no separate role management system:

| Role | Determination |
|------|---------------|
| **Admin** | Wallet matches `AUTHORITY` environment variable |
| **Pool Manager** | Wallet is `manager_address` on a specific pool |
| **Attester** | Wallet is `attester_address` on any pool |
| **Investor** | Any authenticated user (no special guard needed) |

### IDOR Prevention

- User profile access: non-admins can only access their own profile (`address !== account` check)
- KYB submissions: `KybOwnerGuard` verifies ownership
- File access: path ownership check (`pathAddress !== account && account !== authorityAddress`)
- Pool manager operations: `PoolManagerGuard` verifies the requesting wallet manages the specific pool

---

## Input Validation

### Global ValidationPipe

Configured in `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({
  transform: true,       // Auto-transform payloads to DTO instances
  whitelist: true,       // Strip properties not in DTO
  forbidNonWhitelisted: true, // Reject requests with extra properties
}));
```

### DTO Pattern

All endpoints use class-validator decorated DTOs:

```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}
```

### Database Query Safety

- **Sort columns**: Validated against allowlists (`ALLOWED_SORT_COLUMNS`) to prevent SQL injection through Supabase `.order()`
- **Search terms**: Sanitized via `sanitizeSearchTerm()` before use in `.ilike()` queries
- **UUIDs**: `PoolManagerGuard` validates pool ID format against UUID regex before DB query
- **Pagination**: Clamped to safe ranges (e.g., `Math.min(50, Math.max(1, size))`)

---

## File Upload Security

### Three-Layer Defense

Every file upload endpoint implements these checks in order:

```typescript
@Post('upload')
@UseGuards(JwtAuthGuard, FileUploadRateLimitGuard)  // 1. Rate limiting
@UseInterceptors(FileInterceptor('file', genericUploadOptions))
async upload(@UploadedFile() file: MulterFile) {
  performSecurityValidation(file);                     // 2. Security validation
  validateFile(file, { allowedMimeTypes, maxFileSize }); // 3. Type + size check
  const safeName = sanitizeFilename(file.originalname);  // 4. Path sanitization
  // ... upload to storage
}
```

### Security Validation (`performSecurityValidation`)

- **Magic bytes check**: Validates file content starts with expected byte signatures (PDF: `%PDF`, PNG: `\x89PNG`, JPEG: `\xFF\xD8\xFF`)
- **Double extension detection**: Rejects files like `report.pdf.exe`
- **Null byte check**: Rejects filenames containing null bytes

### Allowed File Types

| Category | MIME Types | Max Size |
|----------|-----------|----------|
| Images | image/jpeg, image/png, image/webp | 5 MB |
| Documents | application/pdf, msword, docx, xls, xlsx, text/plain, text/csv, image/png, image/jpeg | 20 MB |
| KYB Documents | application/pdf, image/png, image/jpeg | 10 MB |

### Rate Limiting

- **Per-user**: 10 uploads per minute (in-memory store with auto-cleanup)
- **Global**: 100 requests per minute per IP (via `@nestjs/throttler`)

### Storage Path Security

- Files stored under `manager/{wallet_address}/{subType}-{timestamp}.{extension}`
- Path validation regex prevents directory traversal
- File URL access requires ownership verification (wallet address in path must match requester)
- Admin (`AUTHORITY` address) can access all files

---

## API Security

### CORS

```typescript
app.enableCors({
  origin: [
    'https://staging.credit.markets',
    'https://credit.markets',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
});
```

### Rate Limiting

Global `ThrottlerGuard` applied via `APP_GUARD`:

| Scope | TTL | Limit |
|-------|-----|-------|
| Default | 60s | 100 requests |
| File uploads | 60s | 10 per user |

### Request Body Limits

- JSON: 10 MB
- URL-encoded: 10 MB
- Query parser: max depth 2, array limit 100

### Cookie Security

Auth cookies (set during user creation):
- `httpOnly: true` -- prevents XSS access
- `secure: true` in production -- HTTPS only
- `sameSite: 'strict'` -- CSRF protection
- Max age: 24 hours

---

## Blockchain Security

### Webhook Authentication

Helius webhooks use timing-safe comparison to prevent timing attacks:

```typescript
const expected = Buffer.from(`Bearer ${secret}`);
const received = Buffer.from(authHeader || '');
if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
  throw new UnauthorizedException('Invalid webhook secret');
}
```

### Transaction Building

- Backend builds **unsigned** transactions only
- Users sign with their own wallet (no backend signing of user transactions)
- The operator keypair (`SOLANA_OPERATOR_PK`) is used only for read operations and initialization
- If operator key is invalid, service runs in read-only mode

### Address Handling

Solana base58 addresses are **case-sensitive**. Never use `.toLowerCase()` or `.toUpperCase()` on wallet addresses -- this corrupts the encoding.

---

## Environment Variable Security

### Sensitive Variables

| Variable | Risk Level | Notes |
|----------|-----------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Critical** | Full DB access, bypasses RLS |
| `SOLANA_OPERATOR_PK` | **Critical** | Can sign transactions |
| `DYNAMIC_TOKEN` | **High** | Dynamic Labs API access |
| `HELIUS_WEBHOOK_SECRET` | **High** | Webhook authentication |
| `RESEND_API_KEY` | **Medium** | Can send emails |

### Rules

1. Never commit `.env` files -- use `.env.example` as template
2. Use `configService.getOrThrow()` for required variables (fails fast on missing config)
3. Never log sensitive values -- even in error messages
4. Rotate secrets regularly, especially `HELIUS_WEBHOOK_SECRET` and `DYNAMIC_TOKEN`

---

## Endpoint Security Checklist

When adding new endpoints:

- [ ] JWT authentication: `@UseGuards(JwtAuthGuard)`
- [ ] Role restriction if needed: `AdminGuard`, `PoolManagerGuard`, or `AttesterGuard`
- [ ] Input validation: DTO with class-validator decorators
- [ ] File upload: Rate limit guard + security validation + type/size check + path sanitization
- [ ] Database query: Validate and sanitize IDs, use allowlists for sort columns
- [ ] Blockchain operation: Validate addresses (base58 format), validate amounts
- [ ] Error handling: Use `logError()`, never expose internal details to client
- [ ] Swagger docs: `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`
- [ ] IDOR check: Ensure users can only access their own resources (or admin override)
