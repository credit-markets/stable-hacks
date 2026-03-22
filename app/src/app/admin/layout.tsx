"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import useUserRole from "@/hooks/useUserRole";
import { cx, styles } from "@/lib/styleClasses";
import {
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  const { data: roles, isLoading: isRolesLoading } = useUserRole();

  const allTabs = [
    {
      icon: <UserRound className={"w-5 h-5"} />,
      name: "Users",
      href: "/users",
      adminOnly: true,
    },
    {
      icon: <Settings className={"w-5 h-5"} />,
      name: "Pools",
      href: "/pools",
      adminOnly: true,
    },
    {
      icon: <UserCog className={"w-5 h-5"} />,
      name: "Managers",
      href: "/managers",
      adminOnly: true,
    },
    {
      icon: <ShieldCheck className={"w-5 h-5"} />,
      name: "KYB Queue",
      href: "/kyb-queue",
      adminOnly: false,
    },
    {
      icon: <ScrollText className={"w-5 h-5"} />,
      name: "Event Log",
      href: "/events",
      adminOnly: true,
    },
  ];

  const visibleTabs =
    isRolesLoading || roles?.isAdmin
      ? allTabs
      : allTabs.filter((t) => !t.adminOnly);

  return (
    <div className="flex min-h-screen flex-col bg-surface-card">
      {/* Top Navbar */}
      <header className="">
        <div className="w-full h-16 px-4">
          <div className="flex items-center justify-between w-full h-16">
            <div className="flex-grow">
              <Link href="/" className="flex items-center gap-2">
                <span className={styles.headingMd}>Credit Markets Admin</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden text-text-primary p-2"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 relative">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsSidebarOpen(false);
            }}
            role="button"
            tabIndex={0}
            aria-label="Close navigation"
          />
        )}

        {/* Sidebar -- hidden on mobile, slide-in drawer when toggled */}
        <aside
          className={`fixed top-16 left-0 bottom-0 z-40 w-60 bg-surface-card transition-transform duration-200 lg:static lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="flex flex-col py-4">
            {/* GENERAL Section */}
            <div className="mb-4">
              <h3 className={cx(styles.labelPrimary, "px-6 mb-2")}>GENERAL</h3>
              {visibleTabs.map((item) => {
                const isActive = pathname.includes(item.href);
                return (
                  <Link
                    key={item.href}
                    href={`/admin${item.href}`}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-6 py-2.5 transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-text-primary hover:bg-surface-hover"
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content -- full width on mobile */}
        <main className="flex-1 p-4 md:p-6 w-full">
          <div className="mx-auto max-w-7xl">
            <Suspense fallback={<LoadingOverlay height="lg" />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
