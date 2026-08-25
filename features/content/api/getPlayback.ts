/**
 * Get Playback API — POST /v3/content/playback
 * Returns playback URL, VTT URL, player ID, and ad config.
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';
import type { PlaybackApiShape, PlaybackRequest } from '../model/types';

export async function getPlayback(
  request: PlaybackRequest,
  sessionId?: string
): Promise<ApiResponse<PlaybackApiShape>> {
  return apiClient.post<ApiResponse<PlaybackApiShape>>(
    ApiEndpoint.GET_PLAYBACK,
    {
      asset_id: request.assetId,
      is_subscribe: request.isSubscribe,
    },
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}
