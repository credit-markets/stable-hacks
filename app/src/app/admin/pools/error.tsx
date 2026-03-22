"use client";

import { logger } from "@/lib/logger";
import { ICON_SIZES } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function AdminPoolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking service with context
    logger.error("Admin pools page error caught by boundary", error, {
      digest: error.digest,
      componentStack: error.stack,
      errorType: error.name,
      timestamp: new Date().toISOString(),
    });

    // Send to backend error tracking endpoint in production
    if (process.env.NODE_ENV === "production") {
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          context: "admin-pools-page",
          timestamp: new Date().toISOString(),
        }),
      }).catch((reportErr) => {
        console.error("Failed to report error:", reportErr);
      });
    }
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-danger-50 p-4">
            <AlertCircle
              className={`${ICON_SIZES.status.medium} text-danger`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Failed to load pools
          </h2>
          <p className="text-default-500">
            We encountered an error while loading the pools list. This could be
            due to a network issue or server error.
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-default-400">Error ID: {error.digest}</p>
        )}

        <Button
          color="primary"
          startContent={<RefreshCw className={ICON_SIZES.button.sm} />}
          onPress={() => reset()}
        >
          Retry loading pools
        </Button>
      </div>
    </div>
  );
}
