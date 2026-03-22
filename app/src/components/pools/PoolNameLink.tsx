import { IconText } from "@/components/ui/IconText";
import { ICON_SIZES } from "@/lib/styleClasses";
import { Link } from "@nextui-org/link";
import { ExternalLink } from "lucide-react";

interface PoolNameLinkProps {
  poolId: string;
  name: string;
}

export function PoolNameLink({ poolId, name }: PoolNameLinkProps) {
  return (
    <Link href={`/pool/${poolId}`} target="_blank">
      <IconText
        icon={<ExternalLink className={ICON_SIZES.button.sm} />}
        size="sm"
      >
        {name}
      </IconText>
    </Link>
  );
}
