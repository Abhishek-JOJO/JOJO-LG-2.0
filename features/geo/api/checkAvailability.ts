/**
 * Check Availability API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { ApiResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";

export async function checkAvailability(countryCode: string): Promise<ApiResponse<any>> {
  logger.info('[Check Availability API] Request:', { country_code: countryCode });
  
  try {
    const response = await apiClient.post<any>(
      ApiEndpoint.CHECK_AVAILABILITY, 
      { country_code: countryCode },
      { encrypt: true }
    );
    
    // Log decrypted response
    logger.info('[Check Availability API] Decrypted response:', {
      metaData: response.metaData,
      data: response.data
    });
    
    return response;
  } catch (error) {
    logger.error('[Check Availability API] Error:', error);
    throw error;
  }
}
