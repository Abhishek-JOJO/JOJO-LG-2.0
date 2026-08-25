/**
 * Get Video Details API
 *
 * Returns raw API response — no business logic.
 * Follows the exact pattern of features/profile/api/createProfile.ts
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';
import type { VideoDetailsApiResponse } from '../model/types';

export async function getVideoDetails(
  contentId: string,
  sessionId?: string
): Promise<ApiResponse<VideoDetailsApiResponse>> {
  return apiClient.get<ApiResponse<VideoDetailsApiResponse>>(
    `${ApiEndpoint.GET_VIDEO_DETAILS}/${contentId}`,
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}
