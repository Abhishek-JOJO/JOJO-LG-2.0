/**
 * Player Service
 *
 * Orchestrates fetching video details + saved watch progress.
 * Pure functions — no React, no UI access.
 * Follows features/auth/services/auth.service.ts pattern.
 */

import { saveWatchProgress } from '../api/saveWatchProgress';
import { mapVideoDetails } from '../model/mapper';
import { localStorageManager } from '@lib/localStorage/localStorage.manager';
import { StorageKey } from '@enums/storage.enum';
import { ApiEndpoint } from '@enums/api.enum';
import { logger } from '@lib/logger/logger';
import type { VideoDetails, WatchProgress, SaveWatchProgressRequest } from '../model/types';
import { ASSET_CATEGORY_CODE } from '@features/content/model/types';
import { getPlayback } from '@features/content/api/getPlayback';
import { useAuthStore } from '@store/useAuthStore';
import { getAsset } from '@features/asset/api/getAsset';
import { getAppConfig } from '@lib/config/app.config';
import { DEFAULT_HEADER_VALUES } from '@lib/constants/headers';

/**
 * Fetch VMAP XML from the ads endpoint.
 * URL pattern: {apiBaseUrl}/vmap/{assetId}/{deviceTypeCode}
 *
 * Returns the raw XML string so IMA can receive it inline via `adsResponse`,
 * which bypasses CORS issues with wildcard Access-Control-Allow-Origin headers.
 * Returns null on any failure — ads must never block content playback.
 */

/** Device type code for the VMAP ads endpoint (derived from common headers) */
const VMAP_DEVICE_TYPE_CODE = DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE;

