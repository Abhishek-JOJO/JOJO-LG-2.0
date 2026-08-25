/**
 * Verify Captcha API
 * Returns raw API response from backend verification
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { ApiResponse } from "../model/types";
import type { RecaptchaVerifyRequest, RecaptchaVerifyResponse } from "@/shared/recaptcha/recaptcha.types";
import { logger } from "@/lib/logger/logger";

export async function verifyCaptcha(
  request: RecaptchaVerifyRequest,
  sessionId?: string
): Promise<ApiResponse<RecaptchaVerifyResponse>> {
  logger.info('[Verify Captcha API] Request:', {
    action: request.action,
    hasSessionId: !!sessionId,
    sessionIdPreview: sessionId ? sessionId.substring(0, 10) + '...' : 'none'
  });

  return apiClient.post<ApiResponse<RecaptchaVerifyResponse>>(
    ApiEndpoint.VERIFY_CAPTCHA,
    request,
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {}
    }
  );
}