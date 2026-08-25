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

  // Prevent hydration mismatch by using the server's empty defaults on the first render.
  // The server prefetches rails with no session token because cookies aren't available at build time.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sessionId = mounted ? (clientToken || cookiesManager.get("jojo_auth_token") || "") : "";
  const locale = mounted ? (clientLocale || cookiesManager.get("jojo_locale") || "en") : "en";

  return useInfiniteQuery({
    queryKey: ["contentRails", subnavId, sessionId, locale, limit],
    queryFn: async ({ pageParam = 1 }) => {
      logger.info("[Content Rails Hook] Fetching rails for subnavId...", { subnavId, page: pageParam, locale, limit });

      const response = await getContentRails(subnavId, pageParam as number, sessionId ?? undefined, limit) as ApiResponse<any>;

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
    enabled: !!sessionId && isAppReady && !!subnavId,
    staleTime: appConfig.STALE_TIME, // 5 minutes cache
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}
