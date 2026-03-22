import { Logger } from '@nestjs/common';

/**
 * Error handling utilities for safe error message and stack extraction
 */

/**
 * Structured error context for logging
 */
export interface ErrorLogContext {
  errorType?: string;
  errorMessage?: string;
  stack?: string;
  [key: string]: unknown;
}

/**
 * Type guard to check if an unknown value is an Error instance
 * @param error - The value to check
 * @returns True if the value is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely extracts an error message from an unknown error value
 * @param error - The error value (can be Error, string, object, or any unknown type)
 * @returns A string representation of the error message
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return 'An unknown error occurred';
}

/**
 * Safely extracts a stack trace from an unknown error value
 * @param error - The error value
 * @returns The stack trace string if available, undefined otherwise
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }

  if (error && typeof error === 'object' && 'stack' in error) {
    const stack = (error as { stack: unknown }).stack;
    if (typeof stack === 'string') {
      return stack;
    }
  }

  return undefined;
}

/**
 * Extract structured error information from an unknown error object
 * Safely handles Error instances and string errors. Other types are logged as 'Unknown error'.
 *
 * @param error - The error to extract information from
 * @returns Structured error context object
 */
export function extractErrorContext(error: unknown): ErrorLogContext {
  if (isError(error)) {
    return {
      errorType: error.constructor.name,
      errorMessage: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { errorType: 'Unknown', errorMessage: error };
  }

  // Handle plain error objects (e.g. Supabase PostgrestError: { message, code, details, hint })
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    return {
      errorType: typeof obj.code === 'string' ? obj.code : 'UnknownObject',
      errorMessage:
        typeof obj.message === 'string' ? obj.message : JSON.stringify(error),
    };
  }

  return {
    errorType: 'Unknown',
    errorMessage: 'Unknown error',
  };
}

/**
 * Log an error with structured context
 * Combines error information with additional context fields
 *
 * @param logger - NestJS Logger instance
 * @param message - Human-readable log message
 * @param error - The error object
 * @param additionalContext - Additional context fields to include
 */
export function logError(
  logger: Logger,
  message: string,
  error: unknown,
  additionalContext?: Record<string, unknown>,
): void {
  const errorContext = extractErrorContext(error);
  const fullContext = { ...errorContext, ...additionalContext };

  logger.error(message, fullContext);
}
