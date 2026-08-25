"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "./queryClient";
import { ReactNode } from "react";

interface ReactQueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider
 * Wraps app with TanStack Query context
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Use getQueryClient to ensure we have a fresh client on the server per request,
  // but reuse the singleton on the client.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
