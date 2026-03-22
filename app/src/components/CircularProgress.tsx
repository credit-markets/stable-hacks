"use client";

import { cx } from "@/lib/styleClasses";

interface CircularProgressProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Size of the circle in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Additional className for the container */
  className?: string;
  /** Show percentage text in center */
  showPercentage?: boolean;
  /** Stroke color override (defaults to strategic-blue) */
  color?: string;
}

/**
 * Circular progress indicator with strategic-blue fill on dark track.
 * Used in the OnboardingCard header.
 */
export function CircularProgress({
  value,
  size = 40,
  strokeWidth = 3,
  className,
  showPercentage = false,
  color = "#79c2ff",
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress: ${Math.round(value)}%`}
      tabIndex={0}
      className={cx("relative", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress indicator */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showPercentage && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-medium text-white/70">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
