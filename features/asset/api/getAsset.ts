/**
 * Get Asset API
 *
 * Fetches full asset data including seasons + episodes.
 * Endpoint: POST /asset/{assetId}
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import { logger } from '@lib/logger/logger';
import type { AssetApiResponse } from '../model/types';

export async function getAsset(
  assetId: string | number,
  sessionId?: string
): Promise<AssetApiResponse> {
  logger.info('[getAsset] Fetching', { assetId });

  const response = await apiClient.post<AssetApiResponse>(
    `${ApiEndpoint.GET_ASSET}/${assetId}`,
    {},
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );

  logger.info('[getAsset] Fetched', {
    assetId,
    title: response?.data?.asset_title,
  });

  return response;
}
