/**
 * Google IMA SDK Type Declarations
 * Minimal strict types for the IMA HTML5 SDK v3
 * https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side
 */

declare namespace google {
  namespace ima {
    // ── Ad Display Container ────────────────────────────────────────────────
    class AdDisplayContainer {
      constructor(
        adContainer: HTMLElement,
        videoElement?: HTMLVideoElement,
        clickTrackingElement?: HTMLElement
      );
      initialize(): void;
      destroy(): void;
    }

    // ── Ads Loader ──────────────────────────────────────────────────────────
    class AdsLoader {
      constructor(container: AdDisplayContainer);
      addEventListener<K extends keyof AdsManagerLoadedEventMap>(
        type: K,
        listener: (event: AdsManagerLoadedEventMap[K]) => void,
        useCapture?: boolean
      ): void;
      addEventListener(
        type: string,
        listener: (event: AdErrorEvent) => void,
        useCapture?: boolean
      ): void;
      removeEventListener(type: string, listener: (event: Event) => void): void;
      requestAds(request: AdsRequest): void;
      contentComplete(): void;
      destroy(): void;
    }

    interface AdsManagerLoadedEventMap {
      [AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED]: AdsManagerLoadedEvent;
      [AdErrorEvent.Type.AD_ERROR]: AdErrorEvent;
    }

    // ── Ads Manager ─────────────────────────────────────────────────────────
    class AdsManager {
      addEventListener<K extends keyof AdsManagerEventMap>(
        type: K,
        listener: (event: AdsManagerEventMap[K]) => void,
        useCapture?: boolean
      ): void;
      addEventListener(
        type: string,
        listener: (event: Event) => void,
        useCapture?: boolean
      ): void;
      removeEventListener(type: string, listener: (event: Event) => void): void;
      init(width: number, height: number, viewMode: ViewMode): void;
      start(): void;
      pause(): void;
      resume(): void;
      skip(): void;
      stop(): void;
      destroy(): void;
      resize(width: number, height: number, viewMode: ViewMode): void;
      getRemainingTime(): number;
      getVolume(): number;
      setVolume(volume: number): void;
      isCustomClickTrackingUsed(): boolean;
      isCustomPlaybackUsed(): boolean;
    }

    interface AdsManagerEventMap {
      [AdEvent.Type.CONTENT_PAUSE_REQUESTED]: AdEvent;
      [AdEvent.Type.CONTENT_RESUME_REQUESTED]: AdEvent;
      [AdEvent.Type.LOADED]: AdEvent;
      [AdEvent.Type.STARTED]: AdEvent;
      [AdEvent.Type.COMPLETE]: AdEvent;
      [AdEvent.Type.SKIPPED]: AdEvent;
      [AdEvent.Type.SKIPPABLE_STATE_CHANGED]: AdEvent;
      [AdEvent.Type.ALL_ADS_COMPLETED]: AdEvent;
      [AdEvent.Type.PAUSED]: AdEvent;
      [AdEvent.Type.RESUMED]: AdEvent;
      [AdEvent.Type.FIRST_QUARTILE]: AdEvent;
      [AdEvent.Type.MIDPOINT]: AdEvent;
      [AdEvent.Type.THIRD_QUARTILE]: AdEvent;
      [AdErrorEvent.Type.AD_ERROR]: AdErrorEvent;
    }

    // ── Ads Request ─────────────────────────────────────────────────────────
    class AdsRequest {
      adTagUrl: string;
      adsResponse?: string;
      contentDuration?: number;
      contentKeywords?: string[];
      contentTitle?: string;
      linearAdSlotHeight: number;
      linearAdSlotWidth: number;
      nonLinearAdSlotHeight: number;
      nonLinearAdSlotWidth: number;
      vastLoadTimeout?: number;
      setAdWillAutoPlay(autoPlay: boolean): void;
      setAdWillPlayMuted(muted: boolean): void;
    }

    // ── Ad ──────────────────────────────────────────────────────────────────
    interface Ad {
      getAdId(): string;
      getAdSystem(): string;
      getAdPodInfo(): AdPodInfo;
      getApiFramework(): string | null;
      getCompanionAds(
        adSlotWidth: number,
        adSlotHeight: number,
        settings?: CompanionAdSelectionSettings
      ): CompanionAd[];
      getContentType(): string;
      getCreativeAdId(): string;
      getCreativeId(): string;
      getDealId(): string;
      getDescription(): string;
      getDuration(): number;
      getHeight(): number;
      getMinSuggestedDuration(): number;
      getSkipTimeOffset(): number;
      getSurveyUrl(): string | null;
      getTitle(): string;
      getTraffickingParameters(): Record<string, string>;
      getUiElements(): string[];
      getUniversalAdIdRegistry(): string;
      getUniversalAdIds(): UniversalAdIdInfo[];
      getUniversalAdIdValue(): string;
      getVastMediaBitrate(): number;
      getVastMediaHeight(): number;
      getVastMediaWidth(): number;
      getWidth(): number;
      getWrapperAdIds(): string[];
      getWrapperAdSystems(): string[];
      getWrapperCreativeIds(): string[];
      isLinear(): boolean;
      isSkippable(): boolean;
    }

    interface AdPodInfo {
      getAdPosition(): number;
      getIsBumper(): boolean;
      getMaxDuration(): number;
      getPodIndex(): number;
      getTimeOffset(): number;
      getTotalAds(): number;
    }

    interface CompanionAd {
      getAdSlotId(): string;
      getContent(): string;
      getContentType(): string;
      getHeight(): number;
      getWidth(): number;
    }

