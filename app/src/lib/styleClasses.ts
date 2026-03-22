/**
 * Centralized style classes for the Credit Markets design system.
 * Based on the Institutional Monochrome Light design direction.
 *
 * This file provides composable Tailwind class strings for consistent styling
 * across the application. Import `styles` for class strings and `cx` for
 * combining multiple classes with conditional support.
 */

export const styles = {
  // ─────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────
  pageContainer: "min-h-screen bg-surface-page",
  contentWrapper: "mx-auto max-w-[1280px] px-4 md:px-8 lg:px-16",
  sectionGap: "space-y-4 md:space-y-8",
  contentArea: "min-h-[300px] md:min-h-[600px]",

  // ─────────────────────────────────────────
  // Typography
  // ─────────────────────────────────────────

  // Display - responsive for hero sections
  displayLg: "text-4xl md:text-5xl font-bold tracking-tight text-text-primary",
  displayMd: "text-3xl md:text-4xl font-bold tracking-tight text-text-primary",

  // Headings - fixed sizes
  headingLg: "text-xl md:text-2xl font-semibold text-text-primary",
  headingMd: "text-lg md:text-xl font-semibold text-text-primary",
  headingSm: "text-base font-semibold text-text-primary",

  // Section titles (POOLS, ONBOARDING, etc.)
  sectionTitle:
    "text-sm font-semibold uppercase tracking-wider text-text-primary",

  // Body text
  bodyLg: "text-base text-text-secondary leading-relaxed",
  bodyMd: "text-sm text-text-secondary leading-relaxed",
  bodySm: "text-xs text-text-secondary leading-relaxed",

  // Values (Metrics, Numbers) - Sans-serif with tabular-nums, NO font-mono
  valueLg: "text-xl md:text-2xl font-semibold tabular-nums text-text-primary",
  valueMd: "text-lg font-medium tabular-nums text-text-primary",
  valueSm: "text-sm font-medium tabular-nums text-text-primary",
  valueXs: "text-xs font-medium text-text-primary",

  // Semantic value variants for financial context
  valuePositive: "text-lg font-semibold tabular-nums text-terminal-green",
  valueNegative: "text-lg font-semibold tabular-nums text-terminal-red",
  valueAccent: "text-2xl font-semibold tabular-nums text-strategic-blue",

  // Labels - two-tier hierarchy
  labelPrimary: "text-[11px] uppercase tracking-wider text-text-muted",
  /** Sans-serif uppercase label — for panel metrics (less technical feel than mono) */
  labelSans: "text-[11px] font-medium uppercase tracking-wide text-text-muted",
  labelSecondary: "text-xs text-text-muted",

  // Caption for timestamps, metadata
  caption: "text-[10px] text-text-muted",

  // Interactive / Links
  linkPrimary:
    "text-sm font-medium text-text-primary hover:text-strategic-blue transition-colors",
  linkSecondary:
    "text-sm text-text-secondary hover:text-text-primary hover:underline transition-colors",
  linkMuted:
    "text-xs text-text-muted hover:text-text-secondary transition-colors",

  // Table typography
  tableHeader: "text-[10px] uppercase tracking-wider text-text-muted",
  tableCell: "text-sm text-text-primary",
  tableCellMuted: "text-sm text-text-secondary",
  tableCellValue: "text-sm font-medium tabular-nums text-text-primary",

  // Accent text
  accentText: "text-strategic-blue",

  // ─────────────────────────────────────────
  // Dark Surface Colors (for OnboardingCard, TerminalDataStrip, PortfolioHeader)
  // Composable with typography tokens above
  // ─────────────────────────────────────────
  onDark: {
    primary: "text-white", // headings, strong emphasis
    secondary: "text-white/70", // body text, descriptions
    muted: "text-white/50", // labels, captions
    subtle: "text-white/30", // disabled, hints
    accent: "text-strategic-blue", // highlighted values
    danger: "text-red-400", // destructive actions (lighter red for dark bg)
  },

  // ─────────────────────────────────────────
  // Deprecated aliases (keep during transition, remove in Phase 5)
  // ─────────────────────────────────────────
  /** @deprecated Use labelPrimary instead */
  label: "text-[11px] font-mono uppercase tracking-wider text-text-muted",
  /** @deprecated Use valueLg instead */
  monoLg: "text-2xl font-semibold tabular-nums text-text-primary",
  /** @deprecated Use valueMd instead */
  monoMd: "text-lg font-medium tabular-nums text-text-primary",
  /** @deprecated Use valueSm instead */
  monoSm: "text-sm tabular-nums text-text-secondary",

  // ─────────────────────────────────────────
  // Cards
  // ─────────────────────────────────────────
  card: "bg-surface-card border border-subtle rounded-lg shadow-card",
  cardInteractive:
    "bg-surface-card border border-subtle rounded-lg shadow-card hover:shadow-card-hover hover:border-border-default transition-all duration-150 cursor-pointer",
  cardPadding: "p-3 sm:p-4 md:p-5",
  cardPaddingLg: "p-4 sm:p-5 md:p-6",

  // ─────────────────────────────────────────
  // Buttons
  // ─────────────────────────────────────────
  btnBase:
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-primary/20 disabled:opacity-50 disabled:cursor-not-allowed",
  btnPrimary:
    "bg-dimensional-gray text-white shadow-card hover:bg-dimensional-gray-hover hover:shadow-card-hover",
  btnSecondary:
    "bg-transparent text-text-primary border border-border-default hover:bg-surface-hover hover:border-text-muted",
  btnGhost: "bg-transparent text-text-primary hover:bg-surface-hover",
  btnDanger: "bg-terminal-red text-white hover:bg-red-700",

  // Button sizes
  btnSm: "px-3 py-1.5 text-xs h-8",
  btnMd: "px-4 py-2 text-sm h-10",
  btnLg: "px-6 py-3 text-base h-12",

  // ─────────────────────────────────────────
  // Status chips (terminal style - border only)
  // ─────────────────────────────────────────
  chipBase:
    "inline-flex items-center px-2 py-0.5 rounded-sm font-mono text-[10px] font-medium uppercase tracking-wider bg-transparent",
  chipOpen: "border border-terminal-green text-terminal-green",
  chipFunded: "border border-terminal-green text-terminal-green",
  chipOngoing: "border border-terminal-amber text-terminal-amber",
  chipPending: "border border-terminal-amber text-terminal-amber",
  chipKycFree: "border border-text-primary text-text-primary",
  chipClosed: "border border-terminal-gray text-terminal-gray",
  chipRejected: "border border-terminal-red text-terminal-red",
  chipSettled: "border border-strategic-blue text-strategic-blue",

  // ─────────────────────────────────────────
  // Terminal Data Strip
  // ─────────────────────────────────────────
  terminalStrip: "bg-surface-card border border-subtle rounded-lg px-4 py-3",
  terminalStripMetrics: "flex items-center gap-3 sm:gap-6 flex-wrap",
  terminalStripMetricLabel:
    "text-[10px] font-mono uppercase tracking-wider text-text-muted",
  terminalStripMetricValue: "text-lg font-mono font-medium text-text-primary",
  terminalStripSeparator: "text-text-muted/50 hidden sm:inline",
  terminalStripActions: "flex items-center gap-1.5 sm:gap-2",

  // Dark Terminal Strip (for Portfolio)
  terminalStripDark: "relative rounded-lg px-5 py-4 overflow-hidden",
  terminalStripDarkBg:
    "bg-gradient-to-br from-[#454545] via-[#393939] to-[#2d2d2d]",
  terminalStripDarkAccent:
    "absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-strategic-blue/30 to-transparent",
  terminalStripDarkLabel:
    "text-[11px] font-mono uppercase tracking-wider text-white/70",
  terminalStripDarkValue:
    "text-lg font-mono font-medium text-white tabular-nums",
  terminalStripDarkValueAccent:
    "text-lg font-mono font-medium text-strategic-blue tabular-nums",
  terminalStripDarkSeparator: "text-white/20 hidden sm:inline",

  // Dark button variants
  btnPrimaryDark: "bg-white text-deep-black hover:bg-white/90",
  btnSecondaryDark:
    "bg-transparent text-white border border-white/30 hover:bg-white/10 hover:border-white/50",
  btnTerminalText: "text-[11px] font-mono uppercase tracking-wider",

  // ─────────────────────────────────────────
  // Terminal Section Dividers
  // ─────────────────────────────────────────
  terminalSectionHeader:
    "text-[11px] font-mono uppercase tracking-widest text-text-muted",
  terminalDivider: "flex items-center gap-3 my-4",
  terminalDividerLine: "flex-1 border-t border-subtle",
  terminalDividerText:
    "text-[10px] font-mono uppercase tracking-wider text-text-muted",
  terminalTableHeader:
    "text-[10px] font-mono uppercase tracking-wider text-text-muted",
  terminalTableSeparator: "border-t border-dotted border-subtle mt-2 mb-3",

  // ─────────────────────────────────────────
  // Header (dark)
  // ─────────────────────────────────────────
  header:
    "h-16 bg-gradient-to-b from-[#333] to-[#2A2A2A] shadow-[0_4px_20px_rgba(0,0,0,0.25)] sticky top-0 z-50",
  headerContent:
    "h-full mx-auto max-w-[1400px] px-4 lg:px-12 flex items-center justify-between",
  headerBtn:
    "flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-md text-white text-sm hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.07)] transition-all duration-150",

  // ─────────────────────────────────────────
  // Navigation tabs (Bloomberg Terminal style)
  // ─────────────────────────────────────────
  navTab:
    "pb-2 text-sm font-medium uppercase tracking-wider transition-colors duration-150",
  navTabActive: "text-text-primary border-b-2 border-text-primary",
  navTabInactive: "text-text-muted hover:text-text-secondary",

  // ─────────────────────────────────────────
  // Grids
  // ─────────────────────────────────────────
  gridPools: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5",
  gridOnboarding: "grid grid-cols-1 md:grid-cols-2 gap-4",
  gridMetrics: "grid grid-cols-2 md:grid-cols-4 gap-4",

  // ─────────────────────────────────────────
  // Form elements
  // ─────────────────────────────────────────
  input:
    "w-full px-3 py-2 bg-surface-card border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text-primary/20 focus:border-text-primary transition-all duration-150",
  select:
    "w-full px-3 py-2 bg-surface-card border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary/20 focus:border-text-primary transition-all duration-150",

  // ─────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────
  divider: "border-t border-subtle",

  // ─────────────────────────────────────────
  // Skeleton & Loading States
  // ─────────────────────────────────────────
  sk: {
    // Base shimmer — terminal scan-line effect
    base: "shimmer-gradient animate-terminal-shimmer rounded",
    // Dark variant for dark surfaces (terminal strips, portfolio header)
    dark: "shimmer-gradient-dark animate-terminal-shimmer rounded",

    // Height tokens (fixed dimensions prevent CLS)
    textXs: "h-3", // 12px — captions, timestamps
    textSm: "h-4", // 16px — body text, table cell values
    textMd: "h-5", // 20px — labels, medium text
    textLg: "h-6", // 24px — section titles
    heading: "h-8", // 32px — page headings
    headingLg: "h-10", // 40px — display headings, buttons

    // Size tokens (width + height)
    icon: "h-5 w-5", // 20px — standard icons
    iconLg: "h-6 w-6", // 24px — large icons
    avatar: "h-10 w-10", // 40px — pool logos, user avatars
    avatarLg: "h-24 w-24", // 96px — large logos (manager profile)

    // Component tokens
    chip: "h-5", // 20px — status chips
    progress: "h-2", // 8px — progress bars
    btn: "h-10", // 40px — button placeholders
    btnSm: "h-8", // 32px — small buttons

    // Card-level skeleton
    card: "shimmer-gradient animate-terminal-shimmer rounded-lg border border-subtle",
  },

  // Content reveal animation classes
  reveal: {
    fadeIn: "animate-fade-in",
    fadeUp: "animate-fade-up",
  },
} as const;

