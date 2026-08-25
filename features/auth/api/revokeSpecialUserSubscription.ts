/**
 * Revoke Special User Subscription API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { ApiResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";

export interface RevokeSpecialUserSubscriptionRequest {
  email?: string;
  phone?: string;
  phone_code?: string;
}

export async function revokeSpecialUserSubscription(
  request: RevokeSpecialUserSubscriptionRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  logger.info("[Revoke Special User Subscription API] Request payload:", request);

  try {
    const response = await apiClient.post<any>(
      ApiEndpoint.REVOKE_SPECIAL_USER_SUBSCRIPTION,
      request,
      {
        encrypt: true,
        headers: sessionId ? { sessionid: sessionId } : {},
      }
    );
    return response;
  } catch (error) {
    logger.error("[Revoke Special User Subscription API] Error:", error);
    throw error;
  }
}
