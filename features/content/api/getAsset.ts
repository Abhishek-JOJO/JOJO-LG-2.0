/**
 * Get Asset API — POST /v3/content/asset/{assetId}
 * Returns full asset with seasons[0].episodes pre-loaded.
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';
import type { ContentAssetApiShape } from '../model/types';

export async function getAsset(
  assetId: string,
  sessionId?: string
): Promise<ApiResponse<ContentAssetApiShape>> {
  return apiClient.post<ApiResponse<ContentAssetApiShape>>(
    `${ApiEndpoint.GET_ASSET}/${assetId}`,
    {},
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}
