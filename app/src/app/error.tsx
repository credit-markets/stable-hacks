"use client";

import { logger } from "@/lib/logger";
import { ICON_SIZES } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking service with context
    logger.error("Application error caught by boundary", error, {
      digest: error.digest,
      componentStack: error.stack,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      timestamp: new Date().toISOString(),
    });

    // Also send to backend error tracking endpoint in production
    if (process.env.NODE_ENV === "production") {
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Fail silently - don't cascade errors
      });
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-danger-50 p-4">
            <AlertCircle
              className={`${ICON_SIZES.status.medium} text-danger`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Something went wrong
          </h2>
          <p className="text-default-500">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-default-400">Error ID: {error.digest}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button color="primary" onPress={() => reset()}>
            Try again
          </Button>
          <Button
            variant="bordered"
            onPress={() => {
              window.location.href = "/";
            }}
          >
            Go to homepage
          </Button>
        </div>
      </div>
    </div>
  );
}
