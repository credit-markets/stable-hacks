# Component Library

This document catalogs the shared components used across the Credit Markets frontend.

---

## Organization

Components are organized into two tiers:

1. **Shared components** (`src/components/`) — Reusable across pages
2. **Page-level components** (`src/app/components/`) — View components rendered by specific pages

Within `src/components/`, components are grouped by concern:

```
src/components/
├── AppLayout.tsx           # Main app shell (Header + Footer + content)
├── ConnectButton.tsx       # Dynamic Labs wallet connect button
├── Header.tsx              # Dark gradient top bar with navigation
├── Footer.tsx              # App footer with external links
├── auth/                   # Custom auth UI (email, passkey, wallet picker)
│   └── steps/              # Auth flow step components
├── FileUpload/             # File upload components
├── forms/                  # Reusable form fields (TanStack Form + NextUI)
├── icons/                  # Custom SVG icons (Google, INA, Solana, Spinner)
├── modals/                 # BaseModal, DetailSection
├── onboarding/             # EntityForm, IndividualForm
├── pool/                   # Pool detail components
│   ├── detail/             # TermSheet, NavPriceChart, HedgeInfo
│   │   └── risk/           # Risk analysis panels (7 panels + RiskTab)
│   ├── PoolInfoStrip.tsx
│   └── PoolTabContent.tsx
├── pools/                  # Pool list components (MarketplacePoolCard)
├── portfolio/              # Portfolio components (PositionsTable, RiskPanel)
└── ui/                     # UI primitives (buttons, skeletons, labels)
```

---

## UI Primitives (`src/components/ui/`)

### Buttons

Located in `src/components/ui/buttons/`:

| Component | Import | Description |
|-----------|--------|-------------|
| `BackButton` | `@/components/ui/buttons/BackButton` | Navigation back button using router |
| `FormSubmitButton` | `@/components/ui/buttons/FormSubmitButton` | Submit button with loading state |
| `IconActionButton` | `@/components/ui/buttons/IconActionButton` | Icon-only button with `aria-label` |
| `ModalCloseButton` | `@/components/ui/buttons/ModalCloseButton` | Close button for modals |
| `ModalConfirmButton` | `@/components/ui/buttons/ModalConfirmButton` | Confirm button for modals |

Barrel export available:

```typescript
import { BackButton, FormSubmitButton, IconActionButton } from "@/components/ui/buttons";
```

### Skeleton Loading

Located in `src/components/ui/skeletons/`:

| Component | Import | Description |
|-----------|--------|-------------|
| `PageSkeleton` | `@/components/ui/skeletons/PageSkeleton` | Full page skeleton with configurable stats grid and table |
| `ContentReveal` | `@/components/ui/skeletons/ContentReveal` | Animated fade-in reveal for loaded content |
| `StaggerReveal` | `@/components/ui/skeletons/StaggerReveal` | Staggered animation for lists of items |
| `Shimmer` | `@/components/ui/skeletons/Shimmer` | Base shimmer component |

Barrel export available:

```typescript
import { PageSkeleton, ContentReveal, StaggerReveal, Shimmer } from "@/components/ui/skeletons";
```

### Layout & Display

| Component | Import | Description |
|-----------|--------|-------------|
| `Breadcrumb` | `@/components/ui/Breadcrumb` | Breadcrumb navigation trail |
| `EmptyState` | `@/components/ui/EmptyState` | No-data display with icon, title, description |
| `IconText` | `@/components/ui/IconText` | Icon + text label pair |
| `LoadingOverlay` | `@/components/ui/LoadingOverlay` | Full-width loading spinner with configurable height |
| `MetricLabel` | `@/components/ui/MetricLabel` | Label + value pair for metrics |
| `SectionHeading` | `@/components/ui/SectionHeading` | Section heading with optional description |
| `SectionTitle` | `@/components/ui/SectionTitle` | Uppercase tracking section title |

---

## Layout Components

### AppLayout

`src/components/AppLayout.tsx`

