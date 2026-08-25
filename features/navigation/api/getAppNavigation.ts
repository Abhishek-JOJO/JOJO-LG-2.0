import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";

export async function getAppNavigation(sessionId?: string) {
  return apiClient.get(ApiEndpoint.GET_APP_NAVIGATION, {
    encrypt: true,
    headers: sessionId ? { sessionid: sessionId } : undefined,
  });
}
