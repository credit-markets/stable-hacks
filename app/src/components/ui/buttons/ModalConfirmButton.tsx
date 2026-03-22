import { logger } from "@/lib/logger";
import { Button } from "@nextui-org/button";
import { memo } from "react";

/**
 * Props for the ModalConfirmButton component
 */
interface ModalConfirmButtonProps {
  /**
   * Callback function to execute when the confirm button is pressed
   */
  onConfirm: () => void;

  /**
   * Whether the button is in a loading state (shows spinner)
   * @default false
   */
  isLoading?: boolean;

  /**
   * Whether the button should be disabled
   * @default false
   */
  isDisabled?: boolean;

  /**
   * Text to display on the button
   */
  text: string;

  /**
   * Visual style variant for the button
   * - "primary": For standard confirm actions (blue)
   * - "danger": For destructive actions like delete/reject (red)
   * @default "primary"
   */
  variant?: "danger" | "primary";
}

/**
 * Standardized confirm/action button for modal dialogs
 *
 * This component provides a consistent confirm button implementation across all modals.
 * It supports both primary (positive) and danger (destructive) actions with appropriate colors.
 *
 * @example
 * ```tsx
 * // Standard confirmation
 * <ModalConfirmButton onConfirm={handleSave} text="Save" />
 *
 * // With loading state
 * <ModalConfirmButton onConfirm={handleSubmit} text="Submit" isLoading={isSubmitting} />
 *
 * // Destructive action
 * <ModalConfirmButton onConfirm={handleDelete} text="Delete" variant="danger" />
 *
 * // Disabled state
 * <ModalConfirmButton onConfirm={handleApprove} text="Approve" isDisabled={!isValid} />
 * ```
 */
export const ModalConfirmButton = memo(function ModalConfirmButton({
  onConfirm,
  isLoading = false,
  isDisabled = false,
  text,
  variant = "primary",
}: ModalConfirmButtonProps) {
  const handlePress = () => {
    if (!onConfirm) {
      logger.error("onConfirm handler is undefined", undefined, {
        component: "ModalConfirmButton",
        text,
        variant,
      });
      return;
    }
    onConfirm();
  };

  return (
    <Button
      color={variant}
      onPress={handlePress}
      isLoading={isLoading}
      isDisabled={isDisabled}
    >
      {text}
    </Button>
  );
});
