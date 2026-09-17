"use client";

/**
 * useVideoDetails
 *
 * TanStack Query hook for fetching video details.
 * Follows exact pattern of features/profile/hooks/useProfiles.ts
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/useAuthStore';
import { fetchVideoDetails } from '../services/player.service';
import { logger } from '@lib/logger/logger';
import { appConfig } from '@/lib/config/app.config';
import { localStorageManager } from '@lib/localStorage/localStorage.manager';
import { StorageKey } from '@enums/storage.enum';

export function useVideoDetails(contentId: string, isAppReady: boolean = true, enabled: boolean = true) {
  const token = useAuthStore((state) => state.token);
  // Was reading the raw localStorage key "AUTH_TOKEN" — the actual key the
  // rest of the app stores it under (via localStorageManager/StorageKey) is
  // "ott_auth_token", so this fallback silently never matched anything. On
  // the very first render, before the top-level auth-store hydration effect
  // has run, `token` is still null and this fallback was the only thing that
  // could fill it in — its mismatch meant effectiveSessionId briefly
  // resolved to null there. Since it's part of this query's key, that null
  // could produce a different key than the one used moments later once
  // `token` populates, triggering a second fetch (and the loading gate
  // flashing again) for what's actually the same request.
  const effectiveSessionId = token || localStorageManager.get<string>(StorageKey.AUTH_TOKEN);

  return useQuery({
    queryKey: ['video-details', contentId, effectiveSessionId],
    queryFn: async () => {
      logger.info('[useVideoDetails] Fetching', { contentId });
      const video = await fetchVideoDetails(contentId, effectiveSessionId ?? undefined);
      logger.info('[useVideoDetails] Fetched', { title: video.title });
      return video;
    },
    enabled: !!contentId && isAppReady && enabled,
    staleTime: 0,                   // Always consider stale: ensures fresh signed stream URL & progress on mount
    gcTime: 0,                      // Instantly garbage collect on unmount: prevents using expired CDN links on next play
    refetchOnWindowFocus: false,    // Do NOT refetch when clicking or switching tabs
    refetchOnReconnect: false,      // Do NOT refetch on reconnect
    retry: (failureCount, error: any) => {
      if (error?.status === 429) return false; // Do not retry on rate limits
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}