async function fetchVmapXml(assetId: string): Promise<string | null> {
  try {
    const config = getAppConfig();
    const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    const vmapUrl = `${baseUrl}${ApiEndpoint.GET_VMAP}/${assetId}/${VMAP_DEVICE_TYPE_CODE}`;

    logger.info('[Player Service] Fetching VMAP XML', { vmapUrl });

    const response = await fetch(vmapUrl);
    if (!response.ok) {
      logger.warn('[Player Service] VMAP fetch failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const xml = await response.text();
    if (!xml || !xml.includes('vmap:VMAP')) {
      logger.warn('[Player Service] VMAP response is not valid VMAP XML');
      return null;
    }

    logger.info('[Player Service] VMAP XML fetched successfully', {
      length: xml.length,
    });
    return xml;
  } catch (err) {
    logger.warn('[Player Service] VMAP fetch error — continuing without ads', { err });
    return null;
  }
}

/**
 * Fetch video details using /playback API and retrieve metadata from sessionStorage or getAsset.
 * Local progress is used as fallback if API doesn't return position.
 */
export async function fetchVideoDetails(
  contentId: string,
  sessionId?: string
): Promise<VideoDetails> {
  logger.info('[Player Service] Fetching video playback details', { contentId });

  const { user, token } = useAuthStore.getState();
  const isAuthenticated = !!token || !!user;
  const isUserNotGuest = !!user && !user.isGuest;


  


  // 2. Fetch metadata (title, description, seriesInfo, certification, classifications)
  let title = 'Video Playback';
  let description = '';
  let seriesInfo = null;
  let certification = null;
  let classifications = null;
  let assetCategoryCode: number | null = null;
  let isTvodPurchased = false;
  let isSvodSubscribed = false;

  let assetCategory = 'avod';
  let assetCertificate: string | null = null;
  let inTop10 = false;
  let seasonId: string | number | null = null;
  let numberInTop10: number | null = null;
  let assetTypeName: string | null = null;

  let cacheResumeTime: number | null = null;
  let bypassResumePrompt = false;

  try {
    const cached = sessionStorage.getItem(`play_metadata_${contentId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      title = parsed.title || title;
      description = parsed.description || description;
      seriesInfo = parsed.seriesInfo || null;
      certification = parsed.certification || parsed.assetCertificate || null;
      classifications = parsed.classifications || null;
      assetCategoryCode = parsed.assetCategoryCode ?? null;
      isTvodPurchased = parsed.isTvodPurchased ?? false;
      isSvodSubscribed = parsed.isSvodSubscribed ?? false;

      assetCategory = (parsed.assetCategory || (parsed.isSVOD ? 'svod' : parsed.isTVOD ? 'tvod' : parsed.assetCategoryCode === 2 ? 'svod' : parsed.assetCategoryCode === 3 ? 'tvod' : 'avod')).toLowerCase();
      assetCertificate = parsed.assetCertificate || parsed.certification || null;
      inTop10 = parsed.inTop10 ?? parsed.in_top_10 ?? parsed.isTop10 ?? false;
      seasonId = parsed.seasonId ?? parsed.season_id ?? parsed.seriesInfo?.seriesId ?? null;
      numberInTop10 = parsed.numberInTop10 ?? parsed.number_in_top_10 ?? null;
      assetTypeName = parsed.assetTypeName || parsed.asset_type || null;

      if (parsed.resumeTime !== undefined && parsed.resumeTime !== null) {
        cacheResumeTime = Number(parsed.resumeTime);
      }
      if (parsed.bypassResumePrompt !== undefined) {
        bypassResumePrompt = !!parsed.bypassResumePrompt;
      }
    } else {
      // Fallback if not in sessionStorage (e.g. direct page refresh/URL access)
      logger.info('[Player Service] Metadata not in sessionStorage, calling getAsset fallback', { contentId });
      const assetRes = await getAsset(contentId, sessionId);
      const assetData = assetRes?.data as any;
      if (assetData) {
        title = assetData.asset_title || title;
        description = assetData.asset_description || description;
        certification = assetData.asset_certification || null;
        classifications = assetData.asset_classifications || null;

        assetCertificate = assetData.asset_certification || null;
        assetCategory = assetData.asset_category === 2 ? 'svod' : assetData.asset_category === 3 ? 'tvod' : (typeof assetData.asset_category === 'string' ? assetData.asset_category.toLowerCase() : 'avod');
        inTop10 = Boolean(assetData.isintop10 || assetData.is_top_10 || assetData.in_top_10);
        seasonId = assetData.season_id || assetData.parent_id || null;
        numberInTop10 = assetData.numberintop10 !== undefined && assetData.numberintop10 !== null ? Number(assetData.numberintop10) : null;
        assetTypeName = assetData.asset_type === 5 ? 'episode' : assetData.asset_type === 2 ? 'show' : 'movie';

        let parentId = assetData.parent_id ? String(assetData.parent_id) : null;
        let seasonNumber = 1;
        
        // If this is an episode (asset_type === 5) and we have a parent Season ID:
        // We want to fetch the Season's details to resolve the Show ID (parent of the Season).
        if (Number(assetData.asset_type) === 5 && parentId) {
          try {
            logger.info('[Player Service] Parent ID is a Season, fetching Season to resolve Show ID', { seasonId: parentId });
            const seasonRes = await getAsset(parentId, sessionId);
            const seasonData = seasonRes?.data as any;
            if (seasonData) {
              seasonNumber = seasonData.season_number ? Number(seasonData.season_number) : 1;
              if (seasonData.parent_id) {
                logger.info('[Player Service] Resolved parent Show ID from Season details', { showId: seasonData.parent_id });
                parentId = String(seasonData.parent_id);
              }
            }
          } catch (err) {
            logger.error('[Player Service] Failed to resolve parent Show ID from Season', err);
          }
        }

        if (parentId) {
          seriesInfo = {
            seriesId: parentId,
            seriesTitle: '',
            seasonNumber,
            episodeNumber: assetData.episode_number ? Number(assetData.episode_number) : 1,
            nextEpisode: null,
          };
          if (!seasonId) seasonId = parentId;
        }
      }
    }
  } catch (err) {
    logger.warn('[Player Service] Failed to retrieve asset metadata fallbacks', err);
  }

  // Merge local watch progress or sessionStorage resumeTime as a fallback
  const localProgress = getLocalWatchProgress(contentId);
  const savedPosition = cacheResumeTime !== null && cacheResumeTime > 0
    ? cacheResumeTime
    : (localProgress?.positionSeconds ?? null);

  // ── VMAP ad eligibility ────────────────────────────────────────────────────
  // Determine whether this user+asset combination should show ads.
  //   SVOD subscriber → no ads (regardless of asset category)
  //   TVOD purchased asset → no ads for this specific asset
  //   AVOD / FVOD / guest → fetch VMAP and show ads
  //
  // Primary source: sessionStorage `play_metadata_<id>` written by useWatchGating.
  // Fallback (page refresh / direct URL / post-payment redirect):
  //   If isSvodSubscribed is still false, query verifySubscription API live.
  //   If isTvodPurchased is still false and asset is TVOD, query getAssetPricing API live.
  // This ensures ads are NEVER shown to entitled users regardless of navigation path.

  const { user: authUser, token: authToken } = useAuthStore.getState();
  const isAuthenticatedUser = !!authToken && !!authUser && !authUser.isGuest;

  // Stale session storage defense: A guest/unauthenticated user can never be subscribed or own TVOD
  if (!isAuthenticatedUser) {
    isSvodSubscribed = false;
    isTvodPurchased = false;
  }

  // Live SVOD check — only fires when sessionStorage didn't provide isSvodSubscribed=true
  if (!isSvodSubscribed && isAuthenticatedUser) {
    try {
      const { verifySubscription } = await import('@/lib/api/verify-subscription');
      const { appConfig } = await import('@/lib/config/app.config');
      const verifyRes = await verifySubscription(
        appConfig.GEO_DEFAULT_COUNTRY_CODE,
        authToken ?? undefined
      );
      if (verifyRes?.data?.planType === 'SVOD') {
        isSvodSubscribed = true;
        logger.info('[Player Service] Live SVOD check: user IS subscribed — suppressing ads', { contentId });
      }
    } catch (err) {
      logger.warn('[Player Service] Live SVOD verify failed — proceeding with sessionStorage value', { err });
    }
  }

  // Live TVOD purchase check — only fires when asset is TVOD and sessionStorage didn't mark it purchased
  const isTvodCategory = assetCategoryCode === ASSET_CATEGORY_CODE.TVOD;
  if (!isTvodPurchased && isTvodCategory && isAuthenticatedUser) {
    try {
      const { getAssetPricing } = await import('@features/content/api/getAssetPricing');
      const { appConfig } = await import('@/lib/config/app.config');
      const pricingRes = await getAssetPricing(
        contentId,
        appConfig.GEO_DEFAULT_COUNTRY_CODE,
        authToken ?? undefined
      );
      if (pricingRes?.data?.bIsUserPurchased === true) {
        isTvodPurchased = true;
        logger.info('[Player Service] Live TVOD check: asset IS purchased — suppressing ads', { contentId });
      }
    } catch (err) {
      logger.warn('[Player Service] Live TVOD pricing check failed — proceeding with sessionStorage value', { err });
    }
  }

  const isTvodNoAds = isTvodCategory && isTvodPurchased;
  const shouldShowAds = !isSvodSubscribed && !isTvodNoAds;


  let vmapXml: string | null = null;

  if (shouldShowAds) {
    logger.info('[Player Service] User is AVOD/FVOD/guest — fetching VMAP for ads', {
      contentId,
      assetCategoryCode,
      isGuest: user?.isGuest ?? true,
    });
    vmapXml = await fetchVmapXml(contentId);
  } else {
    logger.info('[Player Service] Ad-free playback (SVOD or TVOD purchased)', {
      contentId,
      isSvodSubscribed,
      isTvodNoAds,
    });
  }

  const isSubscribeValue = isAuthenticated && isUserNotGuest && isSvodSubscribed;

  // After VMAP eligibility, fetch playback configuration
  const playbackResponse = await getPlayback(
    { assetId: contentId, isSubscribe: isSubscribeValue },
    sessionId
  );

  if (playbackResponse.metaData?.status !== 200) {
    const error = new Error(
      playbackResponse.metaData?.message || 'Failed to fetch playback details'
    ) as any;
    error.status = playbackResponse.metaData?.status;
    throw error;
  }

  const playbackData = playbackResponse.data;
  if (!playbackData) {
    throw new Error('Playback API returned null data');
  }

  // Map the playback data and metadata
  const video = mapVideoDetails(
    playbackData,
    {
      title,
      description,
      seriesInfo,
      certification,
      classifications,
      assetCategory,
      assetCertificate,
      inTop10,
      seasonId,
      numberInTop10,
      assetTypeName,
    },
    savedPosition,
    contentId,
    vmapXml,
    bypassResumePrompt
  );

  // For ad-free users, also clear adTagUrl to prevent any fallback VAST ads
  if (!shouldShowAds) {
    video.adTagUrl = null;
    video.adCuePoints = [];
  }

  logger.info('[Player Service] Video details and playback fetched successfully', {
    contentId,
    title: video.title,
    savedPosition,
    hasAds: shouldShowAds,
    hasVmap: !!vmapXml,
  });

  return video;
}

/** Last timestamp (ms) when watch progress was posted to API for each contentId */
const lastApiSaveTimeMap = new Map<string, number>();

/**
 * Save watch progress to API and local cache.
 * Local progress is saved instantly (0ms latency).
 * API calls are throttled to a minimum 15-second interval unless `forceApi` is true.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function persistWatchProgress(
  data: SaveWatchProgressRequest,
  sessionId?: string,
  forceApi: boolean = false
): Promise<void> {
  // 1. Always save locally first (instant, offline-resilient)
  saveLocalWatchProgress({
    contentId: data.contentId,
    positionSeconds: data.positionSeconds,
    durationSeconds: data.durationSeconds,
    percentage:
      data.durationSeconds > 0
        ? (data.positionSeconds / data.durationSeconds) * 100
        : 0,
    savedAt: Date.now(),
  });

  // 2. Throttle API POST requests to prevent network spam on fast play/pause toggles
  const now = Date.now();
  const lastSave = lastApiSaveTimeMap.get(data.contentId) || 0;
  const MIN_API_INTERVAL_MS = 15_000; // 15 seconds

  if (!forceApi && now - lastSave < MIN_API_INTERVAL_MS) {
    logger.debug('[Player Service] Skipping API watch progress save (throttled)', {
      contentId: data.contentId,
      timeSinceLastSaveMs: now - lastSave,
    });
    return;
  }

  // 3. Attempt API save
  lastApiSaveTimeMap.set(data.contentId, now);
  try {
    await saveWatchProgress(data, sessionId);
    logger.info('[Player Service] Watch progress saved to API', {
      contentId: data.contentId,
      position: data.positionSeconds,
    });
  } catch (error) {
    // Non-fatal — local progress already saved
    logger.warn('[Player Service] API progress save failed (local saved)', {
      contentId: data.contentId,
      error,
    });
  }
}

/**
 * Clear watch progress on completion.
 */
export function clearWatchProgress(contentId: string): void {
  const allProgress = getAllLocalProgress();
  const updated = allProgress.filter((p) => p.contentId !== contentId);
  localStorageManager.set(StorageKey.WATCH_HISTORY, updated);
  logger.info('[Player Service] Watch progress cleared', { contentId });
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function getAllLocalProgress(): WatchProgress[] {
  return localStorageManager.get<WatchProgress[]>(StorageKey.WATCH_HISTORY) ?? [];
}

export function getLocalWatchProgress(contentId: string): WatchProgress | null {
  const all = getAllLocalProgress();
  return all.find((p) => p.contentId === contentId) ?? null;
}

function saveLocalWatchProgress(progress: WatchProgress): void {
  const all = getAllLocalProgress().filter((p) => p.contentId !== progress.contentId);
  all.push(progress);
  // Cap the local history to 100 entries
  const trimmed = all.slice(-100);
  localStorageManager.set(StorageKey.WATCH_HISTORY, trimmed);
}
