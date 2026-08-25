import { ApiEndpoint } from "@/enums/api.enum";
import { apiClient } from "@lib/api/client";

export async function getContentRailById(
  railId: string | number,
  page: number = 1,
  limit: number = 20,
  sessionId?: string
) {
  return apiClient.get(`${ApiEndpoint.CONTENT_RAILS}/${railId}`, {
    encrypt: true,
    params: { page, limit },
    headers: sessionId ? { sessionid: sessionId } : undefined,
  });
}
