/**
 * Get Avatars API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";

export async function getAvatars(page = 1, limit = 20, sessionId?: string) {
  return apiClient.get(ApiEndpoint.GET_AVATARS, {
    encrypt: true,
    headers: sessionId ? { sessionid: sessionId } : undefined,
    params: {
      page,
      limit,
    },
  });
}
