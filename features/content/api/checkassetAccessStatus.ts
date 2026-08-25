/**
 * Check Asset Access Status API — POST /user/check-asset-access-status
 * Fetches batch access/pricing status for multiple asset IDs at once.
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';

export interface CheckAssetAccessStatusRequest {
  aAssetIds: string[];
  sUserId?: string;
  sCountryCode2?: string;
}

export async function checkAssetAccessStatus(
  request: CheckAssetAccessStatusRequest,
  sessionId?: string
): Promise<ApiResponse<any>> {
  const body: Record<string, any> = {
    aAssetIds: request.aAssetIds,
    country: request.sCountryCode2
  };
  if (request.sUserId) body.sUserId = request.sUserId;
  // if (request.sCountryCode2) body.sCountryCode2 = request.sCountryCode2;

  return apiClient.post<ApiResponse<any>>(
    ApiEndpoint.CHECK_ASSET_ACCESS_STATUS,
    body,
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}