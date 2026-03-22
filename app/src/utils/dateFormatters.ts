import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

/**
 * Transaction timestamp (Unix seconds) -> "January 1, 2024"
 * Used for transaction history and exports
 */
export function formatTransactionDate(timestamp: number): string {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp * 1000);
    if (!isValid(date)) return "";
    return format(date, "MMMM dd, yyyy");
  } catch (error) {
    console.error("Error formatting transaction date:", error);
    return "";
  }
}

/**
 * Pool/application date (ISO/Date) -> "Jan 1, 2024"
 * Used for pool creation dates and general date display
 */
export function formatPoolDate(date: string | Date): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    return format(dateObj, "MMM d, yyyy");
  } catch (error) {
    console.error("Error formatting pool date:", error);
    return "";
  }
}

/**
 * Date with time -> "Jan 1, 2024 at 10:30 AM"
 * Used for detailed timestamps like last update times
 */
export function formatDateTime(date: string | Date): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    return format(dateObj, "MMM d, yyyy 'at' h:mm a");
  } catch (error) {
    console.error("Error formatting date time:", error);
    return "";
  }
}

/**
 * Relative time -> "2 days ago"
 * Used for relative time displays
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "";
  }
}

/**
 * For input fields -> "2024-01-01"
 * Used in date input elements
 */
export function formatForInput(date: Date): string {
  if (!date) return "";

  try {
    if (!isValid(date)) return "";
    return format(date, "yyyy-MM-dd");
  } catch (error) {
    console.error("Error formatting date for input:", error);
    return "";
  }
}

/**
 * ISO format for CSV export -> "January dd yyyy"
 * Used for CSV and data exports
 */
export function formatForCsvExport(timestamp: number): string {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp * 1000);
    if (!isValid(date)) return "";
    return format(date, "MMMM dd yyyy");
  } catch (error) {
    console.error("Error formatting date for CSV:", error);
    return "";
  }
}

/**
 * Chart/Graph date format -> "yyyy-MM-dd"
 * Used for charts and time-series data
 */
export function formatForChart(timestamp: number): string {
  if (!timestamp) return "";

  try {
    const date = new Date(Number(timestamp) * 1000);
    if (!isValid(date)) return "";
    return format(date, "yyyy-MM-dd");
  } catch (error) {
    console.error("Error formatting date for chart:", error);
    return "";
  }
}

/**
 * Date and time separately -> "January 1, 2024" and "h:mm:ss a"
 * Used for wallet date added (returns object with separate date and time)
 */
export function formatWalletDateTime(date: string | Date): {
  date: string;
  time: string;
} {
  if (!date) return { date: "", time: "" };

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return { date: "", time: "" };
    return {
      date: format(dateObj, "MMMM dd, yyyy"),
      time: format(dateObj, "h:mm:ss a"),
    };
  } catch (error) {
    console.error("Error formatting wallet date time:", error);
    return { date: "", time: "" };
  }
}
