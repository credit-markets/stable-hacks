import { cx, styles } from "@/lib/styleClasses";

type ShimmerSize =
  | "textXs"
  | "textSm"
  | "textMd"
  | "textLg"
  | "heading"
  | "headingLg"
  | "icon"
  | "iconLg"
  | "avatar"
  | "avatarLg"
  | "chip"
  | "progress"
  | "btn"
  | "btnSm";

interface ShimmerProps {
  /** Predefined height from the skeleton dimension scale */
  size?: ShimmerSize;
  /** Width class (Tailwind) — e.g., "w-32", "w-full", "w-3/4" */
  width?: string;
  /** Use dark variant for dark backgrounds */
  dark?: boolean;
  /** Override border-radius — defaults to "rounded" from sk.base */
  rounded?: string;
  /** Additional classes */
  className?: string;
}

export function Shimmer({
  size,
  width,
  dark = false,
  rounded,
  className,
}: ShimmerProps) {
  const base = dark ? styles.sk.dark : styles.sk.base;
  const sizeClass = size ? styles.sk[size] : undefined;

  return (
    <div
      role="presentation"
      aria-hidden
      className={cx(base, sizeClass, width, rounded, className)}
    />
  );
}
