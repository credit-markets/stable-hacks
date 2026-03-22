"use client";

import { useUserRole } from "@/hooks/useUserRole";
import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import Link from "next/link";

export function AdminLinkButton() {
  const { data: roles, isLoading } = useUserRole();

  if (isLoading || !roles?.isAdmin) {
    return null;
  }

  return (
    <Link href="/admin" target="_blank">
      <Button className={cx(styles.headerBtn, "h-8")}>Admin Dashboard</Button>
    </Link>
  );
}
