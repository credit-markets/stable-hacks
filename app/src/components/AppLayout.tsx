"use client";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { styles } from "@/lib/styleClasses";
import { Briefcase, Building2, ExternalLink, Home, User } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";

export type AppLayoutLink = {
  name: string;
  href: string;
  sidebar?: boolean;
  icon?: ReactNode;
};

const links = {
  app: [
    {
      name: "Marketplace",
      href: "/",
      sidebar: true,
      icon: <Home size={20} strokeWidth={2} />,
    },
    {
      name: "Portfolio",
      href: "/portfolio",
      sidebar: true,
      icon: <Briefcase size={20} strokeWidth={2} />,
    },
    {
      name: "Account",
      href: "/account",
      sidebar: true,
      icon: <User size={20} strokeWidth={2} />,
    },
    {
      name: "Manager",
      href: "/manager",
      sidebar: true,
      icon: <Building2 size={20} strokeWidth={2} />,
    },
    {
      name: "Manager Details",
      href: "/manager/profile",
      sidebar: false,
    },
  ],
  external: [
    {
      name: "Privacy Policy",
      href: "https://docs.credit.markets/legal-and-compliance/ina-protocol-terms-of-services/privacy-policy",
      icon: <ExternalLink size={16} />,
    },
    {
      name: "Terms of Service",
      href: "https://docs.credit.markets/legal-and-compliance/ina-protocol-terms-of-services/terms-and-conditions",
      icon: <ExternalLink size={16} />,
    },
    {
      name: "Docs",
      href: "https://docs.credit.markets/",
      icon: <ExternalLink size={16} />,
    },
  ],
} satisfies Record<string, AppLayoutLink[]>;

export type AppLinks = typeof links;

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div
      className={`${styles.pageContainer} terminal-herringbone flex flex-col min-h-screen`}
    >
      {/* Dark Header Bar */}
      <Header />

      {/* Main Content Area - flex-1 as direct flex child pushes footer down */}
      <main className="relative flex-1 pb-12">
        <div className="absolute top-0 left-0 right-0 h-[50px] bg-gradient-to-b from-black/[0.06] to-transparent z-[1] pointer-events-none" />
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
