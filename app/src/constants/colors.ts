/**
 * Color constants for the Minimalistic Institutional design system.
 * Aligned with MIGRATION_PLAN_REFINED.md
 *
 * 90% of UI uses grayscale (black/white/gray)
 * Blue ONLY appears in charts
 * Terminal colors ONLY for status indicators
 */

export const COLORS = {
  // Primary Palette (90% of UI)
  text: {
    primary: "#1A1A1A", // Headings, primary buttons, key content
    secondary: "#666666", // Body text, descriptions
    muted: "#999999", // Labels, captions, timestamps
  },

  // Pure extremes
  pure: {
    black: "#000000", // Logo, strong emphasis
    white: "#FFFFFF", // Card backgrounds
  },

  // Surfaces
  surface: {
    page: "#FAFAFA", // Page background
    card: "#FFFFFF", // Card backgrounds
    hover: "#F5F5F5", // Hover states, table rows
  },

  // Borders
  border: {
    subtle: "#E5E5E5", // Card borders, dividers
    default: "#D4D4D4", // Input borders, stronger dividers
  },

  // Chart Colors (ONLY blue in UI)
  chart: {
    blue500: "#0066CC", // Primary data series
    blue400: "#69B4FF", // Secondary data series
    blue300: "#91CAFF", // Tertiary/backgrounds
  },

  // Terminal Status Colors
  terminal: {
    green: "#00B341", // Success: Active, Approved, Funded
    amber: "#CC8800", // Warning: Pending, Under Review
    red: "#CC0000", // Error: Rejected, Failed, Overdue
    gray: "#666666", // Neutral: Draft, Inactive, N/A
  },

  // Legacy mappings for backwards compatibility
  brand: {
    darkBlue: "#1A1A1A", // Mapped to text.primary
    mediumBlue: "#1A1A1A",
    lightGreen: "#E6EBE6",
    lightBlue: "#91CAFF", // Mapped to chart.blue300
  },
  neutral: {
    superLightGray: "#FAFAFA",
    lightBackground: "#FAFAFA",
    lightGray: "#999999",
    mediumWhite: "#E5E5E5",
    mediumBlack: "#1A1A1A",
    darkGray: "#666666",
    nude: "#D4D4D4",
    mediumGray: "#666666",
  },
  status: {
    success: "#00B341",
    warning: "#CC8800",
    warningOrange: "#CC8800",
    warningLight: "#CC8800",
    info: "#0066CC",
  },
  white: "#FFFFFF",
} as const;

// Type exports for type-safe color access
export type TextColor = keyof typeof COLORS.text;
export type SurfaceColor = keyof typeof COLORS.surface;
export type BorderColor = keyof typeof COLORS.border;
export type ChartColor = keyof typeof COLORS.chart;
export type TerminalColor = keyof typeof COLORS.terminal;
