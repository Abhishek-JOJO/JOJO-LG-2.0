"use client";

/**
 * useEpisodeGating
 *
 * Encapsulates the full gate chain for episode playback:
 * guest → subscription (SVOD) → purchase (TVOD) → play
 *
 * Returns a clean result that the UI component acts on — no business logic in components.
 */

import { useCallback } from 'react';
import { useAuthStore } from '@store/useAuthStore';
import { logger } from '@lib/logger/logger';
import type {
  ContentAsset,
  Episode,
  GatingResult,
} from '../model/types';
import { ASSET_CATEGORY_CODE } from '../model/types';

interface UseEpisodeGatingOptions {
  asset: ContentAsset;
  /** Whether the user has an active subscription */
  isSubscribed: boolean;
  /** Whether the user is in an overseas region */
  isOverseas: boolean;
  /** Whether TVOD asset has been purchased (from useAssetPricing) */
  isTvodPurchased: boolean;
}

interface UseEpisodeGatingReturn {
  canPlayEpisode: (episode: Episode) => GatingResult;
}

export function useEpisodeGating({
  asset,
  isSubscribed,
  isOverseas,
  isTvodPurchased,
}: UseEpisodeGatingOptions): UseEpisodeGatingReturn {
  const { isAuthenticated } = useAuthStore();

  const canPlayEpisode = useCallback(
    (episode: Episode): GatingResult => {
      // 1. Auth gate — must be logged in
      if (!isAuthenticated) {
        logger.info('[EpisodeGating] Gate: auth', { episodeId: episode.assetId });
        return { gate: 'auth' };
      }

      // 2. Overseas gate — non-subscribed overseas users can't watch SVOD (TVOD checks purchase gate instead)
      if (isOverseas && !isSubscribed && asset.assetCategoryCode !== ASSET_CATEGORY_CODE.TVOD) {
        logger.info('[EpisodeGating] Gate: subscription (overseas)', { episodeId: episode.assetId });
        return { gate: 'subscription' };
      }

      // 3. SVOD gate — Indian unsubscribed users can't watch SVOD
      if (asset.assetCategoryCode === ASSET_CATEGORY_CODE.SVOD && !isSubscribed) {
        logger.info('[EpisodeGating] Gate: subscription (SVOD)', { episodeId: episode.assetId });
        return { gate: 'subscription' };
      }

      // 4. TVOD gate — must have purchased this asset
      if (asset.assetCategoryCode === ASSET_CATEGORY_CODE.TVOD && !isTvodPurchased) {
        logger.info('[EpisodeGating] Gate: tvod', { episodeId: episode.assetId });
        return { gate: 'tvod' };
      }

      // All gates passed
      return { gate: 'none' };
    },
    [isAuthenticated, isOverseas, isSubscribed, asset.assetCategoryCode, isTvodPurchased]
  );

  return { canPlayEpisode };
}
