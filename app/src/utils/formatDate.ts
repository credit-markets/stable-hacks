import { format, isValid, parseISO } from "date-fns";

/**
 * Formats a date string into a human-readable format
 * @param dateString - ISO date string to format
 * @param formatString - Optional format string (defaults to 'MMM d, yyyy')
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(
  dateString: string | Date,
  formatString = "MMM d, yyyy",
): string {
  if (!dateString) return "";

  try {
    const date =
      typeof dateString === "string" ? parseISO(dateString) : dateString;

    if (!isValid(date)) return "";

    return format(date, formatString);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}
