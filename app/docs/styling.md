# Style System

This document describes the styling architecture of the Credit Markets frontend. The design language is "Institutional Monochrome Light" inspired by Bloomberg Terminal aesthetics.

---

## Architecture Overview

The style system has three layers:

1. **CSS Custom Properties** — Design tokens in `src/styles/globals.css`
2. **Tailwind CSS** — Utility classes configured in `tailwind.config.ts`
3. **Style Classes** — Composable class strings in `src/lib/styleClasses.ts`

Components use the `styles` object and `cx()` helper as the primary styling API. NextUI component props handle component-level theming.

---

## Design Tokens (`src/styles/globals.css`)

CSS custom properties define the foundational design tokens:

### Colors

```css
/* Primary Palette (90% of UI) */
--pure-black: #000000;
--text-primary: #1a1a1a;
--text-secondary: #666666;
--text-muted: #999999;

/* Surfaces */
--surface-page: #fafafa;
--surface-card: #ffffff;
--surface-hover: #f5f5f5;
--surface-dark: #393939;

/* Borders */
--border-subtle: #e5e5e5;
--border-default: #d4d4d4;

/* Terminal Status Colors */
--terminal-green: #00b341;
--terminal-amber: #cc8800;
--terminal-red: #cc0000;
--terminal-gray: #666666;

/* Chart Colors (only blue in UI) */
--chart-blue-500: #0066cc;
--chart-blue-400: #69b4ff;
--chart-blue-300: #91caff;
```

### Shadows

```css
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04);
--shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-dropdown: 0 4px 16px rgba(0, 0, 0, 0.12);
--shadow-modal: 0 16px 48px rgba(0, 0, 0, 0.16);
```

### Typography

```css
--font-body: "Inter", system-ui, -apple-system, sans-serif;
--font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", monospace;
```

### Border Radius

```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
```

---

## Tailwind Configuration (`tailwind.config.ts`)

### Fonts

```
sans: Inter, system-ui, -apple-system, sans-serif
mono: IBM Plex Mono, ui-monospace, SF Mono, monospace
```

### Color Palette

The Tailwind config extends with semantic color names:

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#1A1A1A` | Primary body text |
| `text-secondary` | `#666666` | Secondary/muted text |
| `text-muted` | `#999999` | Labels, captions |
| `surface-page` | `#FAFAFA` | Page background |
| `surface-card` | `#FFFFFF` | Card backgrounds |
| `surface-hover` | `#F5F5F5` | Hover states |
| `border-subtle` | `#E5E5E5` | Light borders |
| `border-default` | `#D4D4D4` | Standard borders |
| `dimensional-gray` | `#393939` | Primary buttons |
| `strategic-blue` | `#79C2FF` | Accent/highlight color |
| `deep-black` | `#090909` | Dark backgrounds |
| `terminal-green` | `#00B341` | Success/open status |
| `terminal-amber` | `#CC8800` | Warning/pending status |
| `terminal-red` | `#CC0000` | Error/rejected status |
| `terminal-gray` | `#666666` | Closed/inactive status |

### Custom Shadows

| Token | Usage |
|-------|-------|
| `shadow-card` | Default card shadow |
| `shadow-card-hover` | Card hover shadow |
| `shadow-dropdown` | Dropdown menus |
| `shadow-modal` | Modal dialogs |

### Custom Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| `terminal-shimmer` | 1.8s ease-in-out infinite | Skeleton loading shimmer |
| `fade-in` | 0.3s ease-out forwards | Content reveal |
| `fade-up` | 0.3s ease-out forwards | Staggered content reveal |

### Custom Utility Classes

Defined via Tailwind plugin in `tailwind.config.ts`:

| Class | Applies |
|-------|---------|
| `.toolbar-row` | `flex items-center justify-between` |
| `.inline-group` | `flex items-center gap-2` |
| `.inline-group-lg` | `flex items-center gap-4` |
| `.stack` | `flex flex-col gap-2` |
| `.stack-lg` | `flex flex-col gap-4` |
| `.stack-xl` | `flex flex-col gap-6` |
| `.card-container` | `rounded-lg border border-subtle shadow-card bg-surface-card` |
| `.icon-sm` | `w-4 h-4` |
| `.icon-md` | `w-5 h-5` |
| `.icon-lg` | `w-6 h-6` |

### Container

Max width: `1440px` with responsive padding (`1rem` / `1.5rem` / `2rem`).

### Border Radius

Tailored for institutional look:
- `sm`: 4px
- `md`: 6px
- `lg`: 8px
- `xl`: 12px

