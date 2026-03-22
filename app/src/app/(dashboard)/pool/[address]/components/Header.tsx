"use client";

import type { Pool } from "@/services/api";
import PAGES from "@/utils/pages";
import { Link } from "@nextui-org/link";

export function Header({ data }: { data: Pool }) {
  return (
    <div>
      <h1 className="font-bold text-3xl text-text-primary">{data.title}</h1>
      <div className="flex items-center gap-1 text-sm">
        <span>
          Managed by{" "}
          <Link
            href={PAGES.MANAGER.PROFILE.BY_ADDRESS(data.manager_address || "")}
            className="text-brand-medium-blue hover:underline font-medium"
          >
            {data.manager_name || data.manager_address}
          </Link>
        </span>
        <span>|</span>
        <span className="flex items-center gap-1">USDC</span>
      </div>
    </div>
  );
}
