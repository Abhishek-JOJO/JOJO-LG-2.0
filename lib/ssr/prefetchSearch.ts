import { getQueryClient } from "@/lib/react-query/queryClient";
import { cookies } from "next/headers";
import { searchContent } from "@/lib/api/search";
import type { ApiResponse } from "@/lib/types/api.types";
import { prefetchRouteRails } from "./prefetchRails";

export async function prefetchSearch(query: string, page = 1, limit = 20) {
  // First prefetch the navigation and search default rails using our existing helper!
  // Assuming search has a subnav, prefetchRouteRails will resolve it and prefetch its rails.
  const queryClient = await prefetchRouteRails("/search", 1);
  let sessionId: string | undefined = undefined;
  let locale = "en";
  
  try {
    const cookieStore = await cookies();
    sessionId = cookieStore.get("jojo_auth_token")?.value;
    locale = cookieStore.get("jojo_locale")?.value || "en";
  } catch (error) {
    // Ignore error during static export
  }

  const trimmedQuery = query.trim();
  
  if (trimmedQuery.length > 0 && sessionId) {
    await queryClient.prefetchQuery({
      queryKey: ["search", trimmedQuery, page, limit, sessionId, locale, undefined],
      queryFn: async () => {
        return await searchContent(
          { searchValue: trimmedQuery, page, limit, menuId: undefined, menu_id: undefined },
          sessionId ?? undefined
        ) as ApiResponse<any>;
      }
    });
  }

  return queryClient;
}
