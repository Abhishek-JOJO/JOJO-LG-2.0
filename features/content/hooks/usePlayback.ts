"use client";

/**
 * usePlayback
 * Mutation hook for fetching playback data (URL, VTT, player ID, ads).
 */

import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@store/useAuthStore';
import { getPlayback } from '../api/getPlayback';
import { mapPlaybackData } from '../model/mapper';
import { handleError } from '@lib/error/handler';
import { logger } from '@lib/logger/logger';
import type { PlaybackRequest } from '../model/types';

export function usePlayback() {
  const sessionId = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (request: PlaybackRequest) => {
      logger.info('[usePlayback] Fetching playback', { assetId: request.assetId });
      const response = await getPlayback(request, sessionId ?? undefined);
      const data = mapPlaybackData(response);
      logger.info('[usePlayback] Playback fetched', { url: data.playbackUrl });
      return data;
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error('[usePlayback] Failed', { message });
    },
  });
}
