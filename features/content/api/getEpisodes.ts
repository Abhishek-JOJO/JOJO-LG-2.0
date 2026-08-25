/**
 * Get Episodes API — GET /{seasonAssetId}/episodes?page={page}
 * Paginated episode list for a season.
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';
import type { EpisodeApiShape } from '../model/types';

interface EpisodesApiResponse {
  episodes: EpisodeApiShape[];
}

export async function getEpisodes(
  seasonAssetId: string,
  page: number,
  sessionId?: string
): Promise<ApiResponse<EpisodesApiResponse>> {
  return apiClient.get<ApiResponse<EpisodesApiResponse>>(
    `/${seasonAssetId}${ApiEndpoint.GET_EPISODES}`,
    {
      encrypt: false,
      params: { page },
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}
