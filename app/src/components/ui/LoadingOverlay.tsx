import { Spinner } from "@nextui-org/react";
import { cn } from "@nextui-org/theme";
import { memo } from "react";

interface LoadingOverlayProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  height?: "auto" | "sm" | "md" | "lg" | "full";
  className?: string;
}

const HEIGHT_MAP = {
  auto: "",
  sm: "py-4",
  md: "py-8",
  lg: "h-64",
  full: "h-full",
} as const;

export const LoadingOverlay = memo(function LoadingOverlay({
  size = "md",
  label,
  height = "md",
  className,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        HEIGHT_MAP[height],
        className,
      )}
    >
      <Spinner size={size} label={label} />
    </div>
  );
});
