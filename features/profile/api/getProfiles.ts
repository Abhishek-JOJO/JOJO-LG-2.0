/**
 * Get Profiles API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";

export async function getProfiles(sessionId?: string) {
  return apiClient.get(ApiEndpoint.GET_PROFILES, {
    encrypt: true,
    headers: sessionId ? { sessionid: sessionId } : undefined,
  });
}
