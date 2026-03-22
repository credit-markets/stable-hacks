# Database Documentation

## Overview

The backend uses **Supabase** (hosted PostgreSQL) as its primary database. The Supabase client is configured with the **service role key**, which bypasses Row Level Security (RLS) -- all access control is enforced at the application layer through guards and service logic.

---

## Supabase Client Setup

The `SupabaseService` (`src/database/supabase.service.ts`) creates a typed client:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

this.client = createClient<Database>(
  this.configService.getOrThrow<string>('SUPABASE_URL'),
  this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
);
```

The `SupabaseModule` is **global** -- all modules can inject `SupabaseService` without importing the module.

### Usage Pattern

```typescript
const supabase = this.supabaseService.getClient();

// Select with filtering
const { data, error } = await supabase
  .from('pools')
  .select('*')
  .eq('status', 'open')
  .order('created_at', { ascending: false })
  .range(0, 9);

// Insert
const { data, error } = await supabase
  .from('users')
  .insert({ account: walletAddress, referral_id: generateId() })
  .select()
  .single();

// Update
const { data, error } = await supabase
  .from('pools')
  .update({ status: 'deployed', on_chain_address: vaultPda })
  .eq('id', poolId)
  .select()
  .single();

// RPC function call
const { data, error } = await supabase.rpc('get_daily_tvl');
```

---

## Database Schema

### Core Tables

#### `users`

User profiles linked to Solana wallet addresses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `account` | text | Solana wallet address (primary identifier) |
| `provider_id` | text | Dynamic Labs user ID (JWT `sub` claim) |
| `dynamic_identifier` | text | Email or other Dynamic identifier |
| `type` | text | User type |
| `investor_classification` | text | Investor classification level |
| `kyc_attestation` | text | KYC attestation reference |
| `kyc_id` | integer | KYC identifier |
| `referral_id` | text | Referral code |
| `referred_by` | text | Referrer reference |
| `notifications` | jsonb | Notification preferences |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update |

#### `user_roles`

Role assignments (one-to-one with users).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (FK -> users) | User reference |
| `role` | text | Role name |
| `updated_at` | timestamptz | Last update |

#### `pools`

Credit pools -- the central entity connecting off-chain configuration with on-chain vault state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `title` | text | Pool display name |
| `description` | text | Pool description |
| `status` | text | Pool lifecycle status |
| `pool_type` | text | `fidc` or `tidc` |
| `pipeline_key` | text | External pipeline identifier |
| `share_class` | text | Share class name |
| `asset_class` | text | Asset class |
| `currency` | text | Currency (e.g., USDC) |
| `vault_id` | integer | On-chain vault ID (u64) |
| `on_chain_address` | text | Solana vault PDA address |
| `asset_mint` | text | SPL token mint address |
| `manager_address` | text | Manager wallet (Solana) |
| `manager_id` | uuid (FK -> actors) | Manager actor reference |
| `manager_name` | text | Manager display name |
| `authority_address` | text | Authority wallet (admin) |
| `attester_address` | text | KYB attester wallet |
| `nav_oracle_address` | text | NAV oracle PDA |
| `price_per_share` | numeric | Current NAV per share |
| `is_visible` | boolean | Marketplace visibility flag |
| `investment_window_open` | boolean | Whether investment window is open |
| `minimum_investment` | numeric | Minimum investment amount |
| `target_raise_amount` | numeric | Target fundraise |
| `target_return_rate` | numeric | Expected return rate |
| `target_return_unit` | text | Return unit (%, bps) |
| `management_fee_rate` | numeric | Management fee |
| `lockup_period_days` | integer | Lockup period |
| `logo_path` | text | Storage path for pool logo |
| `documents` | jsonb | Pool documents metadata |
| `fund_size` | numeric | Total fund size |
| `start_time` | timestamptz | Pool start date |
| `deployed_at` | timestamptz | On-chain deployment timestamp |
| `approved_at` | timestamptz | Approval timestamp |
| `submitted_at` | timestamptz | Submission timestamp |
| `funded_at` | timestamptz | Fully funded timestamp |
| `matured_at` | timestamptz | Maturity timestamp |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update |

Additional columns for hedge details, subordination, redemption terms, and regulatory fields exist. See `src/database/database.types.ts` for the complete schema.

#### `managers`

Credit manager profiles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `owner_address` | text | Manager's Solana wallet |
| `company_name` | text | Company name |
| `overview` | text | Company description |
| `website` | text | Company website |
| `logo_path` | text | Storage path for logo |
| `actor_id` | uuid (FK -> actors) | Actor reference |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update |

#### `actors`

System actor registry (wallets, services).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Actor name |
| `type` | text | Actor type |
| `wallet_address` | text | Associated wallet |
| `metadata` | jsonb | Additional data |
| `created_at` | timestamptz | Creation timestamp |

---

### KYB Tables

#### `kyb_submissions`

Know Your Business application tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (FK -> users) | Applicant |
| `status` | enum `kyb_status` | draft, submitted, under_review, approved, resubmission_requested, rejected, revoked |
| `step_completed` | integer | Last completed step number |
| `legal_name` | text | Company legal name |
| `trading_name` | text | Trading name |
| `entity_type` | text | Entity type |
| `jurisdiction` | text | Jurisdiction code |
| `registration_number` | text | Company registration |
| `date_of_incorporation` | text | Incorporation date |
| `registered_address` | text | Registered address |
| `business_activity` | text | Primary business |
| `website` | text | Company website |
| `is_regulated` | boolean | Whether entity is regulated |
| `regulator_name` | text | Regulator name |
| `license_number` | text | License number |
| `source_of_funds` | text | Source of funds declaration |
| `source_of_wealth` | text | Source of wealth |
| `has_pep` | boolean | PEP exposure |
| `has_rca` | boolean | RCA exposure |
| `risk_score` | numeric | Assigned risk score |
| `risk_band` | text | Risk band classification |
| `edd_required` | boolean | Enhanced due diligence flag |
| `attestation_tx` | text | On-chain attestation tx signature |
| `attestation_pda` | text | Attestation PDA address |
| `reviewed_by` | uuid (FK -> users) | Reviewer user ID |
| `reviewed_at` | timestamptz | Review timestamp |
| `rejection_reason` | text | Rejection reason |
| `resubmission_items` | text[] | Items requiring resubmission |
| Various declarations | boolean | Compliance declarations |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update |

#### `kyb_ubos`

Ultimate Beneficial Owners.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `submission_id` | uuid (FK -> kyb_submissions) | Parent submission |
| `full_name` | text | UBO full name |
| `date_of_birth` | text | Date of birth |
| `nationality` | text | Nationality |
| `country_of_residence` | text | Residence country |
| `role` | text | Role in company |
| `ownership_percentage` | numeric | Ownership percentage |
| `is_pep` | boolean | PEP status |
| `source_of_wealth` | text | Source of wealth |

#### `kyb_documents`

Uploaded KYB documents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `submission_id` | uuid (FK -> kyb_submissions) | Parent submission |
| `ubo_id` | uuid (FK -> kyb_ubos) | Optional UBO reference |
| `category` | enum `kyb_document_category` | Document type |
| `file_name` | text | Original filename |
| `storage_path` | text | Storage path |
| `mime_type` | text | MIME type |
| `uploaded_at` | timestamptz | Upload timestamp |

#### `kyb_wallet_declarations`

Declared wallet addresses for KYB compliance.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `submission_id` | uuid (FK -> kyb_submissions) | Parent submission |
| `wallet_address` | text | Solana wallet address |
| `wallet_label` | text | User-defined label |
| `source_description` | text | Source of funds for wallet |
| `declared_at` | timestamptz | Declaration timestamp |

---

### Market Data Tables

#### `tvl_snapshots`

TVL data points per pool, written by the Helius webhook service.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `pool_id` | uuid (FK -> pools) | Pool reference |
| `tvl` | numeric | Total Value Locked |
| `total_shares` | numeric | Total shares outstanding |
| `price_per_share` | numeric | NAV per share |
| `event_type` | text | Event that triggered snapshot |
| `chain_tx_id` | text | On-chain transaction signature |
| `recorded_at` | timestamptz | Snapshot timestamp |

#### `nav_price_history`

NAV price history per pool.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `pool_id` | uuid (FK -> pools) | Pool reference |
| `price` | numeric | NAV price per share |
| `chain_tx_id` | text | On-chain transaction |
| `recorded_at` | timestamptz | Price timestamp |

#### `pool_investment_windows`

Tracks investment window open/close and associated metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `pool_id` | uuid (FK -> pools) | Pool reference |
| `window_number` | integer | Sequential window number |
| `opened_at` | timestamptz | When window opened |
| `closed_at` | timestamptz | When window closed |
| `request_count` | integer | Number of requests |
| `total_requested` | numeric | Total amount requested |
| `approved_count` | integer | Approved count |
| `total_approved` | numeric | Total amount approved |
| `rejected_count` | integer | Rejected count |
| `total_rejected` | numeric | Total amount rejected |

---

### Risk Tables

#### `risk_fidc_scores` / `risk_tidc_scores`

Current risk scores per pool (keyed by `pipeline_key`).

FIDC-specific columns: `score_risco`, `score_risco_global`, `faixa_risco`, `confidence_label`, `confidence_tier`, `leverage_ratio`, `liquidity_ratio`, `pdd_ratio`, `inad_total_ratio`, `default_stock_ratio`, `sharpe_ratio`, `alerta_deterioracao`, etc.

TIDC-specific columns: `score_risco`, `faixa_risco`, `confidence_label`, `confidence_tier`, `default_ratio`, `collection_rate`, `overdue_ratio`, `distance_to_loss`, `effective_yield`, `alerta_deterioracao`, etc.

#### `risk_fidc_monthly` / `risk_tidc_monthly`

Monthly risk time series per pool (keyed by `pipeline_key` and `reference_month`).

---

### Other Tables

#### `execution_events`

Audit log for all significant platform events.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `event_type` | text | Event category |
| `correlation_id` | text | Correlation ID for grouping |
| `actor_id` | text | Who performed the action |
| `actor_type` | text | investor, manager, admin, system, partner, attester, oracle |
| `target_type` | text | pool, fund, investment, withdrawal |
| `target_id` | text | Target entity ID |
| `payload` | jsonb | Event-specific data |
| `chain_tx_id` | text | On-chain transaction (if applicable) |
| `chain_confirmed` | boolean | Whether chain tx confirmed |
| `created_at` | timestamptz | Event timestamp |

#### `nota_fiscal_items`

Brazilian nota fiscal (invoice) receivables for TIDC pools.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `pool_id` | uuid (FK -> pools) | Pool reference |
| `pipeline_key` | text | Pipeline identifier |
| `cedente` | text | Assignor name |
| `sacado` | text | Debtor name |
| `valor_nominal` | numeric | Face value |
| `valor_aquisicao` | numeric | Acquisition value |
| `valor_pago` | numeric | Amount paid |
| `taxa_desconto` | numeric | Discount rate |
| `data_emissao` | text | Issuance date |
| `data_vencimento` | text | Due date |
| `status` | text | active, settled, overdue, defaulted |
| `payment_schedule` | jsonb | Payment schedule details |
| `external_id` | text | External system ID |

#### `tokens`

Token registry.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `address` | text | Token mint address |
| `symbol` | text | Token symbol |
| `name` | text | Token name |
| `decimals` | integer | Token decimals |
| `icon` | text | Icon URL |

#### `otps`

OTP codes for email verification.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `email` | text | Email address |
| `code` | integer | 6-digit OTP code |
| `verified` | boolean | Whether verified |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update |

#### `pool_responsibilities`

Actor-pool role assignments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `pool_id` | uuid (FK -> pools) | Pool reference |
| `actor_id` | uuid (FK -> actors) | Actor reference |
| `role` | text | Role type |
| `assigned_by` | text | Who assigned |
| `assigned_at` | timestamptz | Assignment date |
| `revoked_at` | timestamptz | Revocation date |
| `revocation_reason` | text | Reason for revocation |

---

## Database Enums

### `kyb_status`

```
draft -> submitted -> under_review -> approved
                                   -> resubmission_requested -> (back to submitted)
                                   -> rejected
