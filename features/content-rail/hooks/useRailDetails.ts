import { useInfiniteQuery } from "@tanstack/react-query";
import { getContentRailById } from "../api/getContentRailById";
import { useAuthStore } from "@store/useAuthStore";
import { useLocaleStore } from "@store/useLocaleStore";
import { logger } from "@lib/logger/logger";
import { appConfig } from "@/lib/config/app.config";

/**
 * Fetch a single content rail by its ID with infinite scroll pagination.
 *
 * ONLY enabled when:
 * - sessionId exists
 * - isAppReady is true
 * - railId exists
 */
export function useRailDetails(railId: string | number | undefined, isAppReady: boolean, limit: number = 20) {
  const sessionId = useAuthStore(state => state.token);
  const locale = useLocaleStore(state => state.locale);

  return useInfiniteQuery({
    queryKey: ["railDetails", railId, sessionId, locale, limit],
    queryFn: async ({ pageParam = 1 }) => {
      if (!railId) {
        throw new Error("Rail ID is required");
      }
      logger.info("[useRailDetails Hook] Fetching rail details...", { railId, page: pageParam, locale, limit });

      const response = await getContentRailById(railId, pageParam as number, limit, sessionId ?? undefined);

      logger.info("[useRailDetails Hook] Raw response received:", response);

      return response as any;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const data = lastPage?.data;
      const meta = lastPage?.metaData || lastPage?.["meta-data"] || lastPage?.metadata;
      const currentPage = Number(
        data?.current_page ?? data?.page ??
        meta?.current_page ?? meta?.page ?? 1
      );
      const totalPages = Number(
        data?.total_pages ?? data?.totalPages ??
        meta?.total_pages ?? meta?.totalPages ?? 1
      );
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    enabled: !!sessionId && isAppReady && !!railId,
    staleTime: appConfig.STALE_TIME,
    retry: 2,
  });
}
