import { useInfiniteQuery } from "@tanstack/react-query";
import { getContentRails } from "../api/getContentRails";
import { useAuthStore } from "@store/useAuthStore";
import { useLocaleStore } from "@store/useLocaleStore";
import { logger } from "@lib/logger/logger";
import type { ApiResponse } from "@lib/types/api.types";
import { appConfig } from "@/lib/config/app.config";
import { cookiesManager } from "@/lib/cookies/cookies.manager";

import { useEffect, useState } from "react";

export function useContentRails(subnavId: number, isAppReady: boolean, limit: number = 20) {
  const clientToken = useAuthStore(state => state.token);
  const clientLocale = useLocaleStore(state => state.locale);

  // Synchronously resolve sessionId and locale to prevent query key jumping
  const sessionId = clientToken || (typeof window !== "undefined" ? (cookiesManager.get("jojo_auth_token") || localStorage.getItem("auth_token")) : "") || "";
  const locale = clientLocale || (typeof window !== "undefined" ? (cookiesManager.get("jojo_locale") || localStorage.getItem("locale")) : "") || "en";

  return useInfiniteQuery({
    queryKey: ["contentRails", subnavId, sessionId, locale, limit],
    queryFn: async ({ pageParam = 1 }) => {
      logger.info("[Content Rails Hook] Fetching rails for subnavId...", { subnavId, page: pageParam, locale, limit });

      const response = await getContentRails(subnavId, pageParam as number, sessionId || undefined, limit) as ApiResponse<any>;

      logger.info("[Content Rails Hook] Raw response received:", response);

      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.metaData || lastPage?.["meta-data"] || lastPage?.metadata || lastPage?.data?.["meta-data"] || lastPage?.data?.metadata;
      if (!meta) return undefined;
      const currentPage = Number(meta.current_page) || 1;
      const totalPages = Number(meta.total_pages) || 1;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    enabled: isAppReady && !!subnavId,
    // A new tab must not display the previous tab's assets while it loads.
    // Pagination still keeps the existing pages in this query's own cache.
    staleTime: appConfig.STALE_TIME, // 5 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes in memory cache
    retry: 3,
    retryOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
