import { logger } from "@/lib/logger";
import { Button } from "@nextui-org/button";
import { memo } from "react";

/**
 * Props for the ModalCloseButton component
 */
interface ModalCloseButtonProps {
  /**
   * Callback function to execute when the close button is pressed
   */
  onClose: () => void;

  /**
   * Whether the button should be disabled
   * @default false
   */
  isDisabled?: boolean;

  /**
   * Custom text to display on the button
   * @default "Close"
   */
  text?: string;
}

/**
 * Standardized close/cancel button for modal dialogs
 *
 * This component provides a consistent close button implementation across all modals.
 * It uses NextUI's danger color with light variant for low visual prominence.
 *
 * @example
 * ```tsx
 * <ModalCloseButton onClose={onClose} />
 * <ModalCloseButton onClose={onClose} text="Cancel" />
 * <ModalCloseButton onClose={onClose} isDisabled={isLoading} />
 * ```
 */
export const ModalCloseButton = memo(function ModalCloseButton({
  onClose,
  isDisabled = false,
  text = "Close",
}: ModalCloseButtonProps) {
  const handlePress = () => {
    if (!onClose) {
      logger.error("onClose handler is undefined", undefined, {
        component: "ModalCloseButton",
      });
      return;
    }
    onClose();
  };

  return (
    <Button
      color="danger"
      variant="light"
      onPress={handlePress}
      isDisabled={isDisabled}
    >
      {text}
    </Button>
  );
});
