import { useQuery } from "@tanstack/react-query";
import { searchContent } from "@/lib/api/search";
import { useAuthStore } from "@store/useAuthStore";
import { logger } from "@lib/logger/logger";
import { useLocaleStore } from "@store/useLocaleStore";
import type { ApiResponse } from "@lib/types/api.types";

export function useSearch(query: string, page: number = 1, limit: number = 20, menuId?: number) {
  const sessionId = useAuthStore((state) => state.token);
  const locale = useLocaleStore((s) => s.locale);
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: ["search", trimmedQuery, page, limit, sessionId, locale, menuId],
    queryFn: async () => {
      logger.info("[Search Hook] Searching...", { query: trimmedQuery, page, limit, menuId });

      const response = await searchContent(
        { searchValue: trimmedQuery, page, limit, menuId, menu_id: menuId },
        sessionId ?? undefined
      ) as ApiResponse<any>;

      logger.info("[Search Hook] Raw API response:", response);

      return response;
    },
    enabled: !!sessionId && trimmedQuery.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}
