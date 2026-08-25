/**
 * Player Store
 *
 * Zustand store for persistent player preferences and UI state.
 * Follows exact pattern of useAuthStore / useProfileStore.
 *
 * RULES:
 * - Store: volume, speed, quality, subtitle, audio, fullscreen, pip, uiState
 * - DO NOT store: currentTime, duration, buffered (use refs/local state)
 */

import { create } from 'zustand';
import { StorageKey } from '@enums/storage.enum';
import { localStorageManager } from '@lib/localStorage/localStorage.manager';
import type {
  PlayerStatus,
  QualityOption,
  AudioTrack,
  SubtitleTrack,
  PlaybackSpeed,
  CaptionSize,
  AdState,
  PlayerError,
  PlayerFeatureFlags,
} from '@features/player/model/types';

interface PlayerState {
  // ── Persistent preferences ────────────────────────────────────────────────
  volume: number;
  isMuted: boolean;
  speed: PlaybackSpeed;
  captionSize: CaptionSize;
  captionFontSize: number;
  captionTextColor: string;
  captionBgColor: string;
  captionBgOpacity: number;

  // ── Runtime state (reset on each video) ──────────────────────────────────
  status: PlayerStatus;
  qualities: QualityOption[];
  activeQualityId: number;
  audioTracks: AudioTrack[];
  activeAudioTrackId: number;
  subtitleTracks: SubtitleTrack[];
  activeSubtitleTrackId: number;
  isFullscreen: boolean;
  isPip: boolean;
  error: PlayerError | null;
  adState: AdState;

  // ── UI visibility ────────────────────────────────────────────────────────
  areControlsVisible: boolean;
  isSettingsPanelOpen: boolean;
  isAnyCardHovered: boolean;
  isSearchOpen: boolean;
}

interface PlayerActions {
  // Preferences
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setCaptionSize: (size: CaptionSize) => void;
  setCaptionFontSize: (size: number) => void;
  setCaptionTextColor: (color: string) => void;
  setCaptionBgColor: (color: string) => void;
  setCaptionBgOpacity: (opacity: number) => void;

  // Status
  setStatus: (status: PlayerStatus) => void;
  setError: (error: PlayerError | null) => void;

  // Tracks
  setQualities: (qualities: QualityOption[]) => void;
  setActiveQuality: (qualityId: number) => void;
  setAudioTracks: (tracks: AudioTrack[]) => void;
  setActiveAudioTrack: (trackId: number) => void;
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  setActiveSubtitleTrack: (trackId: number) => void;

  // Screen
  setFullscreen: (value: boolean) => void;
  setPip: (value: boolean) => void;

  // UI
  setControlsVisible: (visible: boolean) => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setIsAnyCardHovered: (value: boolean) => void;
  setSearchOpen: (open: boolean) => void;

  // Ad state
  setAdState: (adState: Partial<AdState>) => void;

  // Reset (call when loading a new video)
  resetRuntimeState: () => void;
}

const DEFAULT_AD_STATE: AdState = {
  isPlaying: false,
  adType: null,
  adId: null,
  remainingSeconds: 0,
  totalSeconds: 0,
  isSkippable: false,
  skipOffsetSeconds: 5,
  isLoading: false,
  hasError: false,
  errorMessage: null,
  adPosition: 1,
  totalAds: 1,
  clickThroughUrl: null,
};

const getInitialVolume = (): number => {
  if (typeof window === 'undefined') return 1;
  return localStorageManager.get<number>(StorageKey.PLAYER_VOLUME) ?? 1;
};

const getInitialMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorageManager.get<boolean>(StorageKey.PLAYER_MUTED) ?? false;
};

const getInitialSpeed = (): PlaybackSpeed => {
  if (typeof window === 'undefined') return 1;
  return localStorageManager.get<PlaybackSpeed>(StorageKey.PLAYER_SPEED) ?? 1;
};

const getInitialCaptionSize = (): CaptionSize => {
  if (typeof window === 'undefined') return 'medium';
  return localStorageManager.get<CaptionSize>(StorageKey.PLAYER_CAPTION_SIZE) ?? 'medium';
};

const getInitialCaptionFontSize = (): number => {
  if (typeof window === 'undefined') return 20;
  return localStorageManager.get<number>(StorageKey.PLAYER_CAPTION_FONT_SIZE) ?? 20;
};

const getInitialCaptionTextColor = (): string => {
  if (typeof window === 'undefined') return '#ffffff';
  return localStorageManager.get<string>(StorageKey.PLAYER_CAPTION_TEXT_COLOR) ?? '#ffffff';
};

const getInitialCaptionBgColor = (): string => {
  if (typeof window === 'undefined') return '#000000';
  return localStorageManager.get<string>(StorageKey.PLAYER_CAPTION_BG_COLOR) ?? '#000000';
};

