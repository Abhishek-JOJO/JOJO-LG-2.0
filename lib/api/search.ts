import { apiClient } from "./client";
import { ApiEndpoint } from "@enums/api.enum";
import { HEADERS } from "@lib/constants/headers";

export interface SearchParams {
  searchValue: string;
  page?: number;
  limit?: number;
  menuId?: number;
  menu_id?: number;
}

export async function searchContent(
  params: SearchParams,
  sessionId?: string,
  signal?: AbortSignal
) {
  const { searchValue, page = 1, limit = 20, menuId, menu_id } = params;

  return apiClient.post<any>(
    ApiEndpoint.SEARCH_API,
    { searchValue, page, limit, menuId, menu_id },
    {
      encrypt: true,
      signal,
      params: { query: searchValue },
      headers: sessionId ? { [HEADERS.SESSION_ID]: sessionId } : undefined,
    }
  );
}
