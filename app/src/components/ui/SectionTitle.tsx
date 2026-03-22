import { TYPOGRAPHY_STYLES } from "@/lib/styleClasses";
import { cn } from "@nextui-org/theme";
import { type ReactNode, memo } from "react";

interface SectionTitleProps {
  level?: "page" | "section" | "subsection" | "card";
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const LEVEL_STYLES = {
  page: TYPOGRAPHY_STYLES.pageTitle,
  section: TYPOGRAPHY_STYLES.sectionTitle,
  subsection: TYPOGRAPHY_STYLES.sectionSubtitle,
  card: TYPOGRAPHY_STYLES.cardTitle,
};

const LEVEL_TAGS = {
  page: "h1",
  section: "h2",
  subsection: "h3",
  card: "h4",
} as const;

export const SectionTitle = memo(function SectionTitle({
  level = "section",
  children,
  icon,
  className,
}: SectionTitleProps) {
  const Component = LEVEL_TAGS[level];

  return (
    <Component className={cn(LEVEL_STYLES[level], className)}>
      {icon ? (
        <span className="inline-flex items-center gap-2">
          {icon}
          {children}
        </span>
      ) : (
        children
      )}
    </Component>
  );
});
