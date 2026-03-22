/**
 * Chart color palette for data visualizations.
 *
 * IMPORTANT: This is the ONLY place blue appears in the UI.
 * All other UI elements use grayscale.
 *
 * Aligned with MIGRATION_PLAN_REFINED.md
 */

// Primary blue gradient for charts
export const CHART_BLUE = {
  500: "#0066CC", // Primary data series, main metrics
  400: "#69B4FF", // Secondary data series
  300: "#91CAFF", // Tertiary data series, area fills
} as const;

// Extended grayscale palette for multi-series charts
export const CHART_GRAYS = [
  "#1A1A1A", // Primary gray (darkest)
  "#333333",
  "#4D4D4D",
  "#666666",
  "#808080",
  "#999999",
  "#B3B3B3",
  "#CCCCCC",
  "#E5E5E5", // Lightest gray
] as const;

// Combined chart color palette (blue + grays)
export const CHART_COLORS = [
  "#0066CC", // Primary blue
  "#1A1A1A", // Primary gray
  "#69B4FF", // Secondary blue
  "#666666", // Medium gray
  "#91CAFF", // Tertiary blue
  "#999999", // Light gray
  "#B3B3B3",
  "#CCCCCC",
  "#E5E5E5",
] as const;

export type ChartColor = (typeof CHART_COLORS)[number];
export type ChartBlueShade = keyof typeof CHART_BLUE;

/**
 * Specific colors for earnings chart bars
 */
export const EARNINGS_COLORS = {
  interest: "#0066CC", // Blue for interest
  principal: "#1A1A1A", // Black for principal
} as const;

/**
 * Get a color from the chart palette by index.
 * Loops back to start if index exceeds palette length.
 */
export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

/**
 * Get a shade of blue for gradient effects
 */
export const getChartBlue = (shade: ChartBlueShade = 500): string => {
  return CHART_BLUE[shade];
};
