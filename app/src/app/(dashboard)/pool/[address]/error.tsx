"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { logger } from "@/lib/logger";
import { Button } from "@nextui-org/button";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PoolError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log to error tracking service with context
    logger.error("Pool page error caught by boundary", error, {
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
          context: "pool-detail-page",
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Fail silently - don't cascade errors
      });
    }
  }, [error]);

  const isNotFound = error.message.toLowerCase().includes("not found");

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-md mx-auto space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-danger-50 p-4">
            <AlertCircle className="h-12 w-12 text-danger" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {isNotFound ? "Pool not found" : "Failed to load pool"}
          </h2>
          <p className="text-default-500">
            {isNotFound
              ? "The pool you're looking for doesn't exist or has been removed."
              : "We encountered an error while loading this pool. Please try again."}
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-default-400">Error ID: {error.digest}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!isNotFound && (
            <Button color="primary" onPress={() => reset()}>
              Try again
            </Button>
          )}
          <Breadcrumb
            items={[{ label: "Marketplace", href: "/" }, { label: "Pool" }]}
          />
        </div>
      </div>
    </div>
  );
}
