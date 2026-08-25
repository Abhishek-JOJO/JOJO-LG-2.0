import { QueryClient } from "@tanstack/react-query";
import { handleError } from "@lib/error/handler";
import { logger } from "@lib/logger/logger";
import { appConfig } from "../config/app.config";

/**
 * TanStack Query Client Configuration
 * 
 * Global settings for data fetching and caching
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: appConfig.STALE_TIME, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
        onError: (error) => {
          // All errors go through centralized error handler
          const message = handleError(error);
          logger.error("[Mutation Error]", { message });
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client per request to avoid data leaking between users
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
