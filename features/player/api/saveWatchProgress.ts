/**
 * Save Watch Progress API
 *
 * Returns raw API response — no business logic.
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';
import type { SaveWatchProgressRequest, WatchProgressApiResponse } from '../model/types';

export async function saveWatchProgress(
  data: SaveWatchProgressRequest,
  sessionId?: string
): Promise<ApiResponse<WatchProgressApiResponse>> {
  return apiClient.post<ApiResponse<WatchProgressApiResponse>>(
    ApiEndpoint.SAVE_WATCH_PROGRESS,
    {
      content_id: data.contentId,
      position_seconds: data.positionSeconds,
      duration_seconds: data.durationSeconds,
    },
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}
