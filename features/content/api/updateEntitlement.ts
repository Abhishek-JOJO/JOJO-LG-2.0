/**
 * Update TVOD Entitlement — POST /v3/subscription/tvod/update-user-entitlement
 * Called after confirming purchase to activate access on backend.
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';

export async function updateEntitlement(
  assetId: string,
  countryCode: string,
  sessionId?: string
): Promise<ApiResponse<null>> {
  return apiClient.post<ApiResponse<null>>(
    ApiEndpoint.UPDATE_ENTITLEMENT,
    {
      assetId,
      countryCode,
      country: countryCode,
    },
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}
