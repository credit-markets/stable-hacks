import { cn } from "@nextui-org/theme";
import { type ReactNode, memo } from "react";

interface IconTextProps {
  icon: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}

const GAP_MAP = {
  sm: "gap-1",
  md: "gap-2",
  lg: "gap-3",
} as const;

export const IconText = memo(function IconText({
  icon,
  size = "md",
  children,
  className,
}: IconTextProps) {
  return (
    <div className={cn("flex items-center", GAP_MAP[size], className)}>
      {icon}
      <span>{children}</span>
    </div>
  );
});
