"use client";

import { clearAuthCookies } from "@/app/actions/auth";
import { useManagerProfile } from "@/hooks/managers/useManagerProfile";
import { logger } from "@/lib/logger";
import { styles } from "@/lib/styleClasses";
import { formatAddress } from "@/utils/formatAddress";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown";
import { Building2, ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

export function HeaderConnectButton() {
  const { user, handleLogOut, primaryWallet, sdkHasLoaded } =
    useDynamicContext();
  const { data: managerProfile } = useManagerProfile();

  // Show button shell with shimmer address while Dynamic Labs SDK is initializing
  if (!sdkHasLoaded) {
    return (
      <button type="button" className={`${styles.headerBtn} max-w-[200px]`}>
        <User className="w-4 h-4 flex-shrink-0" />
        <span className="truncate font-mono tracking-tight text-transparent">
          <span className="inline-block w-full h-3.5 shimmer-gradient-dark animate-terminal-shimmer rounded align-middle">
            4abVRT...Enrd
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-text-inverse-muted flex-shrink-0" />
      </button>
    );
  }

  const performLogout = async () => {
    await clearAuthCookies();
    await handleLogOut();
    window.location.href = "/login";
  };

  const handleLogout = async () => {
    try {
      await performLogout();
    } catch (error) {
      logger.error("Logout error", error, {
        component: "HeaderConnectButton",
        operation: "handleLogout",
      });
      window.location.href = "/login";
    }
  };

  const displayContent = (() => {
    if (user?.email) return user.email;
    if (primaryWallet?.address) return formatAddress(primaryWallet.address);
    return "Connect Wallet";
  })();

  const isWalletAddress = !user?.email && primaryWallet?.address;
  const isConnected = !!user || !!primaryWallet?.address;

  if (!isConnected) {
    return (
      <a href="/login" className={`${styles.headerBtn} px-4 font-medium`}>
        Connect Wallet
      </a>
    );
  }

  return (
    <>
      <Dropdown
        classNames={{
          content:
            "bg-surface-card border border-subtle rounded-lg shadow-card p-1 min-w-[200px]",
        }}
      >
        <DropdownTrigger>
          <button type="button" className={`${styles.headerBtn} max-w-[200px]`}>
            <User className="w-4 h-4 flex-shrink-0" />
            <span
              className={`truncate ${isWalletAddress ? "font-mono tracking-tight" : ""}`}
            >
              {displayContent}
            </span>
            <ChevronDown className="w-4 h-4 text-text-inverse-muted flex-shrink-0" />
          </button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Account actions"
          variant="flat"
          classNames={{
            base: "p-0",
            list: "gap-0",
          }}
          itemClasses={{
            base: `
              text-text-primary text-sm font-medium
              py-2.5 px-3 rounded-md
              hover:bg-surface-hover
              transition-colors duration-150
              data-[hover=true]:bg-surface-hover
              data-[hover=true]:text-text-primary
            `,
          }}
        >
          <DropdownItem
            key="account"
            as={Link}
            href="/account"
            startContent={<Settings className="w-4 h-4 text-text-muted" />}
          >
            Account
          </DropdownItem>
          <DropdownItem
            key="manager"
            as={Link}
            href="/manager"
            className={!managerProfile ? "hidden" : ""}
            startContent={<Building2 className="w-4 h-4 text-text-muted" />}
          >
            Manager
          </DropdownItem>
          <DropdownItem
            key="log-out"
            onClick={handleLogout}
            startContent={<LogOut className="w-4 h-4 text-text-muted" />}
          >
            Log out
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </>
  );
}
