/**
 * Player Feature — Type Definitions
 *
 * Strict TypeScript types for the entire OTT player platform.
 * No `any` used anywhere in this file.
 */

// ── Streaming ────────────────────────────────────────────────────────────────

export type StreamFormat = 'hls' | 'dash' | 'mp4';

export type AdapterName = 'shaka';

// ── Video Metadata ────────────────────────────────────────────────────────────

export interface VideoDetails {
  /** Unique content identifier */
  contentId: string;
  title: string;
  description: string;
  /** Absolute URL to the HLS or DASH manifest */
  manifestUrl: string;
  streamFormat: StreamFormat;
  /** Duration in seconds */
  durationSeconds: number;
  thumbnailUrl: string;
  /** VTT file describing thumbnail sprites for seek preview */
  thumbnailVttUrl: string | null;
  /** Sprite sheet image URL (alternative to VTT) */
  thumbnailSpriteUrl: string | null;
  /** Google IMA ad tag URL (null = no ads) */
  adTagUrl: string | null;
  /** VMAP URL — when present, IMA handles all ad breaks automatically.
   *  Takes priority over adTagUrl + manual mid-roll polling. */
  vmapUrl: string | null;
  /** Pre-fetched raw VMAP XML — passed inline to IMA via adsResponse to bypass
   *  CORS issues with wildcard Access-Control-Allow-Origin headers.
   *  Takes priority over vmapUrl. */
  vmapXml: string | null;
  /** Mid-roll cue points in seconds */
  adCuePoints: number[];
  contentType: VideoContentType;
  /** Only present for episodes */
  seriesInfo: SeriesInfo | null;
  /** For resume watching */
  savedPosition: number | null;
  bypassResumePrompt?: boolean;
  /** DRM config placeholder — not implemented yet */
  drmConfig: DrmConfig | null;
  /** Live stream metadata — not implemented yet */
  liveConfig: LiveConfig | null;
  /** Player session ID for socket heartbeat — returned by playback API */
  playerId: string | null;
  /** Parent asset ID — for episodes, this is the season/show ID */
  parentId: string | null;
  /** Asset type code — for socket heartbeat */
  assetType: number | null;
  skipIntro?: {
    visibleAtSeconds: number;
    visibleEndSeconds: number;
    durationSeconds: number;
  } | null;
  skipRecap?: {
    visibleAtSeconds: number;
    visibleEndSeconds: number;
    durationSeconds: number;
  } | null;
  nextTitle?: {
    visibleAtSeconds: number;
    visibleEndSeconds: number;
    startAtSeconds: number;
  } | null;
  certification?: string | null;
  classifications?: string[] | null;
  assetCategory?: string | null;
  assetCertificate?: string | null;
  inTop10?: boolean;
  seasonId?: string | number | null;
  numberInTop10?: number | null;
  assetTypeName?: string | null;
}

export type VideoContentType = 'movie' | 'series' | 'episode' | 'trailer' | 'live';

export interface SeriesInfo {
  seriesId: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  nextEpisode: NextEpisodeInfo | null;
}

