import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Creates a QueryClient configured for testing.
 * Disables retries and sets gcTime to 0 to prevent flaky tests.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Creates a test wrapper component with QueryClientProvider.
 * Uses the provided queryClient or creates a new one if not provided.
 *
 * @param queryClient - Optional QueryClient instance. Creates new one if not provided.
 * @returns A wrapper component that can be used with renderHook or render
 */
export function createTestWrapper(
  queryClient?: QueryClient,
): ({ children }: { children: ReactNode }) => JSX.Element {
  const client = queryClient ?? createTestQueryClient();

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

/**
 * Creates a test wrapper along with the QueryClient instance.
 * Useful when you need access to both the wrapper and the client for cleanup or assertions.
 *
 * @returns Object containing both the wrapper component and the queryClient instance
 */
export function createTestWrapperWithClient(): {
  wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
  queryClient: QueryClient;
} {
  const queryClient = createTestQueryClient();
  const wrapper = createTestWrapper(queryClient);

  return { wrapper, queryClient };
}