/**
 * Combines multiple style class strings with conditional support.
 * Alternative to cn() from tailwind-merge for simpler cases.
 */
export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─────────────────────────────────────────
// Utility constants (migrated from constants/styleClasses.ts)
// ─────────────────────────────────────────

export const ICON_SIZES = {
  button: { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" },
  header: { sidebar: "w-5 h-5", breadcrumb: "w-4 h-4", navbar: "w-6 h-6" },
  status: { small: "w-4 h-4", medium: "w-12 h-12", large: "w-16 h-16" },
  card: { metric: "w-3 h-3", avatar: "w-20 h-20", modal: "w-24 h-24" },
  misc: { pagination: "w-4 h-4", externalLink: "w-4 h-4", badge: "w-4 h-4" },
} as const;

export const TRANSITIONS = {
  all: "transition-all duration-150 ease-out",
  shadow: "transition-shadow duration-150 ease-out",
  colors: "transition-colors duration-100 ease-out",
  opacity: "transition-opacity duration-100 ease-out",
  transform: "transition-transform duration-150 ease-out",
  modal: "transition-all duration-200 ease-out",
  none: "transition-none",
} as const;

export const TYPOGRAPHY_STYLES = {
  pageTitle: "text-3xl font-bold text-text-primary uppercase tracking-wider",
  sectionTitle:
    "text-xl font-semibold text-text-primary uppercase tracking-wider mb-4",
  sectionSubtitle: "text-lg font-semibold text-text-primary mb-3",
  cardTitle: "text-lg font-semibold text-text-primary",
  cardSubtitle: "text-base font-medium text-text-secondary",
  formLabel: "text-sm font-medium text-text-primary",
  formLabelRequired:
    "text-sm font-medium text-text-primary after:content-['*'] after:ml-0.5 after:text-terminal-red",
  formHelperText: "text-xs text-text-muted mt-1",
  formErrorText: "text-xs text-terminal-red mt-1",
  formInput: "text-sm text-text-primary",
  bodyLarge: "text-base text-text-secondary leading-6",
  bodyMedium: "text-sm text-text-secondary leading-5",
  bodySmall: "text-xs text-text-muted leading-4",
  metricValue: "text-2xl font-bold text-text-primary font-mono tabular-nums",
  metricLabel: "text-xs font-medium uppercase tracking-wider text-text-muted",
  statusLabel: "text-xs font-mono font-medium uppercase tracking-wide",
} as const;

export const BUTTON_STYLES = {
  primary:
    "text-sm font-medium text-white bg-text-primary hover:bg-pure-black active:bg-text-secondary py-2 px-4 rounded-md shadow-sm hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-primary/20",
  secondary:
    "text-sm font-medium text-text-primary bg-transparent border border-border-default hover:bg-surface-hover py-2 px-4 rounded-md transition-all duration-150",
  ghost:
    "text-sm font-medium text-text-primary hover:bg-surface-hover py-2 px-4 rounded-md transition-all duration-150",
  danger:
    "text-sm font-medium text-white bg-terminal-red hover:opacity-90 py-2 px-4 rounded-md transition-all duration-150",
  primaryBordered:
    "border gap-4 text-text-primary border-border-default rounded-md",
  viewPool: "border gap-4 text-text-primary border-border-default rounded-md",
  icon: {
    primary: "text-text-primary",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  },
} as const;
