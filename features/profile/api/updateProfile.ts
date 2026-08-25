/**
 * Update Profile API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { UpdateProfileRequest } from "../model/types";

export async function updateProfile(data: UpdateProfileRequest, sessionId?: string) {
  return apiClient.put(ApiEndpoint.UPDATE_PROFILE, data, {
    encrypt: true,
    headers: sessionId ? { sessionid: sessionId } : undefined,
  });
}
