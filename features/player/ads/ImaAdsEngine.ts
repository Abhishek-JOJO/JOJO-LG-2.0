/**
 * IMA Ads Engine
 *
 * Concrete implementation of AdManager using Google IMA SDK.
 * Loaded lazily via the existing loadScript utility.
 * IMA container must be a sibling of <video>, never a child.
 */

import { loadScript } from '@features/auth/providers/loadScript';
import { logger } from '@lib/logger/logger';
import type { AdManager, AdManagerConfig } from './AdManager';
import type { AdType } from '../model/types';

import { isLandingPageUrl } from '../utils/adUtils';

const IMA_SDK_URL =
  'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

function extractClickThroughUrlFromAd(ad: any): string | null {
  if (!ad) return null;

  // 1. Official SDK method
  if (typeof ad.getClickThroughUrl === 'function') {
    try {
      const url = ad.getClickThroughUrl();
      if (isLandingPageUrl(url)) return url;
    } catch {
      // ignore
    }
  }

  // 2. Direct property inspection for minified properties in ima3.js SDK
  const checked = new Set<any>();
  function search(obj: any, depth = 0): string | null {
    if (!obj || depth > 4 || checked.has(obj)) return null;
    if (typeof obj === 'string') {
      if (isLandingPageUrl(obj)) return obj;
      return null;
    }
    if (typeof obj !== 'object') return null;
    checked.add(obj);

    for (const key of Object.keys(obj)) {
      if (key === 'videoElement' || key === 'adContainer' || key === 'contentVideoElement') continue;
      try {
        const val = obj[key];
        if (typeof val === 'string' && isLandingPageUrl(val)) {
          return val;
        }
        if (typeof val === 'object' && val !== null) {
          const found = search(val, depth + 1);
          if (found) return found;
        }
      } catch {
        // ignore getter exceptions
      }
    }
    return null;
  }

  return search(ad);
}

function parseAllClickThroughsFromXml(xmlString: string | null): string[] {
  if (!xmlString) return [];
  const cleaned = xmlString.replace(/&amp;/g, '&');
  const urls: string[] = [];

  // 1. Primary: <ClickThrough...>
  const clickThroughMatches = cleaned.matchAll(/<ClickThrough[^>]*>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))\s*<\/ClickThrough>/gi);
  for (const match of clickThroughMatches) {
    let url = (match[1] || match[2] || '').trim();
    url = url.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
    if (isLandingPageUrl(url) && !urls.includes(url)) {
      urls.push(url);
    }
  }

  // 2. Fallback: <ClickTracking...> or <CustomClick...> if no ClickThrough found
  if (urls.length === 0) {
    const fallbackMatches = cleaned.matchAll(/<(?:ClickTracking|CustomClick)[^>]*>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))\s*<\/(?:ClickTracking|CustomClick)>/gi);
    for (const match of fallbackMatches) {
      let url = (match[1] || match[2] || '').trim();
      url = url.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
      if (isLandingPageUrl(url) && !urls.includes(url)) {
        urls.push(url);
      }
    }
  }

  return urls;
}

export class ImaAdsEngine implements AdManager {
  readonly providerName = 'google-ima';

  private config: AdManagerConfig | null = null;
  private adDisplayContainer: google.ima.AdDisplayContainer | null = null;
  private adsLoader: google.ima.AdsLoader | null = null;
  private adsManager: google.ima.AdsManager | null = null;
  private isInitialized = false;
  private adPlaying = false;
  private adDuration = 0;       // cached from onAdStarted, used safely in onAdProgress
  private adCurrentTime = 0;    // per-creative elapsed seconds, updated in onAdProgress
  private adBreakActive = false; // true from CONTENT_PAUSE until CONTENT_RESUME after real ad
  private firstAdStarted = false; // true once the first ad of the session has started
  private adFailsafeTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentAdPosition = 1;
  private currentTotalAds = 1;
  private currentClickThroughUrl: string | null = null;
  private currentVolume = 1;
  private currentMuted = false;

