import { ApiEndpoint } from "@/enums/api.enum";
import { apiClient } from "@lib/api/client";

export async function getContentRails(subnavId: number, page: number = 1, sessionId?: string, limit?: number) {
  const params: Record<string, any> = { page };
  if (limit) {
    params.limit = limit;
  }
  return apiClient.get(`/${subnavId}${ApiEndpoint.CONTENT_RAILS}`, {
    encrypt: true,
    params,
    headers: sessionId ? { sessionid: sessionId } : undefined,
  });
}
