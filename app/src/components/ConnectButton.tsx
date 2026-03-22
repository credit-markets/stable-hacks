"use client";
import { clearAuthCookies } from "@/app/actions/auth";
import { logger } from "@/lib/logger";
import { ICON_SIZES, TRANSITIONS } from "@/lib/styleClasses";
import { formatAddress } from "@/utils/formatAddress";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Button } from "@nextui-org/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown";
import { ChevronDown } from "lucide-react";

export function ConnectButton() {
  const { user, handleLogOut, primaryWallet } = useDynamicContext();

  // Shared logout cleanup function
  const performLogout = async () => {
    await clearAuthCookies();
    await handleLogOut();
    window.location.href = "/login";
  };

  const handleLogout = async () => {
    try {
      await performLogout();
    } catch (error) {
      logger.error("Logout error", error, { component: "ConnectButton" });
      window.location.href = "/login";
    }
  };

  // Determine display content and icon
  const displayContent = (() => {
    if (user?.email) return user.email;
    if (primaryWallet?.address) return formatAddress(primaryWallet.address);
    return "Not connected";
  })();

  // Check if displaying a wallet address (for monospace styling)
  const isWalletAddress = !user?.email && primaryWallet?.address;

  return (
    <>
      <div className="relative mx-auto mt-4 sm:mt-10 flex w-fit lg:mt-0">
        <Dropdown
          classNames={{
            content:
              "bg-surface-card border border-subtle rounded-lg shadow-card p-1 min-w-[200px]",
          }}
        >
          <DropdownTrigger>
            <Button
              className={`
                bg-text-primary hover:bg-pure-black active:bg-text-secondary
                text-white text-sm lg:text-base font-medium
                h-[44px] px-4 lg:px-5
                rounded-md
                ${TRANSITIONS.all}
                flex items-center gap-2
              `}
              disableRipple
            >
              {/* Display content - monospace for wallet addresses */}
              <span
                className={`${isWalletAddress ? "font-mono tracking-tight" : ""}`}
              >
                {displayContent}
              </span>

              {/* Dropdown indicator */}
              <ChevronDown
                className={`${ICON_SIZES.button.sm} text-white/70 hidden lg:block`}
              />
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Account actions"
            variant="flat"
            classNames={{
              base: "p-0",
              list: "gap-1",
            }}
            itemClasses={{
              base: `
                text-text-primary text-sm font-medium
                py-2.5 px-3 rounded-md
                hover:bg-surface-hover
                ${TRANSITIONS.colors}
                data-[hover=true]:bg-surface-hover
              `,
            }}
          >
            <DropdownItem key="log-out" onClick={handleLogout}>
              Log out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </>
  );
}