    interface CompanionAdSelectionSettings {
      resourceType?: CompanionAdSelectionSettings.ResourceType;
      creativeType?: CompanionAdSelectionSettings.CreativeType;
      sizeCriteria?: CompanionAdSelectionSettings.SizeCriteria;
      adSlotIds?: string[];
      nearMatchPercent?: number;
    }

    namespace CompanionAdSelectionSettings {
      enum ResourceType {
        ALL = 'ALL',
        HTML = 'HTML',
        IFRAME = 'IFRAME',
        STATIC = 'STATIC',
      }
      enum CreativeType {
        ALL = 'ALL',
        FLASH = 'FLASH',
        IMAGE = 'IMAGE',
      }
      enum SizeCriteria {
        IGNORE = 'IGNORE',
        SELECT_EXACT_MATCH = 'SELECT_EXACT_MATCH',
        SELECT_NEAR_MATCH = 'SELECT_NEAR_MATCH',
      }
    }

    interface UniversalAdIdInfo {
      getAdIdRegistry(): string;
      getAdIdValue(): string;
    }

    // ── Events ──────────────────────────────────────────────────────────────
    class AdEvent {
      getAd(): Ad;
      getAdData(): Record<string, unknown>;
      type: string;

      static Type: {
        CONTENT_PAUSE_REQUESTED: 'contentPauseRequested';
        CONTENT_RESUME_REQUESTED: 'contentResumeRequested';
        LOADED: 'loaded';
        STARTED: 'started';
        COMPLETE: 'complete';
        SKIPPED: 'skipped';
        SKIPPABLE_STATE_CHANGED: 'skippableStateChanged';
        ALL_ADS_COMPLETED: 'allAdsCompleted';
        PAUSED: 'adPaused';
        RESUMED: 'adResumed';
        FIRST_QUARTILE: 'firstQuartile';
        MIDPOINT: 'midpoint';
        THIRD_QUARTILE: 'thirdQuartile';
        IMPRESSION: 'impression';
        CLICK: 'click';
        VIDEO_CLICKED: 'videoClicked';
        VIDEO_ICON_CLICKED: 'videoIconClicked';
        AD_BREAK_READY: 'adBreakReady';
        AD_BUFFERING: 'adBuffering';
        AD_METADATA: 'adMetadata';
        AD_PROGRESS: 'adProgress';
        DURATION_CHANGE: 'durationChange';
        INTERACTION: 'interaction';
        LINEAR_CHANGED: 'linearChanged';
        LOG: 'log';
        USER_CLOSE: 'userClose';
        VIEWABLE_IMPRESSION: 'viewable_impression';
        VOLUME_CHANGED: 'volumeChange';
        VOLUME_MUTED: 'mute';
      };
    }

    class AdErrorEvent {
      getError(): AdError;
      type: string;

      static Type: {
        AD_ERROR: 'adError';
      };
    }

    class AdsManagerLoadedEvent {
      getAdsManager(
        contentPlayback: HTMLVideoElement,
        adsRenderingSettings?: AdsRenderingSettings
      ): AdsManager;

      static Type: {
        ADS_MANAGER_LOADED: 'adsManagerLoaded';
      };
    }

    // ── Errors ──────────────────────────────────────────────────────────────
    interface AdError {
      getErrorCode(): number;
      getInnerError(): Error | null;
      getMessage(): string;
      getType(): string;
      getVastErrorCode(): number;
    }

    // ── Rendering Settings ───────────────────────────────────────────────────
    class AdsRenderingSettings {
      autoAlign: boolean;
      bitrate: number;
      enablePreloading: boolean;
      loadVideoTimeout: number;
      mimeTypes: string[];
      playAdsAfterTime: number;
      restoreCustomPlaybackStateOnAdBreakComplete: boolean;
      uiElements: string[];
      useStyledLinearAds: boolean;
      useStyledNonLinearAds: boolean;
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    class ImaSdkSettings {
      getCompanionBackfill(): ImaSdkSettings.CompanionBackfillMode;
      getDisableCustomPlaybackForIOS10Plus(): boolean;
      getFeatureFlags(): Record<string, unknown>;
      getLocale(): string;
      getNumRedirects(): number;
      getPlayerType(): string;
      getPlayerVersion(): string;
      getPpid(): string;
      isCookiesEnabled(): boolean;
      isVpaidAllowed(): boolean;
      isVpaidEnabled(): boolean;
      setCompanionBackfill(
        mode: ImaSdkSettings.CompanionBackfillMode
      ): void;
      setDisableCustomPlaybackForIOS10Plus(disable: boolean): void;
      setFeatureFlags(featureFlags: Record<string, unknown>): void;
      setLocale(locale: string): void;
      setNumRedirects(numRedirects: number): void;
      setPlayerType(playerType: string): void;
      setPlayerVersion(playerVersion: string): void;
      setPpid(ppid: string): void;
      setVpaidMode(vpaidMode: ImaSdkSettings.VpaidMode): void;
    }

    namespace ImaSdkSettings {
      enum CompanionBackfillMode {
        ALWAYS = 'always',
        ON_MASTER_AD = 'on_master_ad',
      }
      enum VpaidMode {
        DISABLED = 0,
        ENABLED = 1,
        INSECURE = 2,
      }
    }

    // ── View Mode ────────────────────────────────────────────────────────────
    enum ViewMode {
      FULLSCREEN = 'fullscreen',
      NORMAL = 'normal',
    }

    // ── SDK Version ──────────────────────────────────────────────────────────
    const VERSION: string;
    const settings: ImaSdkSettings;
  }
}
