import { getQueryClient } from "@/lib/react-query/queryClient";
import { cookies } from "next/headers";
import { getAppNavigation } from "@/features/navigation/api/getAppNavigation";
import { mapNavigationResponse } from "@/features/navigation/model/types";
import { getContentRails } from "@/features/content-rail/api/getContentRails";

/**
 * Server-side utility to prefetch Navigation and Content Rails for Hydration
 * 
 * Designed to be resilient: any failure (API down, network timeout, bad data)
 * is swallowed and returns an empty query client. The client component will
 * handle its own loading/error state via React Query on the client side.
 *
 * @param expectedUrl The pathname of the current route (e.g., "/movies") to find the correct subnavId
 * @param fallbackSubnavId The fallback subnavId if the route doesn't match the API navigation
 */
export async function prefetchRouteRails(expectedUrl: string, fallbackSubnavId: number) {
  const queryClient = getQueryClient();

  let sessionId = "";
  let locale = "en";
  try {
    const cookieStore = await cookies();
    sessionId = cookieStore.get("jojo_auth_token")?.value || "";
    locale = cookieStore.get("jojo_locale")?.value || "en";
  } catch {
    // Cookies unavailable (e.g., during static rendering) — use defaults
  }

  // 1. Prefetch Navigation (best-effort)
  try {
    await queryClient.prefetchQuery({
      queryKey: ["appNavigation", sessionId, locale],
      queryFn: async () => {
        const response = await getAppNavigation(sessionId);
        return mapNavigationResponse(response as any);
      },
    });
  } catch {
    // Navigation prefetch failed — client will re-fetch
  }

  // 2. Determine SubnavId from prefetched navigation
  const navItems = queryClient.getQueryData<any[]>(["appNavigation", sessionId, locale]);
  let subnavId = fallbackSubnavId;
  
  if (navItems) {
    const matchedItem = navItems.find((item) => {
      const targetUrl = item.url === "/" ? "/" : item.url;
      return expectedUrl === targetUrl;
    });
    if (matchedItem?.subnav_id) {
      subnavId = matchedItem.subnav_id;
    }
  }

  // 3. Prefetch initial page of Content Rails (best-effort)
  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ["contentRails", subnavId, sessionId, locale, 20],
      queryFn: async () => {
        return await getContentRails(subnavId, 1, sessionId, 20);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage: any) => {
        const meta = lastPage?.metaData || lastPage?.["meta-data"] || lastPage?.metadata || lastPage?.data?.["meta-data"] || lastPage?.data?.metadata;
        if (!meta) return undefined;
        const currentPage = Number(meta.current_page) || 1;
        const totalPages = Number(meta.total_pages) || 1;
        return currentPage < totalPages ? currentPage + 1 : undefined;
      }
    });
  } catch {
    // Rails prefetch failed — client will re-fetch and show its own error/loading state
  }

  return queryClient;
}

export async function prefetchRailDetails(railId: string, subnavId: number = 1) {
  const queryClient = await prefetchRouteRails("/", subnavId);
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("jojo_auth_token")?.value || "";
  const locale = cookieStore.get("jojo_locale")?.value || "en";

  if (railId) {
    const { getContentRailById } = await import("@/features/content-rail/api/getContentRailById");
    await queryClient.prefetchInfiniteQuery({
      queryKey: ["railDetails", railId, sessionId, locale, 30],
      queryFn: async () => {
        return await getContentRailById(railId, 1, 30, sessionId ?? undefined);
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
      }
    });
  }

  return queryClient;
}
