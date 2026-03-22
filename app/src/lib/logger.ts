// Centralized logging utility for consistent error handling and debugging

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

function formatLogMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (context && Object.keys(context).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(context)}`;
  }

  return `${prefix} ${message}`;
}

function shouldLog(level: LogLevel): boolean {
  // In production, only log warnings and errors
  if (process.env.NODE_ENV === "production") {
    return level === "warn" || level === "error";
  }
  return true;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) {
      console.info(formatLogMessage("info", message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog("warn")) {
      console.warn(formatLogMessage("warn", message, context));
    }
  },

  error(message: string, error?: unknown, context?: LogContext): void {
    if (shouldLog("error")) {
      const errorContext: LogContext = { ...context };

      if (error instanceof Error) {
        errorContext.error = error.message;
        errorContext.stack = error.stack;
      } else if (error && typeof error === "object" && "message" in error) {
        errorContext.errorDetails = error;
      }

      console.error(formatLogMessage("error", message, errorContext));
    }
  },

  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) {
      console.debug(formatLogMessage("debug", message, context));
    }
  },
};