The main application shell used by all `(dashboard)` routes. Renders the Header, main content area with a subtle gradient overlay, and Footer.

```tsx
import { AppLayout } from "@/components/AppLayout";

<AppLayout>
  {children}
</AppLayout>
```

The layout includes:
- Dark gradient header bar with navigation links
- Terminal herringbone background pattern
- Content area with top shadow gradient
- Footer with external links (Privacy Policy, Terms, Docs)

Navigation links are defined within `AppLayout.tsx`:
- Marketplace (`/`)
- Portfolio (`/portfolio`)
- Account (`/account`)
- Manager (`/manager`)

### Admin Layout

`src/app/admin/layout.tsx`

A separate layout for admin pages with:
- Top navbar with "Credit Markets Admin" branding and `ConnectButton`
- Collapsible sidebar navigation (hidden on mobile, slide-in drawer)
- Role-based tab visibility (admin sees all tabs; attester sees only KYB Queue)
- `Suspense` boundary with `LoadingOverlay` fallback

Admin sidebar tabs:
- Users (`/admin/users`) — admin only
- Pools (`/admin/pools`) — admin only
- Managers (`/admin/managers`) — admin only
- KYB Queue (`/admin/kyb-queue`) — admin + attester
- Event Log (`/admin/events`) — admin only

### Header

`src/components/Header.tsx`

Dark gradient top bar (`h-16`) with:
- Project logo and name
- Navigation links (responsive)
- `ConnectButton` for wallet connection
- Sticky positioning (`sticky top-0 z-50`)

### Footer

`src/components/Footer.tsx`

Bottom section with external links to Privacy Policy, Terms of Service, and Docs.

---

## Form Components (`src/components/forms/`)

### FormField

A reusable form field wrapper that integrates TanStack React Form with NextUI input components.

Supports three input types: `input`, `textarea`, `select`.

```tsx
import { FormField } from "@/components/forms";
import { useForm } from "@tanstack/react-form";

function MyForm() {
  const form = useForm({
    defaultValues: { name: "", description: "", category: "" },
  });

  return (
    <form>
      <FormField
        form={form}
        name="name"
        label="Name"
        inputType="input"
        required
        placeholder="Enter name"
      />

      <FormField
        form={form}
        name="description"
        label="Description"
        inputType="textarea"
        inputProps={{ rows: 4 }}
      />

      <FormField
        form={form}
        name="category"
        label="Category"
        inputType="select"
        required
        inputProps={{
          options: [
            { value: "option1", label: "Option 1" },
            { value: "option2", label: "Option 2" },
          ],
        }}
      />
    </form>
  );
}
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `form` | `FormApi` | Yes | TanStack Form instance |
| `name` | `string` | Yes | Field name |
| `label` | `string` | Yes | Field label |
| `inputType` | `'input' \| 'textarea' \| 'select'` | Yes | Input type to render |
| `required` | `boolean` | No | Shows required indicator |
| `placeholder` | `string` | No | Placeholder text |
| `description` | `string` | No | Helper text below label |
| `validators` | `object` | No | TanStack Form validators |
| `inputProps` | `object` | No | Type-specific props |
| `classNames` | `Record<string, string>` | No | NextUI classNames prop |

**When to use FormField**: Standard text inputs, number inputs, textareas, simple select dropdowns.

**When NOT to use FormField**: Custom components with special logic (DateTimePicker, FileUpload), select fields with custom rendering, radio/checkbox groups, fields with complex value transformations.

### DateTimePicker

A specialized date-time input component:

```tsx
import { DateTimePicker } from "@/components/forms";

<form.Field name="startTime">
  {(field) => (
    <DateTimePicker
      value={field.state.value}
      onChange={(date) => field.handleChange(date)}
      label="Start Time"
      min={new Date()}
    />
  )}