### Safelist

Dynamic classes that Tailwind's JIT compiler cannot detect are safelisted:
- Dynamic grid columns (`grid-cols-5` through `grid-cols-12`)
- Terminal status colors (`border-terminal-green`, `text-terminal-green`, etc.)
- Dark strip gradient classes
- Animation classes

---

## Style Classes System (`src/lib/styleClasses.ts`)

The primary styling API. Import `styles` for composable class strings and `cx()` for combining them.

```typescript
import { styles, cx } from "@/lib/styleClasses";
```

### Layout

| Style | Classes | Usage |
|-------|---------|-------|
| `styles.pageContainer` | `min-h-screen bg-surface-page` | Page wrapper |
| `styles.contentWrapper` | `mx-auto max-w-[1280px] px-4 md:px-8 lg:px-16` | Content container |
| `styles.sectionGap` | `space-y-4 md:space-y-8` | Vertical section spacing |
| `styles.contentArea` | `min-h-[300px] md:min-h-[600px]` | Minimum content height |

### Typography

#### Display (responsive hero sections)

| Style | Usage |
|-------|-------|
| `styles.displayLg` | `text-4xl md:text-5xl font-bold` — Hero headings |
| `styles.displayMd` | `text-3xl md:text-4xl font-bold` — Sub-hero headings |

#### Headings (fixed sizes)

| Style | Usage |
|-------|-------|
| `styles.headingLg` | `text-xl md:text-2xl font-semibold` — Page headings |
| `styles.headingMd` | `text-lg md:text-xl font-semibold` — Section headings |
| `styles.headingSm` | `text-base font-semibold` — Subsection headings |

#### Body Text

| Style | Usage |
|-------|-------|
| `styles.bodyLg` | `text-base text-text-secondary` — Large body text |
| `styles.bodyMd` | `text-sm text-text-secondary` — Standard body text |
| `styles.bodySm` | `text-xs text-text-secondary` — Small body text |

#### Values (Financial Metrics)

These use `tabular-nums` for aligned columns. They do NOT use `font-mono`.

| Style | Usage |
|-------|-------|
| `styles.valueLg` | `text-xl md:text-2xl font-semibold tabular-nums` — Large metrics |
| `styles.valueMd` | `text-lg font-medium tabular-nums` — Medium metrics |
| `styles.valueSm` | `text-sm font-medium tabular-nums` — Small metrics |
| `styles.valueXs` | `text-xs font-medium` — Tiny metrics |
| `styles.valuePositive` | Green text — positive values |
| `styles.valueNegative` | Red text — negative values |
| `styles.valueAccent` | Blue accent — highlighted values |

#### Labels

| Style | Usage |
|-------|-------|
| `styles.labelPrimary` | `text-[11px] uppercase tracking-wider` — Primary labels |
| `styles.labelSans` | `text-[11px] font-medium uppercase` — Sans-serif labels |
| `styles.labelSecondary` | `text-xs text-text-muted` — Secondary labels |
| `styles.caption` | `text-[10px] text-text-muted` — Timestamps, metadata |

#### Links

| Style | Usage |
|-------|-------|
| `styles.linkPrimary` | Primary link with hover |
| `styles.linkSecondary` | Secondary link with hover + underline |
| `styles.linkMuted` | Muted small link |

#### Tables

| Style | Usage |
|-------|-------|
| `styles.tableHeader` | `text-[10px] uppercase tracking-wider` |
| `styles.tableCell` | `text-sm text-text-primary` |
| `styles.tableCellMuted` | `text-sm text-text-secondary` |
| `styles.tableCellValue` | `text-sm font-medium tabular-nums` |

### Cards

```tsx
<div className={cx(styles.card, styles.cardPadding)}>
  Content
</div>

<div className={styles.cardInteractive}>
  Hoverable card with cursor pointer
</div>
```

| Style | Usage |
|-------|-------|
| `styles.card` | `bg-surface-card border border-subtle rounded-lg shadow-card` |
| `styles.cardInteractive` | Same + hover shadow/border + cursor pointer |
| `styles.cardPadding` | `p-3 sm:p-4 md:p-5` |
| `styles.cardPaddingLg` | `p-4 sm:p-5 md:p-6` |

### Buttons

Compose `btnBase` + variant + size:

```tsx
<button className={cx(styles.btnBase, styles.btnPrimary, styles.btnMd)}>
  Submit
</button>
```

