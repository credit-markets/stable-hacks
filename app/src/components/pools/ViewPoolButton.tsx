import { BUTTON_STYLES } from "@/lib/styleClasses";
import PAGES from "@/utils/pages";
import { Button } from "@nextui-org/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface ViewPoolButtonProps {
  poolId: string;
}

export function ViewPoolButton({ poolId }: ViewPoolButtonProps) {
  return (
    <Button
      as={Link}
      href={PAGES.POOL.DETAILS(poolId)}
      className={BUTTON_STYLES.viewPool}
      variant="bordered"
      radius="md"
      size="sm"
      startContent={<ExternalLink className={BUTTON_STYLES.icon.sm} />}
    >
      View Pool
    </Button>
  );
}
