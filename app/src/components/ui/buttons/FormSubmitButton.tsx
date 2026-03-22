import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { memo } from "react";

/**
 * Size configuration for form submit buttons
 * Maps size variants to their Tailwind CSS class names
 */
const SIZE_CLASS_MAP = {
  sm: "min-w-[120px]",
  md: "min-w-[150px]",
  lg: "min-w-[200px]",
} as const;

/**
 * Props for the FormSubmitButton component
 */
interface FormSubmitButtonProps {
  /**
   * Whether the form is currently submitting
   * When true, shows loading spinner and loadingText
   */
  isSubmitting: boolean;

  /**
   * Text to display on the button
   */
  text: string;

  /**
   * Text to display when isSubmitting is true
   * @default text (uses the main text if not provided)
   */
  loadingText?: string;

  /**
   * Whether the button should be disabled
   * @default false
   */
  isDisabled?: boolean;

  /**
   * Size variant for the button
   * Determines the minimum width:
   * - sm: 120px (for compact forms)
   * - md: 150px (default size)
   * - lg: 200px (for primary actions)
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
}

/**
 * Standardized form submit button with consistent sizing and loading states
 *
 * This component provides a consistent submit button implementation across all forms.
 * It handles loading states, disabled states, and standardized sizing to ensure
 * UI consistency throughout the application.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FormSubmitButton
 *   isSubmitting={isSubmitting}
 *   text="Create Pool"
 * />
 *
 * // With loading text
 * <FormSubmitButton
 *   isSubmitting={isSubmitting}
 *   text="Create Pool"
 *   loadingText="Creating…"
 * />
 *
 * // With size variant
 * <FormSubmitButton
 *   isSubmitting={isSubmitting}
 *   text="Submit"
 *   size="lg"
 * />
 *
 * // With disabled state
 * <FormSubmitButton
 *   isSubmitting={isSubmitting}
 *   text="Save Changes"
 *   isDisabled={!form.state.canSubmit}
 * />
 * ```
 */
export const FormSubmitButton = memo(function FormSubmitButton({
  isSubmitting,
  text,
  loadingText,
  isDisabled = false,
  size = "md",
}: FormSubmitButtonProps) {
  const sizeClass = SIZE_CLASS_MAP[size];

  return (
    <Button
      type="submit"
      isLoading={isSubmitting}
      isDisabled={isDisabled}
      className={cx(styles.btnBase, styles.btnPrimary, sizeClass, "h-10")}
    >
      {isSubmitting && loadingText ? loadingText : text}
    </Button>
  );
});