approved -> revoked
```

### `kyb_document_category`

`certificate_of_incorporation`, `proof_of_address`, `register_of_directors`, `register_of_shareholders`, `ubo_id_document`, `financial_statements`, `regulatory_license`, `source_of_funds_evidence`, `authority_evidence`, `sanctions_screening_evidence`, `wallet_screening_evidence`, `other`

---

## Database Functions (RPC)

| Function | Arguments | Returns | Purpose |
|----------|-----------|---------|---------|
| `get_current_tvl` | none | `{ total_tvl }` | Current total TVL |
| `get_daily_tvl` | none | `[{ day, tvl }]` | Daily TVL series |
| `open_investment_window` | `p_pool_id` | void | Opens new investment window |
| `increment_window_requested` | `p_pool_id, p_amount` | void | Tracks investment request |
| `increment_window_approved` | `p_pool_id, p_amount` | void | Tracks approval |
| `increment_window_rejected` | `p_pool_id, p_amount` | void | Tracks rejection |

---

## Supabase Storage

### Configuration

- Bucket name: `files` (configurable via `SUPABASE_STORAGE_BUCKET`)
- Used in production (`NODE_ENV=production`)
- Development uses local filesystem (`uploads/` directory)

### File Organization

```
files/
├── manager/{wallet_address}/
│   ├── profile-logo-{timestamp}.{ext}
│   ├── profile-cover-{timestamp}.{ext}
│   ├── pool-logo-{timestamp}.{ext}
│   ├── pool-prospectus-{timestamp}.{ext}
│   └── pool-document-{timestamp}.{ext}
└── kyb/{submission_id}/
    └── {category}/{filename}
