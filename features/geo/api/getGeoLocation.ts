/**
 * Get Geo-location API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { ApiResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";

export async function getGeoLocation(ip: string): Promise<ApiResponse<any>> {
  logger.info('[Geo Location API] Request:', { IP: ip });
  
  try {
    const response = await apiClient.post<any>(
      ApiEndpoint.GEO_LOCATION, 
      { IP: ip },
      { encrypt: true }
    );
    
    // Log decrypted response
    logger.info('[Geo Location API] Decrypted response:', {
      metaData: response.metaData,
      data: response.data
    });
    
    return response;
  } catch (error) {
    logger.error('[Geo Location API] Error:', error);
    throw error;
  }
}