**Variants:**
| Style | Appearance |
|-------|------------|
| `styles.btnPrimary` | Dark gray background, white text |
| `styles.btnSecondary` | Transparent with border |
| `styles.btnGhost` | Transparent, hover background |
| `styles.btnDanger` | Red background, white text |
| `styles.btnPrimaryDark` | White background, dark text (for dark surfaces) |
| `styles.btnSecondaryDark` | Transparent with white border (for dark surfaces) |

**Sizes:**
| Style | Dimensions |
|-------|------------|
| `styles.btnSm` | `px-3 py-1.5 text-xs h-8` |
| `styles.btnMd` | `px-4 py-2 text-sm h-10` |
| `styles.btnLg` | `px-6 py-3 text-base h-12` |

### Status Chips

Terminal-style border-only status indicators:

```tsx
<span className={cx(styles.chipBase, styles.chipOpen)}>OPEN</span>
```

| Style | Color | Used For |
|-------|-------|----------|
| `styles.chipOpen` | Green border + text | Open pools |
| `styles.chipFunded` | Green border + text | Funded pools |
| `styles.chipOngoing` | Amber border + text | Ongoing pools |
| `styles.chipPending` | Amber border + text | Pending items |
| `styles.chipClosed` | Gray border + text | Closed pools |
| `styles.chipRejected` | Red border + text | Rejected items |
| `styles.chipSettled` | Blue border + text | Settled pools |
| `styles.chipKycFree` | Black border + text | KYC-free pools |

### Terminal Data Strips

Bloomberg-style data display sections:

**Light variant:**
```tsx
<div className={styles.terminalStrip}>
  <div className={styles.terminalStripMetrics}>
    <div>
      <div className={styles.terminalStripMetricLabel}>TVL</div>
      <div className={styles.terminalStripMetricValue}>$1,234,567</div>
    </div>
  </div>
</div>
```

**Dark variant (portfolio header):**
```tsx
<div className={cx(styles.terminalStripDark, styles.terminalStripDarkBg)}>
  <div className={styles.terminalStripDarkAccent} />
  <div className={styles.terminalStripDarkLabel}>TOTAL VALUE</div>
  <div className={styles.terminalStripDarkValue}>$1,234,567</div>
</div>
```

### Dark Surface Text

For components rendered on dark backgrounds:

```tsx
<div className="bg-surface-dark p-6">
  <h2 className={styles.onDark.primary}>White heading</h2>
  <p className={styles.onDark.secondary}>70% white body text</p>
  <span className={styles.onDark.muted}>50% white label</span>
  <span className={styles.onDark.accent}>Blue accent</span>
</div>
```

### Grids

| Style | Layout |
|-------|--------|
| `styles.gridPools` | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` |
| `styles.gridOnboarding` | `grid-cols-1 md:grid-cols-2 gap-4` |
| `styles.gridMetrics` | `grid-cols-2 md:grid-cols-4 gap-4` |

### Navigation

```tsx
<a className={cx(styles.navTab, isActive ? styles.navTabActive : styles.navTabInactive)}>
  TAB NAME
</a>
```

### Header

| Style | Description |
|-------|-------------|
| `styles.header` | Dark gradient header bar |
| `styles.headerContent` | Header inner container with max-width |
| `styles.headerBtn` | Header button with subtle hover |

### Form Elements

| Style | Description |
|-------|-------------|
| `styles.input` | Text input with border, focus ring |
| `styles.select` | Select dropdown with border, focus ring |

### Skeleton Loading

```tsx
{/* Text skeleton */}
<div className={cx(styles.sk.base, styles.sk.textMd, "w-48")} />

{/* Icon skeleton */}
<div className={cx(styles.sk.base, styles.sk.icon)} />

{/* Dark surface skeleton */}
<div className={cx(styles.sk.dark, styles.sk.textMd, "w-32")} />