```

### Storage Interface

All storage operations go through `IStorageService`:

```typescript
interface IStorageService {
  uploadFile(filePath: string, buffer: Buffer, mimeType: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  getFile(filePath: string): Promise<Buffer>;
  getSignedUrl(filePath: string, expiresIn?: number): Promise<string>;
  getFileUrl(filePath: string, expiresInHours?: number): Promise<string>;
  fileExists?(filePath: string): Promise<boolean>;
}
```

Injected via `@Inject('STORAGE_SERVICE')`.

---

## Type Generation

Database types are auto-generated from the Supabase schema into `src/database/database.types.ts`. This file should NOT be edited manually.

### Regenerating Types

After schema changes in Supabase:

```bash
# Using Supabase CLI
npx supabase gen types typescript --project-id <project-id> > src/database/database.types.ts

# Or with local Supabase
npx supabase gen types typescript --local > src/database/database.types.ts
```

### Using Generated Types

```typescript
import { Database } from '../database/database.types';

// Row type (for reads)
type PoolRow = Database['public']['Tables']['pools']['Row'];

// Insert type (for creates)
type PoolInsert = Database['public']['Tables']['pools']['Insert'];

// Update type (for updates)
type PoolUpdate = Database['public']['Tables']['pools']['Update'];

// Enum type
type KybStatus = Database['public']['Enums']['kyb_status'];
```

### Helper Types

The generated file exports utility types:

```typescript
import { Tables, TablesInsert, TablesUpdate, Enums } from '../database/database.types';

type Pool = Tables<'pools'>;
type NewPool = TablesInsert<'pools'>;
type PoolUpdate = TablesUpdate<'pools'>;
type KybStatus = Enums<'kyb_status'>;
```

---

## Key Relationships

```
users (1) ──── (1) user_roles
users (1) ──── (N) kyb_submissions
kyb_submissions (1) ──── (N) kyb_documents
kyb_submissions (1) ──── (N) kyb_ubos
kyb_submissions (1) ──── (N) kyb_wallet_declarations
pools (1) ──── (N) pool_investment_windows
pools (1) ──── (N) tvl_snapshots
pools (1) ──── (N) nav_price_history
pools (1) ──── (N) nota_fiscal_items
pools (1) ──── (N) pool_responsibilities
actors (1) ──── (N) pool_responsibilities
actors (1) ──── (N) managers
```

---

## Migration Strategy

Schema changes are managed through Supabase:

1. Make changes in the Supabase dashboard or via SQL migrations
2. Regenerate `database.types.ts`
3. Update any affected services and DTOs
4. Update frontend types (`app/src/types/`) to match
5. Test with existing data on staging before deploying to production
