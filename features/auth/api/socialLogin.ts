/**
 * Social Login API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { SocialLoginRequest, ApiResponse } from "../model/types";

export async function socialLogin(
  request: SocialLoginRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  // Build request body
  const body: any = {
    source: request.source,
    token: request.token,
  };

  // Include email if available
  if (request.email) {
    body.email = request.email;
  }

  return apiClient.post<any>(
    ApiEndpoint.SOCIAL_LOGIN,
    body,
    { 
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {}
    }
  );
}
