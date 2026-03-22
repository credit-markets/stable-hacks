"use client";

import { TRANSITIONS } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown";
import { Bell } from "@phosphor-icons/react";

export function NotificationButton() {
  // TODO: Replace with actual notification state from your notification system
  const hasUnread = false;
  const notifications: { id: string; title: string; time: string }[] = [];

  return (
    <Dropdown
      classNames={{
        content:
          "bg-surface-card border border-subtle rounded-lg shadow-card p-1 min-w-[280px]",
      }}
    >
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="bordered"
          className={`
            border border-border-default bg-transparent
            hover:bg-surface-hover
            rounded-md
            ${TRANSITIONS.all}
            relative
          `}
          aria-label="Notifications"
        >
          <Bell size={20} weight="bold" className="text-text-primary" />
          {hasUnread && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-terminal-red rounded-full" />
          )}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Notifications"
        variant="flat"
        classNames={{
          base: "p-0",
          list: "gap-0",
        }}
        itemClasses={{
          base: `
            text-text-primary text-sm
            py-3 px-3 rounded-md
            hover:bg-surface-hover
            ${TRANSITIONS.colors}
            data-[hover=true]:bg-surface-hover
          `,
        }}
        emptyContent={
          <div className="py-6 px-4 text-center">
            <Bell
              size={32}
              weight="light"
              className="text-text-muted mx-auto mb-2"
            />
            <p className="text-sm text-text-secondary">No notifications</p>
          </div>
        }
      >
        {notifications.map((notification) => (
          <DropdownItem key={notification.id} textValue={notification.title}>
            <div className="flex flex-col gap-1">
              <span className="font-medium">{notification.title}</span>
              <span className="text-xs text-text-muted">
                {notification.time}
              </span>
            </div>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
