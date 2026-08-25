/**
 * Verify Special User API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { VerifySpecialUserRequest, ApiResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";

import { useAuthStore } from "@store/useAuthStore";

export async function verifySpecialUser(
  request: VerifySpecialUserRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  const currentSessionId = sessionId || useAuthStore.getState().token || undefined;

  const body: any = {
    source: request.source,
    is_register: request.is_register,
  };

  if (request.source === "email") {
    body.email = request.email || request.phone;
  } else {
    body.phone = request.phone;
    const rawCode = request.phone_code || "+91";
    body.phone_code = rawCode.startsWith("+") ? rawCode : `+${rawCode.replace(/[^0-9]/g, "")}`;
  }

  logger.info("[Verify Special User API] Payload:", { body, currentSessionId });

  return apiClient.post<any>(
    ApiEndpoint.VERIFY_SPECIAL_USER,
    body,
    { 
      encrypt: true,
      headers: currentSessionId ? { sessionid: currentSessionId } : {}
    }
  );
}