export interface NextEpisodeInfo {
  contentId: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

// ── DRM (architecture placeholder) ──────────────────────────────────────────

export interface DrmConfig {
  /** 'widevine' | 'fairplay' | 'playready' */
  type: 'widevine' | 'fairplay' | 'playready';
  licenseUrl: string;
  certificateUrl?: string;
}

// ── Live Streaming (architecture placeholder) ────────────────────────────────

export interface LiveConfig {
  isLive: boolean;
  /** UTC timestamp of the live edge */
  liveEdge: number | null;
  /** DVR window in seconds, null = no DVR */
  dvrWindowSeconds: number | null;
}

// ── Quality ──────────────────────────────────────────────────────────────────

export interface QualityOption {
  /** Shaka/HLS.js track index or -1 for auto */
  id: number;
  label: string;
  /** e.g. 1080, 720, 480 — null for auto */
  height: number | null;
  bitrate: number | null;
  isAuto: boolean;
}

// ── Audio / Subtitle Tracks ──────────────────────────────────────────────────

export interface AudioTrack {
  /** Index in the track list */
  id: number;
  language: string;
  label: string;
  isActive: boolean;
}

export interface SubtitleTrack {
  /** Index in the track list, -1 = off */
  id: number;
  language: string;
  label: string;
  isActive: boolean;
}

// ── Playback Speed ───────────────────────────────────────────────────────────

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

// ── Player UI State ──────────────────────────────────────────────────────────

export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export interface PlayerError {
  code: string;
  message: string;
  /** Which adapter reported the error */
  adapter: AdapterName | 'ads' | 'unknown';
  /** Whether recovery was attempted */
  isRecoverable: boolean;
  /** Original error object for logging */
  originalError: Error | null;
}

// ── Adapter Interface ────────────────────────────────────────────────────────

export interface PlayerAdapter {
  readonly name: AdapterName;
  /** Attach adapter to video element and load the manifest */
  load(
    videoEl: HTMLVideoElement,
    manifestUrl: string,
    drmConfig: DrmConfig | null,
    options?: PlayerLoadOptions
  ): Promise<void>;
  destroy(): void | Promise<void>;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setQuality(qualityId: number): void;
  setAudioTrack(trackId: number): void;
  setSubtitleTrack(trackId: number): void;
  setCaptionSize(size: CaptionSize): void;
  setVolume(volume: number): void;
  setPlaybackSpeed(speed: PlaybackSpeed): void;
  getQualities(): QualityOption[];
  getAudioTracks(): AudioTrack[];
  getSubtitleTracks(): SubtitleTrack[];
  /** Whether this adapter can play the given manifest */
  canPlay(manifestUrl: string, streamFormat: StreamFormat): boolean;
}

// ── Player Event Bus Payload Map ─────────────────────────────────────────────

export interface PlayerEventPayloadMap {
  PLAY: { position: number };
  PAUSE: { position: number };
  SEEK: { from: number; to: number };
  BUFFER_START: { position: number };
  BUFFER_END: { position: number; bufferingDurationMs: number };
  ENDED: { durationSeconds: number; watchDurationSeconds: number };
  CONTENT_ENDED: { durationSeconds: number; watchDurationSeconds: number };
  ERROR: { error: PlayerError; position: number };
  QUALITY_CHANGED: { oldQuality: string; newQuality: string; isAuto: boolean };
  AUDIO_CHANGED: { oldLanguage: string; newLanguage: string };
  SUBTITLE_CHANGED: { oldSubtitle: string; newSubtitle: string };
  FULLSCREEN_ENTER: { position: number };
  FULLSCREEN_EXIT: { position: number };
  PIP_ENTER: { position: number };
  PIP_EXIT: { position: number };
  AD_STARTED: {
    adId: string;
    adType: AdType;
    position: number;
    title?: string | null;
    description?: string | null;
    advertiserName?: string | null;
    adPosition?: number;
    totalAds?: number;
    clickThroughUrl?: string | null;
  };
  AD_COMPLETED: { adId: string; adType: AdType };
  AD_SKIPPED: { adId: string; adType: AdType; skipTimeSeconds: number };
  AD_ERROR: { errorCode: number; errorMessage: string };
  AD_BLOCKED: { reason: string };
  AD_CLICKED: { adId: string; clickThroughUrl?: string };
  AD_PROGRESS: {
    adId: string;
    remainingSeconds: number;
    totalSeconds: number;
    isSkippable: boolean;
    skipOffsetSeconds: number;
    adPosition?: number;
    totalAds?: number;
  };
  ALL_ADS_COMPLETED: undefined;
  NEXT_EPISODE: { triggeredBy: 'auto' | 'manual'; nextContentId: string };
  RESUME_PLAYBACK: { resumePositionSeconds: number };
  TIME_UPDATE: { currentTime: number; duration: number; buffered: number };
  DURATION_CHANGE: { duration: number };
  ADAPTER_SWITCHED: { from: AdapterName; to: AdapterName; reason: string };
  AD_CUE_POINTS_CHANGED: { cuePoints: number[] };
}

export type PlayerEventType = keyof PlayerEventPayloadMap;

// ── Ads ──────────────────────────────────────────────────────────────────────

export type AdType = 'pre_roll' | 'mid_roll' | 'post_roll';

export interface AdState {
  isPlaying: boolean;
  adType: AdType | null;
  adId: string | null;
  remainingSeconds: number;
  totalSeconds: number;
  isSkippable: boolean;
  skipOffsetSeconds: number;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  title?: string | null;
  description?: string | null;
  advertiserName?: string | null;
  adPosition?: number;
  totalAds?: number;
  clickThroughUrl?: string | null;
}

// ── Resume Watching ──────────────────────────────────────────────────────────

export interface WatchProgress {
  contentId: string;
  positionSeconds: number;
  durationSeconds: number;
  percentage: number;
  savedAt: number;
}

export interface SaveWatchProgressRequest {
  contentId: string;
  positionSeconds: number;
  durationSeconds: number;
}

// ── Next Episode ─────────────────────────────────────────────────────────────

export interface NextEpisodeState {
  isVisible: boolean;
  countdownSeconds: number;
  episode: NextEpisodeInfo;
}

// ── Thumbnail Preview ────────────────────────────────────────────────────────

export interface ThumbnailCue {
  startSeconds: number;
  endSeconds: number;
  /** URL to the sprite sheet or individual thumbnail */
  imageUrl: string;
  /** For sprite sheets: x/y/width/height offsets */
  x: number;
  y: number;
  width: number;
  height: number;
  /** True when the cue uses a sprite region (#xywh=) */
  isSprite: boolean;
}

// ── Caption appearance ───────────────────────────────────────────────────────

export type CaptionSize = 'small' | 'medium' | 'large';

export interface PlayerLoadOptions {
  /** Wrapper element for Shaka UITextDisplayer (required for styled captions). */
  videoContainer?: HTMLElement | null;
  captionSize?: CaptionSize;
  startTime?: number | null;
}

// ── Feature Flags ────────────────────────────────────────────────────────────

export interface PlayerFeatureFlags {
  ads: boolean;
  resumeWatching: boolean;
  nextEpisode: boolean;
  thumbnailPreview: boolean;
  pip: boolean;
  analytics: boolean;
}

// ── Session ──────────────────────────────────────────────────────────────────

export interface PlaybackSession {
  sessionId: string;
  contentId: string;
  startedAt: number;
  endedAt: number | null;
  watchDurationSeconds: number;
  completionPercentage: number;
  isCompleted: boolean;
}

// ── API Response shapes ───────────────────────────────────────────────────────

export interface VideoDetailsApiResponse {
  content_id: string;
  title: string;
  description: string;
  stream_url: string;
  stream_format: string;
  duration: number;
  thumbnail_url: string;
  thumbnail_vtt_url: string | null;
  thumbnail_sprite_url: string | null;
  ad_tag_url: string | null;
  ad_cue_points: number[];
  content_type: string;
  series_info: SeriesInfoApi | null;
  drm_config: DrmConfigApi | null;
  live_config: LiveConfigApi | null;
  /** Player session ID for socket heartbeat */
  player_id: string | null;
  /** Parent asset ID (season/show for episodes) */
  parent_id: string | null;
  /** Asset type code */
  asset_type: number | null;
}

export interface SeriesInfoApi {
  series_id: string;
  series_title: string;
  season_number: number;
  episode_number: number;
  next_episode: NextEpisodeApi | null;
}

export interface NextEpisodeApi {
  content_id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
}

export interface DrmConfigApi {
  type: string;
  license_url: string;
  certificate_url?: string;
}

export interface LiveConfigApi {
  is_live: boolean;
  live_edge: number | null;
  dvr_window_seconds: number | null;
}

export interface WatchProgressApiResponse {
  content_id: string;
  position_seconds: number;
}
