"use client";

import useUserRole from "@/hooks/useUserRole";
import { cx, styles } from "@/lib/styleClasses";
import {
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
} from "lucide-react";
import Link from "next/link";

const allCards = [
  {
    icon: <UserRound className="w-6 h-6" />,
    title: "Users",
    desc: "Manage platform users",
    href: "/admin/users",
    adminOnly: true,
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Pools",
    desc: "Manage pools and deployments",
    href: "/admin/pools",
    adminOnly: true,
  },
  {
    icon: <UserCog className="w-6 h-6" />,
    title: "Managers",
    desc: "Manage fund managers",
    href: "/admin/managers",
    adminOnly: true,
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "KYB Queue",
    desc: "Review KYB submissions",
    href: "/admin/kyb-queue",
    adminOnly: false,
  },
  {
    icon: <ScrollText className="w-6 h-6" />,
    title: "Event Log",
    desc: "Platform execution events",
    href: "/admin/events",
    adminOnly: true,
  },
];

export default function AdminDashboard() {
  const { data: roles } = useUserRole();
  const visibleCards = roles?.isAdmin
    ? allCards
    : allCards.filter((c) => !c.adminOnly);

  return (
    <div className="space-y-6">
      <h1 className={styles.headingLg}>Admin Dashboard</h1>
      <p className={styles.bodyMd}>
        Welcome to the Credit Markets Admin Dashboard. Use the sidebar or cards
        below to navigate.
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={cx(
              styles.card,
              styles.cardInteractive,
              styles.cardPadding,
            )}
          >
            <h3 className={cx(styles.headingSm, "flex items-center gap-2")}>
              {card.icon}
              {card.title}
            </h3>
            <p className={cx(styles.bodyMd, "mt-2")}>{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
