/**
 * Send OTP API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { SendOtpRequest, ApiResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";
import { LoginIdentifierType } from "@/enums/ui.enum";

export async function sendOtp(
  request: SendOtpRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  const domainName = typeof window !== 'undefined' ? window.location.hostname : "";
  
  // Build request body based on source
  const body: any = {
    is_register: request.is_register,
    source: request.source,
    domain: domainName,
    domain_name: domainName,
  };
  
  if (request.source === LoginIdentifierType.PHONE) {
    // For phone: use phone and phone_code fields
    body.phone = request.phone;
    body.phone_code = request.phone_code;
  } else {
    // For email: use email field instead of phone
    body.email = request.phone; // API expects 'email' field for email source
  }
  
  logger.info('[Send OTP API] Request body:', body);
  
  return apiClient.post<any>(
    ApiEndpoint.SEND_OTP,
    body,
    { 
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {}
    }
  );
}