const getInitialCaptionBgOpacity = (): number => {
  if (typeof window === 'undefined') return 0.8;
  return localStorageManager.get<number>(StorageKey.PLAYER_CAPTION_BG_OPACITY) ?? 0.8;
};

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  volume: getInitialVolume(),
  isMuted: getInitialMuted(),
  speed: getInitialSpeed(),
  captionSize: getInitialCaptionSize(),
  captionFontSize: getInitialCaptionFontSize(),
  captionTextColor: getInitialCaptionTextColor(),
  captionBgColor: getInitialCaptionBgColor(),
  captionBgOpacity: getInitialCaptionBgOpacity(),
  status: 'idle',
  qualities: [],
  activeQualityId: -1,
  audioTracks: [],
  activeAudioTrackId: 0,
  subtitleTracks: [],
  activeSubtitleTrackId: -1,
  isFullscreen: false,
  isPip: false,
  error: null,
  adState: DEFAULT_AD_STATE,
  areControlsVisible: true,
  isSettingsPanelOpen: false,
  isAnyCardHovered: false,
  isSearchOpen: false,

  // ── Actions ────────────────────────────────────────────────────────────────

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    localStorageManager.set(StorageKey.PLAYER_VOLUME, clamped);
    
    // Automatically unmute if volume is increased from 0, or mute if set to 0
    const nextMuted = clamped === 0;
    localStorageManager.set(StorageKey.PLAYER_MUTED, nextMuted);
    
    set({ volume: clamped, isMuted: nextMuted });
  },

  setMuted: (muted) => {
    localStorageManager.set(StorageKey.PLAYER_MUTED, muted);
    set({ isMuted: muted });
  },

  toggleMuted: () => {
    set((state) => {
      const nextMuted = !state.isMuted;
      localStorageManager.set(StorageKey.PLAYER_MUTED, nextMuted);
      return { isMuted: nextMuted };
    });
  },

  setSpeed: (speed) => {
    localStorageManager.set(StorageKey.PLAYER_SPEED, speed);
    set({ speed });
  },

  setCaptionSize: (captionSize) => {
    localStorageManager.set(StorageKey.PLAYER_CAPTION_SIZE, captionSize);
    set({ captionSize });
  },

  setCaptionFontSize: (captionFontSize) => {
    localStorageManager.set(StorageKey.PLAYER_CAPTION_FONT_SIZE, captionFontSize);
    set({ captionFontSize });
  },

  setCaptionTextColor: (captionTextColor) => {
    localStorageManager.set(StorageKey.PLAYER_CAPTION_TEXT_COLOR, captionTextColor);
    set({ captionTextColor });
  },

  setCaptionBgColor: (captionBgColor) => {
    localStorageManager.set(StorageKey.PLAYER_CAPTION_BG_COLOR, captionBgColor);
    set({ captionBgColor });
  },

  setCaptionBgOpacity: (captionBgOpacity) => {
    localStorageManager.set(StorageKey.PLAYER_CAPTION_BG_OPACITY, captionBgOpacity);
    set({ captionBgOpacity });
  },

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  setQualities: (qualities) => set({ qualities }),

  setActiveQuality: (qualityId) => set({ activeQualityId: qualityId }),

  setAudioTracks: (tracks) => set({ audioTracks: tracks }),

  setActiveAudioTrack: (trackId) => set({ activeAudioTrackId: trackId }),

  setSubtitleTracks: (tracks) => set({ subtitleTracks: tracks }),

  setActiveSubtitleTrack: (trackId) => set({ activeSubtitleTrackId: trackId }),

  setFullscreen: (value) => set({ isFullscreen: value }),

  setPip: (value) => set({ isPip: value }),

  setControlsVisible: (visible) => set({ areControlsVisible: visible }),

  setSettingsPanelOpen: (open) => set({ isSettingsPanelOpen: open }),
  setIsAnyCardHovered: (value) => set({ isAnyCardHovered: value }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),

  setAdState: (partial) =>
    set((state) => ({ adState: { ...state.adState, ...partial } })),

  resetRuntimeState: () =>
    set({
      status: 'idle',
      qualities: [],
      activeQualityId: -1,
      audioTracks: [],
      activeAudioTrackId: 0,
      subtitleTracks: [],
      activeSubtitleTrackId: -1,
      isFullscreen: false,
      isPip: false,
      error: null,
      adState: DEFAULT_AD_STATE,
      areControlsVisible: true,
      isSettingsPanelOpen: false,
    }),
}));

/**
 * Feature flags — togglable per environment / A/B test.
 * Exported as a constant (not in store — no reactive need).
 */
export const PLAYER_FEATURE_FLAGS: PlayerFeatureFlags = {
  ads: true,
  resumeWatching: true,
  nextEpisode: true,
  thumbnailPreview: true,
  pip: true,
  analytics: true,
};
