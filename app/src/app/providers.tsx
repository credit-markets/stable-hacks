"use client";

import { getQueryClient } from "@/config/query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { NextUIProvider } from "@nextui-org/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicContextProvider
        settings={{
          // biome-ignore lint/style/noNonNullAssertion: env var validated at build time
          environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
          // Custom hostname for cookie-based auth — production only.
          // In dev/sandbox, the SDK uses app.dynamic.xyz (open CORS for localhost).
          apiBaseUrl: process.env.NEXT_PUBLIC_DYNAMIC_API_BASE_URL || undefined,
          walletConnectors: [SolanaWalletConnectors],
          cssOverrides: `
            .widget-portal,
            .dynamic-widget-modal,
            .dynamic-widget-inline-controls {
              display: none !important;
            }
          `,
        }}
      >
        <NextUIProvider>
          <Toaster />
          {process.env.NODE_ENV !== "production" && <ReactQueryDevtools initialIsOpen={false} />}
          {children}
        </NextUIProvider>
      </DynamicContextProvider>
    </QueryClientProvider>
  );
}
