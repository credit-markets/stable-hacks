"use client";

import { logger } from "@/lib/logger";
import { Button } from "@nextui-org/button";
import { Tooltip } from "@nextui-org/tooltip";
import type { ReactNode } from "react";

/**
 * Action types for icon buttons with pre-configured styling
 */
export type IconActionType =
  | "view"
  | "edit"
  | "delete"
  | "approve"
  | "reject"
  | "custom";

/**
 * Size variants for the icon button
 */
export type IconButtonSize = "sm" | "md";

/**
 * Props for the IconActionButton component
 */
export interface IconActionButtonProps {
  /**
   * The icon element to display in the button
   * @example <Eye className="h-4 w-4" />
   */
  icon: ReactNode;

  /**
   * The action type which determines the button's variant and color
   * - view: light variant for non-destructive viewing actions
   * - edit: bordered variant for edit actions
   * - delete: danger-colored flat variant for destructive actions
   * - approve: success-colored flat variant for approval actions
   * - reject: danger-colored flat variant for rejection actions
   * - custom: allows custom variant and color via customVariant and customColor props
   */
  action: IconActionType;

  /**
   * Click handler for the button
   */
  onClick: () => void;

  /**
   * Optional tooltip text to display on hover
   * If not provided, no tooltip will be shown
   */
  tooltip?: string;

  /**
   * Size of the button
   * @default "sm"
   */
  size?: IconButtonSize;

  /**
   * Whether the button is disabled
   * @default false
   */
  isDisabled?: boolean;

  /**
   * Custom variant to use when action is "custom"
   * Only applies when action="custom"
   */
  customVariant?: "light" | "bordered" | "flat" | "solid";

  /**
   * Custom color to use when action is "custom"
   * Only applies when action="custom"
   */
  customColor?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
}

/**
 * Configuration for button styling based on action type
 */
interface ActionConfig {
  variant: "light" | "bordered" | "flat" | "solid";
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
}

/**
 * Maps action types to their corresponding NextUI Button styling
 */
const actionConfigMap: Record<IconActionType, ActionConfig> = {
  view: {
    variant: "light",
  },
  edit: {
    variant: "bordered",
  },
  delete: {
    variant: "flat",
    color: "danger",
  },
  approve: {
    variant: "flat",
    color: "success",
  },
  reject: {
    variant: "flat",
    color: "danger",
  },
  custom: {
    variant: "solid",
    color: "default",
  },
};

/**
 * IconActionButton - A reusable icon-only button component with predefined action styles
 *
 * This component provides a consistent interface for common action buttons (view, edit, delete, approve, reject)
 * with automatic styling based on the action type. Optionally wraps the button in a Tooltip if tooltip text is provided.
 *
 * @example
 * ```tsx
 * <IconActionButton
 *   icon={<Eye className="h-4 w-4" />}
 *   action="view"
 *   onClick={() => handleView(item)}
 *   tooltip="View Details"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <IconActionButton
 *   icon={<Trash2 className="h-4 w-4" />}
 *   action="delete"
 *   onClick={() => handleDelete(item)}
 *   tooltip="Delete Item"
 *   isDisabled={!canDelete}
 * />
 * ```
 */
export default function IconActionButton({
  icon,
  action,
  onClick,
  tooltip,
  size = "sm",
  isDisabled = false,
  customVariant,
  customColor,
}: IconActionButtonProps) {
  const config = actionConfigMap[action];

  // Use custom variant/color if action is "custom" and they are provided
  const variant =
    action === "custom" && customVariant ? customVariant : config.variant;
  const color = action === "custom" && customColor ? customColor : config.color;

  const handlePress = () => {
    if (!onClick) {
      logger.error("onClick handler is undefined", undefined, {
        component: "IconActionButton",
        action,
        tooltip,
      });
      return;
    }
    onClick();
  };

  const button = (
    <Button
      isIconOnly
      size={size}
      variant={variant}
      color={color}
      onPress={handlePress}
      isDisabled={isDisabled}
      aria-label={tooltip || `${action} action`}
    >
      {icon}
    </Button>
  );

  // Only wrap in Tooltip if tooltip text is provided
  if (tooltip) {
    return <Tooltip content={tooltip}>{button}</Tooltip>;
  }

  return button;
}
