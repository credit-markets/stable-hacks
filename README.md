# Credit Markets — Empowering Edge Markets with Tokenized Credit

> **StableHacks 2026** | Track: **Institutional Permissioned DeFi Vaults**
>
> Live demo: **[staging.credit.markets](https://staging.credit.markets/)** | Program (Devnet): [`Bf17gDR...ZFW`](https://explorer.solana.com/address/Bf17gDR2JdKTWdoTWK3Va9YQtkpePRAAVxMCaokj8ZFW?cluster=devnet)

---

## The Problem

**Over $5.7 trillion in real-world credit assets across emerging markets remain trapped by local friction.** Fragmented legal frameworks, currency conversion barriers, and no standardized infrastructure to connect local origination with global institutional capital.

SMEs overpay for working capital while global investors struggle to access reliable yield backed by real cash flows. The capital exists. The demand exists. The infrastructure does not.

Brazil alone represents a $593B MSME credit gap — yet its receivables show institutional-grade performance (0.66% default rate) and its FIDC market ($170B AUM, 30% YoY growth) proves the asset class works. High banking spreads reflect structural concentration, not credit risk, creating immediate value for infrastructure that improves efficiency.

The convergence is happening now: Brazil's CVM Resolution 88, CMN 4,373, and Law 14,430 create compliant pathways for tokenized credit. Latin America stablecoin volumes grew from $1B to $6B in 2024-2025. Regulation has evolved from uncertainty to clarity. Stablecoins function as reliable settlement rails. Tokenization has crossed from experimentation to operational reality.

**What's missing is the regulated infrastructure layer — not another lender, but the rails connecting local receivables to global funding.**

---

## The Solution

**Credit Markets** provides institutional access to asset-backed private credit in emerging markets — structuring and standardizing local credit into globally investable assets, settled on Solana.

We built the full stack: an on-chain vault program (**SVS-11**), a platform for pool lifecycle management, and a proprietary risk model — all designed for regulated institutional use from day one.

### What We Built

- **SVS-11 CreditVault** — A new Solana Vault Standard variant we implemented specifically for institutional credit (see below)
- **Full-stack platform** — Manager dashboard, investor marketplace, portfolio tracking, admin panel (15 NestJS modules, 75+ React Query hooks)
- **KYB/KYC verification** with on-chain attestation — composable with any KYC provider
- **Proprietary risk model** — Ensemble ML pipeline scoring ~5,100 Brazilian FIDCs from CVM/BACEN regulatory filings (EFA + XGBoost + panel models, validated against fund returns)
- **Compliance tooling** — Account freezing, vault pause, investment windows, full audit trail (23 on-chain event types)

### Pool Types

| Type                | Description                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FIDC Pools**      | Regulated credit fund structures (Fundo de Investimento em Direitos Creditoarios) sourced from CVM/BACEN filings via our risk pipeline                                                                   |
| **Tokenized Pools** | Managed under the same institutional and regulatory practices — short-duration receivables originated by regulated entities, pooled conservatively with transparent reporting and predictable settlement |

---

## SVS-11: Bringing ERC-7540 to Solana for Institutional Credit

We implemented **SVS-11** — a new variant of the [Solana Vault Standard](https://github.com/solanabr/solana-vault-standard), which is a standards-aligned architectural port of ERC-4626 adapted for Solana's account model.

The SVS family (SVS-1 through SVS-12) covers the full spectrum from permissionless DeFi vaults to tranched structured products. **SVS-11 is purpose-built for institutional credit** — it extends the base standard with async approval flows (ERC-7540), oracle-driven NAV, KYC enforcement, and compliance controls that ERC-4626 and existing SVS variants don't provide:

|                 | SVS-1/2 (DeFi Vaults)          | SVS-11 (Credit Markets)                              |
| --------------- | ------------------------------ | ---------------------------------------------------- |
| **Deposit**     | Direct (1 TX)                  | Request → Approve → Claim (ERC-7540 async, manager-gated) |
| **NAV Pricing** | Vault balance (ERC-4626 style) | Oracle price-per-share (dynamic yield realization)         |
| **KYC**         | None                           | Built-in attestation — validated on every TX         |
| **Compliance**  | N/A                            | Per-investor freeze, vault pause, investment windows |
| **Capital**     | Vault-only                     | Manager draw_down / repay (real-world lending model) |
| **Roles**       | Authority                      | Authority + Manager + Attester + Investor            |

### 23 On-Chain Instructions

```
Pool:        initialize_pool · open/close_investment_window · pause · unpause
Invest:      request_deposit → approve_deposit → claim_deposit | reject | cancel
Redeem:      request_redeem → approve_redeem → claim_redeem | reject | cancel
Capital:     draw_down · repay
Compliance:  freeze_account · unfreeze_account
Governance:  transfer_authority · set_manager · update_attester · update_oracle_config
```

### Investment Flow

```
Investor (USDC)                    Manager                         Investor (Shares)
      │                               │                                  │
      ├── request_deposit ───────────►│                                  │
      │   (locks USDC in vault)       │                                  │
      │                               ├── approve_deposit ──────────────►│
      │                               │   (reads oracle NAV,             │
      │                               │    computes shares)              ├── claim_deposit
      │                               │                                  │   (mints shares)
      │                               │◄── request_redeem ──────────────┤
      │                               │    (locks shares in escrow)      │
      │◄── claim_redeem ──────────────┤── approve_redeem                 │
      │    (receives USDC)            │   (burns shares, transfers USDC) │
```

Every interaction validates the investor's on-chain KYC attestation (issuer, expiry, revocation status) — composable with any provider (Civic Pass, SAS, Sprout, or custom).

> Full SVS-11 specification: [SVS-11.md](solana-vault-standard/docs/SVS-11.md)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 15)                           │
│  App Router · React 18 · Tailwind/NextUI · TanStack Query           │
│  Dynamic Labs (wallet + social login) · Solana Web3.js              │
└──────────┬──────────────────────┬───────────────────────┬──────────┘
           │ REST API             │ JWT (httpOnly cookie)  │ On-chain
           ▼                      ▼                        ▼
┌──────────────────────────────────────────┐    ┌─────────────────────┐
│           Backend (NestJS 11)            │    │  Solana (Devnet)    │
│                                          │    │                     │
│  Auth ─► JWKS verification (no secrets)  │    │  SVS-11 CreditVault │
│  Pools ─► lifecycle + on-chain deploy    │◄──►│  (Anchor program)   │
│  Portfolio ─► positions + history        │    │                     │
│  KYB ─► manager verification            │    │  USDC · Share tokens │
│  Risk ─► ML pipeline scores + alerts    │    └─────────┬───────────┘
│  Compliance ─► freeze, pause, audit     │              │
│                                          │    ┌─────────▼───────────┐
└──────────────────┬───────────────────────┘    │  Helius Webhooks    │
                   │                            └─────────────────────┘
        ┌──────────▼──────────┐
        │  Supabase           │
        │  PostgreSQL + RLS   │
        │  Storage buckets    │
        └─────────────────────┘
```

| Layer          | What it does                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| **Settlement** | SVS-11 vaults on Solana — USDC deposits, share tokens (Token-2022), Helius webhooks for event indexing |
| **Execution**  | NestJS backend — pool lifecycle, approval workflows, append-only execution event log                   |
| **Analytics**  | Proprietary risk pipeline — CVM/BACEN data → ensemble ML scoring → Supabase risk tables                |

> Full architecture deep-dive: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Regulatory Compliance

Every hackathon prerequisite is addressed:

| Requirement     | Implementation                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| **KYC**         | On-chain attestation validated on every deposit/redemption — composable with any provider, revocable, expirable |
| **KYB**         | 7-step verification: entity info, UBOs, source of funds, PEP/RCA, documents, declarations                       |
| **KYT**         | Helius webhook ingestion for real-time transaction monitoring; append-only execution event log                  |
| **AML**         | Per-investor account freezing, vault pause (emergency stop), role-based access, investment window gating        |
| **Travel Rule** | Attestation accounts store investor identity + jurisdiction; all transactions logged with actor + counterparty  |

---

## Tech Stack

| Layer        | Technology                                                            |
| ------------ | --------------------------------------------------------------------- |
| **On-chain** | Rust, Anchor 0.31, Solana, Token-2022                                 |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind, NextUI, TanStack Query |
| **Backend**  | NestJS 11, TypeScript, Supabase (PostgreSQL + Storage)                |
| **Auth**     | Dynamic Labs (wallet + social), JWKS verification (RS256)             |
| **Risk**     | Python, scikit-learn, XGBoost, panel econometrics (CVM/BACEN data)    |
| **Indexing** | Helius webhooks, Supabase Realtime                                    |

---

## Repository Structure

```
stable-hacks/
├── app/                    # Frontend — Next.js 15
├── backend/                # Backend — NestJS 11
├── solana-vault-standard/  # SVS-11 CreditVault — Anchor program (submodule)
├── ARCHITECTURE.md         # Full technical architecture
└── README.md
```

```bash
git clone --recurse-submodules git@github.com:credit-markets/stable-hacks.git
cd stable-hacks

# Backend (start first)
cd backend && pnpm install && pnpm dev   # http://localhost:3030 (Swagger: /api)

# Frontend
cd app && pnpm install && pnpm dev       # http://localhost:3000
```

### Deep Dives

- [app/README.md](app/README.md) — Frontend architecture & setup
- [backend/README.md](backend/README.md) — Backend architecture & setup
- [solana-vault-standard/README.md](solana-vault-standard/README.md) — Solana Vault Standard family overview & quick start
- [solana-vault-standard/docs/SVS-11.md](solana-vault-standard/docs/SVS-11.md) — SVS-11 credit vault specification

---

## Links

| Resource                | URL                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Live Demo               | [staging.credit.markets](https://staging.credit.markets/)                                                               |
| SVS-11 Program (Devnet) | [Explorer](https://explorer.solana.com/address/Bf17gDR2JdKTWdoTWK3Va9YQtkpePRAAVxMCaokj8ZFW?cluster=devnet)             |
| Solana Vault Standard   | [thomgabriel/solana-vault-standard](https://github.com/thomgabriel/solana-vault-standard/tree/feat/svs-11-credit-vault) |
| Frontend                | [credit-markets/app](https://github.com/credit-markets/app)                                                             |
| Backend                 | [credit-markets/backend-node](https://github.com/credit-markets/backend-node)                                           |

---

## License

MIT