{/* Card skeleton */}
<div className={cx(styles.sk.card, "h-48")} />
```

Height tokens:
- `sk.textXs` (12px), `sk.textSm` (16px), `sk.textMd` (20px), `sk.textLg` (24px)
- `sk.heading` (32px), `sk.headingLg` (40px)

Size tokens:
- `sk.icon` (20x20), `sk.iconLg` (24x24)
- `sk.avatar` (40x40), `sk.avatarLg` (96x96)

Component tokens:
- `sk.chip` (20px), `sk.progress` (8px), `sk.btn` (40px), `sk.btnSm` (32px)

### Content Reveal

```tsx
<div className={styles.reveal.fadeIn}>Fade in content</div>
<div className={styles.reveal.fadeUp}>Fade up content</div>
```

---

## The `cx()` Helper

Combines class strings with conditional support:

```typescript
export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
```

Usage:

```tsx
<div className={cx(
  styles.card,
  styles.cardPadding,
  isActive && styles.cardInteractive,
  isDisabled && "opacity-50 pointer-events-none",
)}>
```

For more complex merging needs, `tailwind-merge` is also available in the project.

---

## Additional Exported Constants

### ICON_SIZES

```typescript
ICON_SIZES.button.sm   // "w-4 h-4"
ICON_SIZES.button.md   // "w-5 h-5"
ICON_SIZES.header.sidebar // "w-5 h-5"
ICON_SIZES.status.medium  // "w-12 h-12"
ICON_SIZES.card.avatar    // "w-20 h-20"
```

### TRANSITIONS

```typescript
TRANSITIONS.all       // "transition-all duration-150 ease-out"
TRANSITIONS.shadow    // "transition-shadow duration-150 ease-out"
TRANSITIONS.colors    // "transition-colors duration-100 ease-out"
TRANSITIONS.modal     // "transition-all duration-200 ease-out"
```

### TYPOGRAPHY_STYLES

Extended typography constants for forms and specific components:

```typescript
TYPOGRAPHY_STYLES.pageTitle       // text-3xl uppercase tracking-wider
TYPOGRAPHY_STYLES.formLabel       // text-sm font-medium
TYPOGRAPHY_STYLES.formErrorText   // text-xs text-terminal-red
TYPOGRAPHY_STYLES.metricValue     // text-2xl font-bold font-mono tabular-nums
```

### BUTTON_STYLES

Extended button style constants:

```typescript
BUTTON_STYLES.primary       // Full primary button styles
BUTTON_STYLES.secondary     // Bordered secondary button
BUTTON_STYLES.ghost         // Ghost button
BUTTON_STYLES.danger        // Danger/destructive button
```

---

## NextUI Theme Override

NextUI's theme is customized in `tailwind.config.ts`:

- **Primary color**: `#1A1A1A` (black, not the default blue). This affects all NextUI components using `color="primary"`.
- **Border radius**: Reduced for institutional look (`small: 4px`, `medium: 6px`, `large: 8px`)
- **Theme prefix**: `ina` (CSS classes prefixed with `ina-`)

---

## Background Patterns

CSS classes for Bloomberg-inspired background textures:

| Class | Description |
|-------|-------------|
| `terminal-herringbone` | Herringbone V-pattern (used by AppLayout) |
| `terminal-dots` | Dot matrix pattern |
| `terminal-losange` | Diamond/losange pattern |
| `terminal-grid` | Fine data grid |
| `terminal-hatch` | Diagonal hatch lines |
| `terminal-ambient` | Dots + gradient combination |
| `geometric-pattern` | Isometric chevron/diamond pattern |
| `geometric-pattern-dark` | Dark variant for dark backgrounds |
| `gradient-mesh` | Subtle radial gradients |

---

## Responsive Design

The application is mobile-first with breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px

Key responsive patterns:
- Content wrapper: `px-4 md:px-8 lg:px-16`
- Card padding: `p-3 sm:p-4 md:p-5`
- Grid layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Display headings: `text-4xl md:text-5xl`
- Admin sidebar: hidden on mobile, slide-in drawer on toggle

Mobile-specific CSS (`globals.css`):
- Input font size forced to 16px on mobile to prevent iOS zoom
- Tap highlight color removed
- Images and videos max-width 100%

---

## Accessibility in Styles

- `prefers-reduced-motion: reduce` media query disables all animations
- `.scrollbar-hide` utility hides scrollbars while maintaining scroll functionality
- Tabular numbers (`tabular-nums`) for aligned financial columns
- Focus rings on all interactive elements (`focus:ring-2`)

---

## Deprecated Aliases

The following are deprecated and should not be used in new code:

| Deprecated | Use Instead |
|-----------|-------------|
| `styles.label` | `styles.labelPrimary` |
| `styles.monoLg` | `styles.valueLg` |
| `styles.monoMd` | `styles.valueMd` |
| `styles.monoSm` | `styles.valueSm` |

The deprecated aliases use `font-mono` which is incorrect for financial values. The replacements use `tabular-nums` with the sans-serif font.

---

## Adding New Styles

1. **Design tokens** — Add to `:root` in `globals.css` and mirror in `tailwind.config.ts` colors
2. **Component patterns** — Add to the `styles` object in `styleClasses.ts`
3. **One-off styles** — Use Tailwind utility classes directly via `cx()`
4. **Dynamic classes** — Add to the `safelist` in `tailwind.config.ts` if generated dynamically
