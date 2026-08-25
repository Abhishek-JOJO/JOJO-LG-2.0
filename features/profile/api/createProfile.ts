/**
 * Create Profile API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { CreateProfileRequest } from "../model/types";

export async function createProfile(data: CreateProfileRequest, sessionId?: string) {
  return apiClient.post(ApiEndpoint.CREATE_PROFILE, data, {
    encrypt: true,
    headers: sessionId ? { sessionid: sessionId } : undefined,
  });
}
