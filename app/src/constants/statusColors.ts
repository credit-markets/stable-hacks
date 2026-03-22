/**
 * Status color definitions using terminal-inspired colors.
 */

// Terminal color tokens
const TERMINAL = {
  green: "#00B341",
  amber: "#CC8800",
  red: "#CC0000",
  gray: "#666666",
} as const;

// Status chip style variants
export const STATUS_CHIP_STYLES = {
  success: "bg-terminal-green/10 text-terminal-green",
  warning: "bg-terminal-amber/10 text-terminal-amber",
  error: "bg-terminal-red/10 text-terminal-red",
  neutral: "bg-terminal-gray/10 text-terminal-gray",
} as const;

export const STATUS_COLORS = {
  // Pool lifecycle (binary)
  NOT_DEPLOYED: {
    variant: "neutral" as const,
    chip: "default" as const,
    label: "NOT DEPLOYED",
    style: STATUS_CHIP_STYLES.neutral,
  },
  DEPLOYED: {
    variant: "success" as const,
    chip: "success" as const,
    label: "DEPLOYED",
    style: STATUS_CHIP_STYLES.success,
  },
  // Pool product states
  HOLDING: {
    variant: "neutral" as const,
    chip: "default" as const,
    label: "HOLDING",
    style: STATUS_CHIP_STYLES.neutral,
  },
  MATURED: {
    variant: "success" as const,
    chip: "success" as const,
    label: "MATURED",
    style: STATUS_CHIP_STYLES.success,
  },
  DEFAULTED: {
    variant: "error" as const,
    chip: "danger" as const,
    label: "DEFAULTED",
    style: STATUS_CHIP_STYLES.error,
  },
  // User roles
  USER: {
    variant: "neutral" as const,
    chip: "default" as const,
    label: "USER",
    style: STATUS_CHIP_STYLES.neutral,
  },
  MANAGER: {
    variant: "success" as const,
    chip: "success" as const,
    label: "MANAGER",
    style: STATUS_CHIP_STYLES.success,
  },
  ADMIN: {
    variant: "warning" as const,
    chip: "warning" as const,
    label: "ADMIN",
    style: STATUS_CHIP_STYLES.warning,
  },
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;
export type StatusVariant = "success" | "warning" | "error" | "neutral";

export const getStatusColor = (key: StatusKey) => STATUS_COLORS[key];

export const getTerminalColor = (variant: StatusVariant): string => {
  const map: Record<StatusVariant, string> = {
    success: TERMINAL.green,
    warning: TERMINAL.amber,
    error: TERMINAL.red,
    neutral: TERMINAL.gray,
  };
  return map[variant];
};
