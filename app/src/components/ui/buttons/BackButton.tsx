import { logger } from "@/lib/logger";
import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { memo } from "react";

/**
 * Props for the BackButton component
 */
interface BackButtonProps {
  /**
   * Callback function to execute when the back button is pressed
   * @deprecated Use onPress instead for NextUI compatibility
   */
  onClick?: () => void;

  /**
   * Callback function to execute when the back button is pressed
   * NextUI-compatible prop name
   */
  onPress?: () => void;

  /**
   * Custom text to display on the button
   * @default "Back"
   */
  text?: string;

  /**
   * Whether the button should be disabled
   * @default false
   */
  isDisabled?: boolean;
}

/**
 * Standardized back/previous button for multi-step forms and navigation
 *
 * This component provides a consistent back button implementation across the application.
 * It uses NextUI's flat variant with a consistent minimum width for visual alignment
 * with submit buttons.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <BackButton onPress={() => setStep(1)} />
 *
 * // Custom text
 * <BackButton onPress={() => router.back()} text="Cancel" />
 *
 * // Disabled state
 * <BackButton
 *   onPress={() => setStep(step - 1)}
 *   isDisabled={isLoading}
 * />
 *
 * // Common pattern: Back + Submit button pairing
 * <div className="flex justify-between gap-2 pt-4">
 *   <BackButton onPress={() => setStep(1)} />
 *   <FormSubmitButton isSubmitting={isSubmitting} text="Next" />
 * </div>
 * ```
 */
export const BackButton = memo(function BackButton({
  onClick,
  onPress,
  text = "Back",
  isDisabled = false,
}: BackButtonProps) {
  const handlePress = () => {
    const handler = onPress || onClick;
    if (!handler) {
      logger.error("No handler provided (onPress or onClick)", undefined, {
        component: "BackButton",
        text,
      });
      return;
    }
    handler();
  };

  return (
    <Button
      onPress={handlePress}
      isDisabled={isDisabled}
      className={cx(styles.btnBase, styles.btnSecondary, "min-w-[120px] h-10")}
    >
      {text}
    </Button>
  );
});
