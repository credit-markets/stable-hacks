"use client";

import { AdminLinkButton } from "@/components/AdminLinkButton";
import { NotificationButton } from "@/components/NotificationButton";
import { Logo } from "@/components/icons/ina";
import { styles } from "@/lib/styleClasses";
import Link from "next/link";
import { HeaderConnectButton } from "./HeaderConnectButton";

export function Header() {
  return (
    <header className={`${styles.header} header-highlight`}>
      <div className={styles.headerContent}>
        {/* Left: Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <Logo size={32} color="#FFFFFF" />
          <span className="text-text-inverse font-semibold text-lg hidden sm:block tracking-tight">
            CREDIT MARKETS
          </span>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Link */}
          <div className="hidden lg:block">
            <AdminLinkButton />
          </div>

          {/* Notifications */}
          <HeaderNotificationButton />

          {/* Wallet / Account Button */}
          <HeaderConnectButton />
        </div>
      </div>
    </header>
  );
}

function HeaderNotificationButton() {
  return (
    <div className="[&_button]:bg-[rgba(255,255,255,0.04)] [&_button]:border [&_button]:border-[rgba(255,255,255,0.08)] [&_button]:hover:bg-[rgba(255,255,255,0.07)] [&_button]:hover:border-[rgba(255,255,255,0.15)] [&_button]:h-[44px] [&_button]:w-[44px] [&_button]:min-w-[44px] [&_svg]:text-white">
      <NotificationButton />
    </div>
  );
}
