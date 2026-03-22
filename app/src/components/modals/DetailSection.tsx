import { ICON_SIZES } from "@/lib/styleClasses";
import { Divider } from "@nextui-org/divider";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import type { ReactNode } from "react";

interface DetailSectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  showDivider?: boolean;
}

export function DetailSection({
  title,
  icon: Icon,
  children,
  showDivider = false,
}: DetailSectionProps): React.ReactElement {
  return (
    <>
      {showDivider && <Divider />}
      <div>
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          {Icon && <Icon className={`${ICON_SIZES.button.md} text-primary`} />}
          {title}
        </h4>
        {children}
      </div>
    </>
  );
}
