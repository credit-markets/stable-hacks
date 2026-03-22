import { logger } from "@/lib/logger";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface Meta {
  queryMeta: {
    success?: {
      message: string;
      dismissId?: string;
    };
    error?: {
      message: string;
      dismissId?: string;
    };
  };
}

declare module "@tanstack/react-query" {
  interface Register extends Meta {}
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (_, query) => {
        if (query.meta?.success) {
          if (query.meta.success?.dismissId) {
            toast.dismiss(query.meta.success.dismissId);
          }

          toast.success(query.meta.success.message);

          query.meta.success = undefined;
        }
      },
      onError: (_, query) => {
        if (query.meta?.error?.dismissId) {
          toast.dismiss(query.meta.error.dismissId);
        }

        if (query.meta?.error) {
          toast.error(query.meta.error.message);

          query.meta.error = undefined;
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
      mutations: {
        onError(error) {
          logger.error("Mutation failed", error);
          const err = error as Error & {
            details?: string;
            shortMessage?: string;
          };
          toast.error(err.details ?? err.shortMessage ?? err.message);
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}
