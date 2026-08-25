/**
 * Verify OTP API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { VerifyOtpRequest, ApiResponse } from "../model/types";
import { LoginIdentifierType } from "@/enums/ui.enum";
import { logger } from "@/lib/logger/logger";
import { getPlatform } from "@lib/utils/platform";

export async function verifyOtp(
  request: VerifyOtpRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  const platform = typeof window !== 'undefined' ? getPlatform() : "unknown";

  // Build request body based on source
  const body: any = {
    otp: request.otp,
    is_register: request.is_register,
    source: request.source,
    device_type: "Web",
    deviceType: "Web",
    device_platform: platform,
    devicePlatform: platform,
  };
  
  if (request.source === LoginIdentifierType.PHONE) {
    // For phone: use phone and phone_code fields
    body.phone = request.phone;
    body.phone_code = request.phone_code;
  } else {
    // For email: use email field instead of phone
    body.email = request.phone; // API expects 'email' field for email source
  }
  
  logger.info('[Verify OTP API] Request body:', body);
  
  try {
    const response = await apiClient.post<any>(
      ApiEndpoint.VERIFY_OTP,
      body,
      { 
        encrypt: true,
        headers: sessionId ? { sessionid: sessionId } : {}
      }
    );
    
    // Log decrypted response
    logger.info('[Verify OTP API] Decrypted response:', {
      metaData: response.metaData,
      data: response.data
    });
    
    return response;
  } catch (error) {
    logger.error('[Verify OTP API] Error:', error);
    throw error;
  }
}
