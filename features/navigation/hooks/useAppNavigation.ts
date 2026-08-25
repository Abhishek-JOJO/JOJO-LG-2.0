/**
 * Navigation Hooks
 * TanStack Query hooks for navigation menu data
 */

import { useQuery } from "@tanstack/react-query";
import { getAppNavigation } from "../api/getAppNavigation";
import { mapNavigationResponse } from "../model/types";
import { useAuthStore } from "@store/useAuthStore";
import { useLocaleStore } from "@store/useLocaleStore";
import { logger } from "@lib/logger/logger";
import type { ApiResponse } from "@lib/types/api.types";
import { appConfig } from "@/lib/config/app.config";

import { cookiesManager } from "@/lib/cookies/cookies.manager";

/**
 * Fetch dynamic app navigation
 * 
 * ONLY enabled when:
 * - sessionId exists
 * - isAppReady is true
 */
export function useAppNavigation(isAppReady: boolean) {
  const clientToken = useAuthStore(state => state.token);
  const clientLocale = useLocaleStore(state => state.locale);

  const sessionId = clientToken || cookiesManager.get("jojo_auth_token") || "";
  const locale = clientLocale || cookiesManager.get("jojo_locale") || "en";

  return useQuery({
    queryKey: ["appNavigation", sessionId, locale],
    queryFn: async () => {
      logger.info("[Navigation Hook] Fetching app navigation...", { sessionId: sessionId?.substring(0, 10) });

      const response = await getAppNavigation(sessionId ?? undefined) as ApiResponse<any>;

      logger.info("[Navigation Hook] Raw API response:", response);

      const mapped = mapNavigationResponse(response);

      logger.info("[Navigation Hook] Mapped navigation items:", mapped);

      return mapped;
    },
    enabled: !!sessionId && isAppReady,
    staleTime: appConfig.USE_APP_NAVIGATION_STALETIME,
    retry: appConfig.USE_APP_NAVIGATION_RETRY,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}