</form.Field>
```

Full documentation is in `src/components/forms/README.md`.

---

## Auth Components (`src/components/auth/`)

Custom authentication UI components that replace the default Dynamic Labs modal. The Dynamic Labs widget is hidden via CSS (`globals.css` + provider `cssOverrides`).

Auth step components in `src/components/auth/steps/` render different stages of the auth flow:
- Start step (email, Google, wallet, passkey selection)
- OTP verification step
- Loading/processing step
- Passkey registration step
- Recovery codes display step

---

## File Upload Components (`src/components/FileUpload/`)

Components for file upload with preview:
- `DocumentItem` — Displays an uploaded document with actions
- `ImageUpload` — Image upload with preview and progress

---

## Modal Components (`src/components/modals/`)

### BaseModal

Base modal wrapper providing consistent modal styling.

### DetailSection

Reusable section component for displaying key-value details within modals or detail pages.

---

## Pool Components

### Pool List (`src/components/pools/`)

`MarketplacePoolCard` — Card component for pool listings on the marketplace page.

### Pool Detail (`src/components/pool/`)

| Component | Description |
|-----------|-------------|
| `PoolInfoStrip` | Terminal-style data strip showing pool metrics |
| `PoolTabContent` | Tab container for pool detail sections |
| `detail/TermSheet` | Pool term sheet display |
| `detail/NavPriceChart` | NAV price history chart |
| `detail/HedgeInfo` | FX hedge mechanism details |
| `detail/risk/RiskTab` | Risk analysis tab with 7 sub-panels |

### Risk Panels (`src/components/pool/detail/risk/`)

Seven risk analysis panels for pool risk assessment, plus a `RiskTab` container.

---

## Portfolio Components (`src/components/portfolio/`)

| Component | Description |
|-----------|-------------|
| `PositionsTable` | Table of investor positions |
| `RiskPanel` | Portfolio-level risk summary |

---

## Onboarding Components (`src/components/onboarding/`)

| Component | Description |
|-----------|-------------|
| `EntityForm` | Entity (company) onboarding form |
| `IndividualForm` | Individual onboarding form |

---

## Custom Icons (`src/components/icons/`)

Custom SVG icon components:
- Google logo
- INA logo
- Solana logo
- Spinner animation

Additional icons come from two libraries:
- **Lucide React** — Primary icon library (line icons)
- **Phosphor Icons** — Secondary icon library

---

## Page-Level View Components (`src/app/components/`)

These are client components that render the main content for specific pages:

| Component | Used By | Description |
|-----------|---------|-------------|
| `DashboardView` | `(dashboard)/page.tsx` | Marketplace pool listings |
| `MarketplaceContent` | `DashboardView` | Pool grid with search/filter/sort |
| `PortfolioView` | `portfolio/page.tsx` | Investor portfolio dashboard |

---

## Component Conventions

### Props Patterns

- Use TypeScript interfaces for props
- Destructure props in function signature
- Use `PropsWithChildren` from React when children are needed
- Optional props have default values or are handled with conditional rendering

### Client vs Server

- Add `'use client'` only when the component uses hooks, event handlers, or browser APIs
- Default to Server Components for pure rendering

### Styling

Components use the centralized style system:

```tsx
import { styles, cx } from "@/lib/styleClasses";

<div className={cx(styles.card, styles.cardPadding)}>
  <h2 className={styles.headingMd}>Title</h2>
  <p className={styles.bodyMd}>Description</p>
</div>
```

For NextUI components, use the NextUI prop API:

```tsx
<Button color="primary" variant="bordered" radius="full">
  Action
</Button>
```

### Accessibility

- Icon-only buttons require `aria-label`
- Touch targets: minimum 44x44px
- Semantic HTML (`<main>`, `<section>`, `<nav>`)
- `useReducedMotion()` hook for animation preferences
- Keyboard navigation support (onKeyDown handlers where needed)
- The admin layout sidebar overlay has proper `role="button"` and keyboard dismiss

### Always Check Before Creating

Before creating a new component, check:
1. `src/components/ui/` for existing primitives
2. `src/components/` for existing shared components
3. NextUI component library for built-in components
4. The style system (`styleClasses.ts`) for existing patterns