  async initialize(config: AdManagerConfig): Promise<void> {
    this.config = config;

    logger.info('[ImaAdsEngine] Loading IMA SDK');
    try {
      await loadScript(IMA_SDK_URL);
    } catch (err) {
      logger.warn('[ImaAdsEngine] IMA SDK script load failed. Adblocker likely active.', { err });
      this.config.eventBus.emit('AD_BLOCKED', { reason: 'script_load_blocked' });
      throw new Error('IMA SDK failed to load (blocked)');
    }

    if (typeof google === 'undefined' || !google.ima) {
      logger.warn('[ImaAdsEngine] Google IMA is undefined after script load. Adblocker likely active.');
      this.config.eventBus.emit('AD_BLOCKED', { reason: 'google_ima_undefined' });
      throw new Error('IMA SDK failed to load');
    }

    this.adDisplayContainer = new google.ima.AdDisplayContainer(
      config.adContainer,
      config.videoElement  // ad-dedicated <video>
    );

    this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);

    this.adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      this.onAdsManagerLoaded,
    );

    this.adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      this.onAdLoaderError,
    );

    this.isInitialized = true;
    logger.info('[ImaAdsEngine] Initialized');
  }

  requestAds(_adType: AdType): void {
    if (!this.isInitialized || !this.adsLoader || !this.config) {
      logger.warn('[ImaAdsEngine] Not initialized');
      return;
    }

    const request = new google.ima.AdsRequest();

    // Priority: inline VMAP XML > VMAP URL > individual ad tag URL
    // Inline XML bypasses CORS — IMA receives the XML directly via adsResponse
    // instead of fetching the VMAP endpoint itself.
    if (this.config.vmapXml) {
      request.adsResponse = this.config.vmapXml;
      logger.info('[ImaAdsEngine] Using inline VMAP XML (adsResponse)');
    } else if (this.config.vmapUrl) {
      request.adTagUrl = this.config.vmapUrl;
      logger.info('[ImaAdsEngine] Using VMAP URL', { vmapUrl: this.config.vmapUrl });
    } else if (this.config.adTagUrl) {
      request.adTagUrl = this.config.adTagUrl;
      logger.info('[ImaAdsEngine] Using ad tag URL', { adTagUrl: this.config.adTagUrl });
    } else {
      logger.warn('[ImaAdsEngine] No ad source configured — skipping request');
      return;
    }

    request.linearAdSlotWidth = this.config.adContainer.clientWidth || this.config.contentVideoElement.clientWidth || 640;
    request.linearAdSlotHeight = this.config.adContainer.clientHeight || this.config.contentVideoElement.clientHeight || 360;
    request.nonLinearAdSlotWidth = request.linearAdSlotWidth;
    request.nonLinearAdSlotHeight = Math.floor(request.linearAdSlotHeight / 3);

    this.adDisplayContainer?.initialize();
    this.adsLoader.requestAds(request);

    // Failsafe: if no ad started and no ad error/loader error occurred within 5 seconds,
    // play the content silently and clean up.
    this.clearFailsafeTimeout();
    this.adFailsafeTimeout = setTimeout(() => {
      if (!this.firstAdStarted && this.config) {
        logger.warn('[ImaAdsEngine] Ad request failsafe timeout reached — silently playing content');
        this.firstAdStarted = true;
        this.adPlaying = false;
        this.adBreakActive = false;
        this.config.eventBus.emit('AD_ERROR', {
          errorCode: -999,
          errorMessage: 'Ad request timeout (failsafe)',
        });
        this.config.contentVideoElement.play().catch((err) => {
          logger.warn('[ImaAdsEngine] Failsafe content play blocked, trying muted play', { err });
          if (this.config) {
            this.config.contentVideoElement.muted = true;
            this.config.contentVideoElement.play().catch((fallbackErr) => {
              logger.error('[ImaAdsEngine] Failsafe content play failed even when muted', { fallbackErr });
            });
          }
        });
      }
    }, 5000);

    logger.info('[ImaAdsEngine] Ads requested', {
      mode: this.config.vmapXml ? 'vmap-xml' : this.config.vmapUrl ? 'vmap' : 'vast',
    });
  }

  resume(): void {
    this.adsManager?.resume();
  }

  pause(): void {
    this.adsManager?.pause();
  }

  skip(): void {
    this.adsManager?.skip();
  }

  setVolume(volume: number): void {
    this.currentVolume = volume;
    if (this.adsManager) {
      try {
        this.adsManager.setVolume(this.currentMuted ? 0 : volume);
      } catch (err) {
        logger.warn('[ImaAdsEngine] Error setting adsManager volume', { err });
      }
    }
    if (this.config?.videoElement) {
      this.config.videoElement.volume = volume;
    }
  }

  setMuted(muted: boolean): void {
    this.currentMuted = muted;
    if (this.adsManager) {
      try {
        this.adsManager.setVolume(muted ? 0 : (this.currentVolume || 1));
      } catch (err) {
        logger.warn('[ImaAdsEngine] Error setting adsManager muted', { err });
      }
    }
    if (this.config?.videoElement) {
      this.config.videoElement.muted = muted;
    }
  }

  resize(width: number, height: number): void {
    const viewMode = document.fullscreenElement
      ? google.ima.ViewMode.FULLSCREEN
      : google.ima.ViewMode.NORMAL;
    this.adsManager?.resize(width, height, viewMode);
  }

  destroy(): void {
    this.clearFailsafeTimeout();
    this.adsManager?.destroy();
    this.adsLoader?.destroy();
    this.adDisplayContainer?.destroy();

    this.adsManager = null;
    this.adsLoader = null;
    this.adDisplayContainer = null;
    this.config = null;
    this.isInitialized = false;
    this.adPlaying = false;
    this.adDuration = 0;
    this.adCurrentTime = 0;
    this.adBreakActive = false;
    this.firstAdStarted = false;
    this.currentAdPosition = 1;
    this.currentTotalAds = 1;
    this.currentClickThroughUrl = null;

    logger.info('[ImaAdsEngine] Destroyed');
  }

  isAdPlaying(): boolean {
    return this.adPlaying;
  }

  getClickThroughUrl(): string | null {
    return this.currentClickThroughUrl;
  }

  contentComplete(): void {
    this.adsLoader?.contentComplete();
    logger.info('[ImaAdsEngine] Content complete notified');
  }

  // ── Private event handlers ────────────────────────────────────────────────

  private readonly onAdsManagerLoaded = (
    event: google.ima.AdsManagerLoadedEvent
  ): void => {
    if (!this.config) return;

    const settings = new google.ima.AdsRenderingSettings();
    settings.restoreCustomPlaybackStateOnAdBreakComplete = true;
    settings.enablePreloading = true;
    // Disable IMA's built-in countdown/ad badge UI — we render our own AdOverlay.
    settings.uiElements = [];

    // Pass contentVideoElement as the content playback element — this is the correct
    // IMA integration pattern for custom players. IMA tracks content playhead ticks
    // from this element and triggers VMAP mid-rolls at scheduled cue points.
    this.adsManager = event.getAdsManager(this.config.contentVideoElement, settings);

    try {
      this.updateCuePoints();
    } catch (err) {
      logger.warn('[ImaAdsEngine] Failed to retrieve initial cue points', { err });
    }
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
      this.onContentPauseRequested
    );

    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      this.onContentResumeRequested
    );

    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.STARTED,
      this.onAdStarted
    );

    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.COMPLETE,
      this.onAdCompleted
    );

    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.SKIPPED,
      this.onAdSkipped
    );

    this.adsManager.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      this.onAdError
    );

    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.AD_PROGRESS,
      this.onAdProgress as any
    );

    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
      this.onAllAdsCompleted as any
    );

    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.CLICK,
      this.onAdClicked as any
    );

    // Also update cue points when individual ads are loaded or ad breaks become ready
    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.LOADED,
      () => this.updateCuePoints()
    );

    this.adsManager.addEventListener(
      google.ima.AdEvent.Type.AD_BREAK_READY,
      () => this.updateCuePoints()
    );

    // IMA requires the content video to be paused before adsManager.start().
    // Pause the CONTENT video (Shaka's element) — not the ad video element.
    this.config.contentVideoElement.pause();

    try {
      // Prefer adContainer dimensions (always laid out).
      // Fall back to window dimensions — reliable in fullscreen contexts where
      // the container may not have flushed its layout yet at this moment.
      const w = this.config.adContainer.clientWidth
        || this.config.contentVideoElement.clientWidth
        || window.innerWidth
        || 1280;
      const h = this.config.adContainer.clientHeight
        || this.config.contentVideoElement.clientHeight
        || window.innerHeight
        || 720;
      logger.info('[ImaAdsEngine] AdsManager init', { w, h });
      this.adsManager.init(w, h, google.ima.ViewMode.NORMAL);
      this.adsManager.start();
      
      // Update cue points again immediately after starting adsManager
      setTimeout(() => this.updateCuePoints(), 100);
    } catch (err) {
      logger.error('[ImaAdsEngine] AdsManager start error', { err });
      this.config.eventBus.emit('AD_ERROR', {
        errorCode: 0,
        errorMessage: 'AdsManager start failed',
      });
    }
  };

  private readonly onContentPauseRequested = (): void => {
    this.adPlaying = true;
    this.adBreakActive = true;
    this.config?.contentVideoElement.pause();
    logger.info('[ImaAdsEngine] Content pause requested');
  };

  private readonly onContentResumeRequested = (): void => {
    this.adPlaying = false;
    this.adBreakActive = false;

    // Guard: don't resume content on the spurious CONTENT_RESUME_REQUESTED that
    // VMAP fires before the first pre-roll starts. Only resume after firstAdStarted
    // confirms at least one real ad has played (or been attempted).
    if (!this.firstAdStarted) {
      logger.info('[ImaAdsEngine] Content resume requested (suppressed — pre-roll not yet started)');
      return;
    }

    // Definitively clear ad state so the AdOverlay hides even if AD_COMPLETED
    // fired in a weird order. This is the authoritative "ad break is over" signal.
    this.config?.eventBus.emit('AD_COMPLETED', {
      adId: '',
      adType: 'pre_roll',
    });

    this.config?.contentVideoElement.play().catch((err) => {
      logger.warn('[ImaAdsEngine] Content resume play blocked, trying muted play', { err });
      if (this.config) {
        this.config.contentVideoElement.muted = true;
        this.config.contentVideoElement.play().catch((fallbackErr) => {
          logger.error('[ImaAdsEngine] Content resume play failed even when muted', { fallbackErr });
        });
      }
    });
    logger.info('[ImaAdsEngine] Content resume requested — content restarted');
  };

  private readonly onAdStarted = (event: google.ima.AdEvent): void => {
    const ad = event.getAd();
    if (!ad) return;
    
    // Failsafe: Ensure content video is paused while ad plays
    this.config?.contentVideoElement.pause();

    // Ensure ad volume and mute state are synchronized with IMA adsManager
    try {
      this.adsManager?.setVolume(this.currentMuted ? 0 : (this.currentVolume || 1));
      if (this.config?.videoElement) {
        this.config.videoElement.muted = this.currentMuted;
        this.config.videoElement.volume = this.currentVolume || 1;
      }
    } catch {
      // ignore
    }

    const adPodInfo = ad.getAdPodInfo();
    const position = adPodInfo ? adPodInfo.getTimeOffset() : 0;
    const adPosition = adPodInfo ? adPodInfo.getAdPosition() : 1;
    const totalAds = adPodInfo ? adPodInfo.getTotalAds() : 1;
    this.currentAdPosition = adPosition;
    this.currentTotalAds = totalAds;
    const adType = this.resolveAdType(position);

    // Use adData.duration for accurate per-creative duration.
    // ad.getDuration() can return the pod total (e.g. 300s) for VMAP pod ads.
    const adData = event.getAdData() as { currentTime?: number; duration?: number } | null;
    const creativeDuration = (adData?.duration && adData.duration > 0)
      ? adData.duration
      : ad.getDuration();

    this.adDuration = creativeDuration;
    this.adCurrentTime = 0;
    this.firstAdStarted = true; // suppress future spurious CONTENT_RESUME before this point
    this.clearFailsafeTimeout();

    const title = ad.getTitle() || '';
    const description = ad.getDescription() || '';
    const advertiserName = (typeof (ad as any).getAdvertiserName === 'function')
      ? (ad as any).getAdvertiserName()
      : '';

    let clickThroughUrl: string | null = extractClickThroughUrlFromAd(ad);

    if (!clickThroughUrl && this.config?.vmapXml) {
      const allUrls = parseAllClickThroughsFromXml(this.config.vmapXml);
      clickThroughUrl = allUrls[adPosition - 1] || allUrls[0] || null;
    }
    this.currentClickThroughUrl = clickThroughUrl;

    this.config?.eventBus.emit('AD_STARTED', {
      adId: ad.getAdId(),
      adType,
      position,
      title,
      description,
      advertiserName,
      adPosition,
      totalAds,
      clickThroughUrl,
    });

    // Pre-populate duration so the overlay shows the correct total immediately,
    // before AD_PROGRESS events start firing.
    this.config?.eventBus.emit('AD_PROGRESS', {
      adId: ad.getAdId(),
      remainingSeconds: creativeDuration,
      totalSeconds: creativeDuration,
      isSkippable: ad.isSkippable(),
      skipOffsetSeconds: ad.getSkipTimeOffset(),
      adPosition,
      totalAds,
    });

    logger.info('[ImaAdsEngine] Ad started', {
      adId: ad.getAdId(),
      adType,
      creativeDuration,
    });

    this.updateCuePoints();
  };

  private readonly onAdCompleted = (event: google.ima.AdEvent): void => {
    const ad = event.getAd();
    if (!ad) return;
    const position = ad.getAdPodInfo().getTimeOffset();
    const adType = this.resolveAdType(position);

    this.config?.eventBus.emit('AD_COMPLETED', {
      adId: ad.getAdId(),
      adType,
    });

    logger.info('[ImaAdsEngine] Ad completed', { adId: ad.getAdId() });
  };

  private readonly onAdSkipped = (event: google.ima.AdEvent): void => {
    const ad = event.getAd();
    if (!ad) return;
    const position = ad.getAdPodInfo().getTimeOffset();
    const adType = this.resolveAdType(position);
    const skipTime = this.adsManager
      ? Math.max(0, ad.getDuration() - this.adsManager.getRemainingTime())
      : 0;

    this.config?.eventBus.emit('AD_SKIPPED', {
      adId: ad.getAdId(),
      adType,
      skipTimeSeconds: skipTime,
    });

    logger.info('[ImaAdsEngine] Ad skipped', { adId: ad.getAdId() });
  };

  private readonly onAdError = (event: google.ima.AdErrorEvent): void => {
    const error = event.getError();
    this.adPlaying = false;
    this.adBreakActive = false;
    // Treat an ad error as if the break completed — content must always resume.
    // If this fires before firstAdStarted (e.g. pre-roll fails to load),
    // we still need to allow content to play.
    this.firstAdStarted = true;

    const code = error.getErrorCode();
    const message = error.getMessage() || '';
    const lowerMessage = message.toLowerCase();

    this.config?.eventBus.emit('AD_ERROR', {
      errorCode: code,
      errorMessage: message,
    });

    if (
      code === 1012 ||
      code === 1009 ||
      lowerMessage.includes('blocked') ||
      lowerMessage.includes('adblock') ||
      lowerMessage.includes('connection failed')
    ) {
      this.config?.eventBus.emit('AD_BLOCKED', { reason: `ad_error_${code}` });
    }

    this.clearFailsafeTimeout();
    this.config?.contentVideoElement.play().catch((err) => {
      logger.warn('[ImaAdsEngine] Ad error playback resume blocked, trying muted play', { err });
      if (this.config) {
        this.config.contentVideoElement.muted = true;
        this.config.contentVideoElement.play().catch((fallbackErr) => {
          logger.error('[ImaAdsEngine] Ad error playback resume failed even when muted', { fallbackErr });
        });
      }
    });

    logger.error('[ImaAdsEngine] Ad error', {
      code,
      message,
    });
  };

  private readonly onAdLoaderError = (event: google.ima.AdErrorEvent): void => {
    const error = event.getError();
    this.adPlaying = false;
    this.adBreakActive = false;
    this.firstAdStarted = true; // allow content to play even if ads never loaded

    const code = error.getErrorCode();
    const message = error.getMessage() || '';
    const lowerMessage = message.toLowerCase();

    this.config?.eventBus.emit('AD_ERROR', {
      errorCode: code,
      errorMessage: message,
    });

    if (
      code === 1012 ||
      code === 1009 ||
      lowerMessage.includes('blocked') ||
      lowerMessage.includes('adblock') ||
      lowerMessage.includes('connection failed')
    ) {
      this.config?.eventBus.emit('AD_BLOCKED', { reason: `loader_error_${code}` });
    }

    this.clearFailsafeTimeout();
    this.config?.contentVideoElement.play().catch((err) => {
      logger.warn('[ImaAdsEngine] Loader error playback resume blocked, trying muted play', { err });
      if (this.config) {
        this.config.contentVideoElement.muted = true;
        this.config.contentVideoElement.play().catch((fallbackErr) => {
          logger.error('[ImaAdsEngine] Loader error playback resume failed even when muted', { fallbackErr });
        });
      }
    });
    logger.error('[ImaAdsEngine] Loader error', {
      code,
      message,
    });
  };

  private readonly onAdProgress = (event: google.ima.AdEvent): void => {
    if (!this.config) return;
    const ad = event.getAd();

    // Dynamically resolve clickThroughUrl if not available during initial onAdStarted
    if (!this.currentClickThroughUrl && ad) {
      const resolved = extractClickThroughUrlFromAd(ad);
      if (resolved) {
        this.currentClickThroughUrl = resolved;
        logger.info('[ImaAdsEngine] Dynamically resolved clickThroughUrl during ad progress', { resolved });
      }
    }

    // IMPORTANT: adsManager.getRemainingTime() returns pod-level remaining
    // (sum of all ads in the break, e.g. 300s) — NOT the individual creative.
    // Use event.getAdData() which carries per-creative {currentTime, duration}.
    const adData = event.getAdData() as { currentTime?: number; duration?: number } | null;
    const creativeCurrentTime = adData?.currentTime ?? 0;
    const creativeDuration = (adData?.duration && adData.duration > 0)
      ? adData.duration
      : this.adDuration;

    // Keep adDuration in sync with the most accurate source
    if (creativeDuration > 0) this.adDuration = creativeDuration;
    this.adCurrentTime = creativeCurrentTime;

    const remaining = Math.max(0, creativeDuration - creativeCurrentTime);
    const adPodInfo = ad?.getAdPodInfo();
    const adPosition = adPodInfo ? adPodInfo.getAdPosition() : this.currentAdPosition;
    const totalAds = adPodInfo ? adPodInfo.getTotalAds() : this.currentTotalAds;

    this.config.eventBus.emit('AD_PROGRESS', {
      adId: ad?.getAdId() ?? '',
      remainingSeconds: remaining,
      totalSeconds: creativeDuration,
      isSkippable: ad?.isSkippable() ?? false,
      skipOffsetSeconds: ad?.getSkipTimeOffset() ?? 5,
      adPosition,
      totalAds,
    });
  };

  private readonly onAllAdsCompleted = (): void => {
    this.config?.eventBus.emit('ALL_ADS_COMPLETED', undefined);
    logger.info('[ImaAdsEngine] All ads completed');
  };

  private readonly onAdClicked = (event: google.ima.AdEvent): void => {
    const ad = event.getAd();
    const adId = ad ? ad.getAdId() : '';
    let clickThroughUrl = extractClickThroughUrlFromAd(ad) || this.currentClickThroughUrl;
    if (clickThroughUrl) {
      this.currentClickThroughUrl = clickThroughUrl;
    }

    logger.info('[ImaAdsEngine] Ad clicked event fired from IMA SDK', { adId, clickThroughUrl });

    this.config?.eventBus.emit('AD_CLICKED', {
      adId,
      clickThroughUrl: clickThroughUrl || undefined,
    });
  };

  private resolveAdType(timeOffset: number): AdType {
    if (timeOffset === 0) return 'pre_roll';
    if (timeOffset === -1) return 'post_roll';
    return 'mid_roll';
  }

  private updateCuePoints(): void {
    if (!this.adsManager || !this.config) return;
    try {
      const cuePoints = (this.adsManager as any).getCuePoints();
      logger.info('[ImaAdsEngine] Retrieved cue points from adsManager', { cuePoints });
      if (cuePoints && cuePoints.length > 0) {
        this.config.eventBus.emit('AD_CUE_POINTS_CHANGED', { cuePoints });
      }
    } catch (err) {
      logger.warn('[ImaAdsEngine] Failed to retrieve cue points from adsManager', { err });
    }
  }

  private clearFailsafeTimeout(): void {
    if (this.adFailsafeTimeout) {
      clearTimeout(this.adFailsafeTimeout);
      this.adFailsafeTimeout = null;
    }
  }
}
