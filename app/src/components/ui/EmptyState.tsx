import { cn } from "@nextui-org/theme";
import type { ReactNode, memo } from "react";
import { memo as memoize } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "py-4",
  md: "py-8",
  lg: "py-8 md:py-12",
} as const;

const ICON_SIZES = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
} as const;

export const EmptyState = memoize(function EmptyState({
  icon,
  title,
  message,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {icon ? (
        <div className={cn("text-default-400 mb-4", ICON_SIZES[size])}>
          {icon}
        </div>
      ) : null}
      <p className="text-base font-medium text-default-700 mb-2">{title}</p>
      {message ? (
        <p className="text-sm text-default-500 mb-4 max-w-md">{message}</p>
      ) : null}
      {action}
    </div>
  );
});
