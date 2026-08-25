"use client";

/**
 * OTTPlayer
 *
 * Root player component. Orchestrates engine, ads, analytics, resume, next episode.
 * All other player components are children.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { VideoElement } from './VideoElement';
import { PlayerControls } from './PlayerControls';
import { LoadingScreen } from './LoadingScreen';
import { ErrorScreen } from './ErrorScreen';
import { AdOverlay } from './AdOverlay';
import { PlaybackFeedback } from './PlaybackFeedback';
import type { FeedbackAction } from './PlaybackFeedback';
import { ResumePrompt } from './ResumePrompt';
import { NextEpisodeOverlay } from './NextEpisodeOverlay';
import { NextEpisodeCard } from './NextEpisodeCard';
import { PlayerEngine } from '../engine/PlayerEngine';
import { PipManager } from '../engine/PipManager';
import { ImaAdsEngine } from '../ads/ImaAdsEngine';
import { isLandingPageUrl } from '../utils/adUtils';
import { PlayerContextProvider } from '../context/PlayerContext';
import { usePlayerStore, PLAYER_FEATURE_FLAGS } from '@store/usePlayerStore';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { usePlayerAnalytics } from '../hooks/usePlayerAnalytics';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { usePlayerHeartbeat } from '../hooks/usePlayerHeartbeat';
import { fetchAndParseVttThumbnails } from '../utils/parseVttThumbnails';
import { useAuthStore } from '@store/useAuthStore';
import { useGeoAvailability } from '@/features/geo/hooks/useGeoAvailability';
import { useVerifySubscription } from '@/hooks/useVerifySubscription';
import { appConfig } from '@/lib/config/app.config';
import { ROUTES } from '@lib/constants/routes';
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import {
  NEXT_EPISODE_TRIGGER_PERCENTAGE,
  RESUME_MIN_POSITION_SECONDS,
  RESUME_MAX_PERCENTAGE,
  AD_POLL_INTERVAL_MS,
} from '../constants/player.constants';
import type {
  VideoDetails,
  ThumbnailCue,
  PlayerStatus,
  PlaybackSpeed,
  CaptionSize,
} from '../model/types';
import { EpisodesPanel } from './EpisodesPanel';
import type { AssetSeason, AssetEpisode } from '@features/asset/model/types';
import { logger } from '@lib/logger/logger';
import { analyticsService } from '@/shared/analytics';
import { EVENT_NAMES } from '@/shared/analytics/constants/analytics.constants';

function formatDurationMinutes(totalSeconds: number | string): string {
  const secs =
    typeof totalSeconds === 'string' ? parseFloat(totalSeconds) : totalSeconds;
  if (!secs || Number.isNaN(secs)) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}

function getRgbaColor(hexColor: string, opacity: number): string {
  if (hexColor === 'transparent') return 'transparent';
  const rgb = hexToRgb(hexColor);
  if (!rgb) return `rgba(0, 0, 0, ${opacity})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

function getAgeAdvisory(certification: string): string {
  const c = certification.toUpperCase();
  if (c.includes('18') || c === 'A') {
    return 'Suitable for: 18 years and above (Adults Only)';
  }
  if (c.includes('16')) {
    return 'Suitable for: 16 years and above';
  }
  if (c.includes('15')) {
    return 'Suitable for: 15 years and above';
  }
  if (c.includes('13')) {
    return 'Suitable for: 13 years and above';
  }
  if (c.includes('12')) {
    return 'Suitable for: 12 years and above';
  }
  if (c.includes('7')) {
    return 'Suitable for: 7 years and above';
  }
  if (c === 'U' || c === 'G') {
    return 'Suitable for: All Ages (General Audience)';
  }
  return `Suitable for: ${certification} viewers`;
}

interface OTTPlayerProps {
  video: VideoDetails;
  /** Seasons + episodes for the episodes panel. Pass from the asset API response. */
  seasons?: AssetSeason[];
  /** Currently playing episode asset_id — used to highlight active row */
  currentEpisodeId?: number | null;
  /** Called when the user picks a different episode from the panel */
  onEpisodeSelect?: (episode: AssetEpisode, season: AssetSeason, startAtSeconds?: number) => void;
  onBack?: () => void;
  onGoAdsFree?: () => void;
}

export function OTTPlayer({ video, seasons = [], currentEpisodeId, onEpisodeSelect, onBack, onGoAdsFree }: OTTPlayerProps) {
  const router = useRouter();


  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  // Dedicated <video> element for IMA — keeps Shaka's content video untouched.
  // IMA renders its ad creative into this element; Shaka never touches it.
  const adVideoRef = useRef<HTMLVideoElement>(null);

  // Player engine refs & reactive state (triggers re-render when engine is initialized)
  const engineRef = useRef<PlayerEngine | null>(null);
  const [activeEngine, setActiveEngine] = useState<PlayerEngine | null>(null);
  const pipManagerRef = useRef<PipManager | null>(null);
  const adEngineRef = useRef<ImaAdsEngine | null>(null);

  // ── Mid-roll ad tracking refs ──────────────────────────────────────────────
  // Tracks which cue points have already triggered an ad (prevents replaying)
  const playedAdCuesRef = useRef<Set<number>>(new Set());
  const adPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // True when ad engine is initialized but requestAds hasn't been called yet
  // (deferred until first user gesture to satisfy browser autoplay policy)
  const pendingAdRequestRef = useRef(false);

  // ── Subscription status verification ─────────────────────────────────────
  const { isAuthenticated, user, token } = useAuthStore();
  const { countryCode } = useGeoAvailability();
  const { data: subData } = useVerifySubscription(
    countryCode ?? appConfig.GEO_DEFAULT_COUNTRY_CODE,
    token ?? undefined,
    true
  );
  const isSubscribed = isAuthenticated && !user?.isGuest && subData?.data?.planType === "SVOD";

  // VMAP takes priority over individual adTagUrl.
  // When vmapXml is present (pre-fetched), pass inline to IMA (bypasses CORS).
  // When vmapUrl only, pass URL directly.
  // In both cases IMA handles all ad breaks — skip manual mid-roll polling.
  const effectiveVmapXml =
    PLAYER_FEATURE_FLAGS.ads && video.vmapXml ? video.vmapXml : null;
  const effectiveVmapUrl =
    PLAYER_FEATURE_FLAGS.ads && !effectiveVmapXml && video.vmapUrl ? video.vmapUrl : null;
  const effectiveAdTagUrl =
    PLAYER_FEATURE_FLAGS.ads && !effectiveVmapXml && !effectiveVmapUrl && video.adTagUrl
      ? video.adTagUrl
      : null;
  // True when any ad source is active
  const hasAds = !!(effectiveVmapXml || effectiveVmapUrl || effectiveAdTagUrl);

  // ── Local UI state (currentTime/duration/buffered stay here — not in store) ──
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailCues, setThumbnailCues] = useState<ThumbnailCue[]>([]);
  const [adCuePoints, setAdCuePoints] = useState<number[]>(video.adCuePoints);

  // ── Playback feedback (OTT-style centre icon flash on action) ─────────────
  const [feedbackAction, setFeedbackAction] = useState<{ type: FeedbackAction; key: number; value?: number } | null>(null);
  const feedbackKeyRef = useRef(0);

  const triggerFeedback = useCallback((type: FeedbackAction, value?: number) => {
    feedbackKeyRef.current += 1;
    setFeedbackAction({ type, key: feedbackKeyRef.current, value });
  }, []);

  // ── Controls visibility — local state with CSS transition (Hotstar style) ─
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMenuOpenRef = useRef(false);
  const focusToControlsRef = useRef(false);
  const isPlayerFocusedRef = useRef(true);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    
    // Never hide controls if a menu is open OR if the focus is on a controller button!
    if (isMenuOpenRef.current || !isPlayerFocusedRef.current) return; 

    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setFocus('ott-player-main'); // Guarantee focus returns to the player background
    }, 3000);
  }, []);

  const handleContainerMouseMove = useCallback(() => showControls(), [showControls]);
  const handleContainerMouseLeave = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isMenuOpenRef.current || !isPlayerFocusedRef.current) return;
    // Don't hide immediately on mouse leave — let the timer do it
  }, []);



  // Show on mount, clean up timer on unmount
  useEffect(() => {
    showControls();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [showControls]);

  // ── Auto-fullscreen on mount (OTT style) ──────────────────────────────────
  // Browsers require a user gesture to enter fullscreen. We attach a one-shot
  // pointerdown listener to the container — the very first touch/click enters
  // fullscreen. Falls back silently if the browser refuses (e.g. in an iframe).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !document.fullscreenEnabled) return;

    // Already fullscreen (e.g. navigating between episodes while FS is active)
    if (document.fullscreenElement) return;

    let entered = false;
    const tryEnter = () => {
      if (entered) return;
      entered = true;
      el.requestFullscreen().catch(() => {/* browser refused — ignore */ });
    };

    // Attempt immediately (works on some browsers / PWA contexts)
    el.requestFullscreen().catch(() => {
      // Not allowed without gesture — wait for first interaction
      el.addEventListener('pointerdown', tryEnter, { once: true });
    });

    return () => {
      el.removeEventListener('pointerdown', tryEnter);
      // Exit fullscreen when the player unmounts (e.g. user navigates away)
      if (document.fullscreenElement === el) {
        document.exitFullscreen().catch(() => {/* ignore */ });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ── Sync DOM muted state to Zustand store (for muted fallback) ────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onVolumeChange = () => {
      const store = usePlayerStore.getState();
      if (el.muted !== store.isMuted) {
        store.setMuted(el.muted);
      }
    };
    el.addEventListener('volumechange', onVolumeChange);
    return () => el.removeEventListener('volumechange', onVolumeChange);
  }, []);

  // ── Forcibly unmute on player mount & listen for first user gesture ──
  useEffect(() => {
    const store = usePlayerStore.getState();
    logger.info('[OTTPlayer] Resetting player mute preference to unmuted on mount');
    store.setMuted(false);
    if (store.volume === 0) {
      store.setVolume(1.0); // Reset volume to max if it was 0
    }

    // Set muted = false on both video elements
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
    if (adVideoRef.current) {
      adVideoRef.current.muted = false;
    }

    const handleUserGesture = () => {
      logger.info('[OTTPlayer] User gesture detected, ensuring unmuted playback');
      const currentStore = usePlayerStore.getState();

      // Force unmute DOM elements on user gesture
      if (videoRef.current) {
        videoRef.current.muted = false;
      }
      if (adVideoRef.current) {
        adVideoRef.current.muted = false;
      }
      if (adEngineRef.current) {
        adEngineRef.current.setMuted(false);
      }

      currentStore.setMuted(false);
    };

    window.addEventListener('pointerdown', handleUserGesture, { once: true });
    window.addEventListener('keydown', handleUserGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, []);

  // Resume prompt
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [hasDismissedResume, setHasDismissedResume] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  // Next episode
  const [showNextEpisode, setShowNextEpisode] = useState(false);

  // Episodes panel
  const [showEpisodesPanel, setShowEpisodesPanel] = useState(false);

  const [isAdPaused, setIsAdPaused] = useState(false);
  const [isAdMuted, setIsAdMuted] = useState(false);

  const [hasTriggeredNextEpisodeAuto, setHasTriggeredNextEpisodeAuto] = useState(false);
  const [isNextEpisodePromptDismissed, setIsNextEpisodePromptDismissed] = useState(false);

  // ── Seek-to-end guard (prevents surprise auto-play on seekbar drag) ───────
  // When the user drags the seekbar to the end, the video 'ended' event fires
  // identically to a natural playback end. This ref tracks whether the user
  // recently performed a seek. If true, auto-play is suppressed and the user
  // must click "Play Next" manually. The flag auto-clears after 3s of
  // continuous playback, so seeking mid-video and watching to the end still
  // triggers auto-play as expected.
  const SEEK_COOLDOWN_MS = 3000;
  const userRecentlySeekedRef = useRef(false);
  const seekCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // State-based flag for JSX: latched true when the next-episode overlay
  // is triggered while a seek is active. Unlike the ref (which clears after
  // 3s), this stays true for the lifetime of the overlay so the countdown
  // timer never auto-fires.
  const [nextEpisodeTriggeredBySeeking, setNextEpisodeTriggeredBySeeking] = useState(false);



  const nextEpisodeFromList = useMemo(() => {
    if (!currentEpisodeId || !seasons || seasons.length === 0) return null;
    const curIdStr = String(currentEpisodeId);

    for (let s = 0; s < seasons.length; s++) {
      const season = seasons[s];
      const episodes = season.episodes || [];
      const idx = episodes.findIndex((ep: any) => {
        const epIdStr = String(ep.asset_id ?? ep.assetId ?? "");
        return epIdStr === curIdStr;
      });
      if (idx !== -1) {
        if (idx + 1 < episodes.length) {
          return { episode: episodes[idx + 1], season };
        }
        if (s + 1 < seasons.length) {
          const nextSeason = seasons[s + 1];
          if (nextSeason.episodes && nextSeason.episodes.length > 0) {
            return { episode: nextSeason.episodes[0], season: nextSeason };
          }
        }
      }
    }
    return null;
  }, [seasons, currentEpisodeId]);

  useEffect(() => {
    setHasTriggeredNextEpisodeAuto(false);
    setIsNextEpisodePromptDismissed(false);
    setAdCuePoints(video.adCuePoints);
    // Reset seek guard on content change
    userRecentlySeekedRef.current = false;
    setNextEpisodeTriggeredBySeeking(false);
    if (seekCooldownTimerRef.current) {
      clearTimeout(seekCooldownTimerRef.current);
      seekCooldownTimerRef.current = null;
    }
  }, [video.contentId, video.adCuePoints]);

  // Auto-play next episode when countdown reaches 0 (at nextTitle.visibleEndSeconds)
  // Guarded: if the user dragged the seekbar recently, skip auto-play.
  useEffect(() => {
    if (!video.nextTitle || !nextEpisodeFromList || hasTriggeredNextEpisodeAuto || isNextEpisodePromptDismissed) return;
    if (userRecentlySeekedRef.current) return; // ← seek guard
    if (currentTime >= video.nextTitle.visibleEndSeconds - 0.5) {
      setHasTriggeredNextEpisodeAuto(true);
      if (onEpisodeSelect) {
        logger.info('[OTTPlayer] Next title visibleEnd reached, auto-playing next episode');
        onEpisodeSelect(
          nextEpisodeFromList.episode,
          nextEpisodeFromList.season,
          video.nextTitle.startAtSeconds
        );
      }
    }
  }, [currentTime, video.nextTitle, nextEpisodeFromList, hasTriggeredNextEpisodeAuto, isNextEpisodePromptDismissed, onEpisodeSelect]);

  const handleEpisodesToggle = useCallback(() => {
    setShowEpisodesPanel((v) => !v);
    showControls();
  }, [showControls]);

  const handleEpisodesPanelClose = useCallback(() => {
    setShowEpisodesPanel(false);
  }, []);

  const handleEpisodePanelSelect = useCallback(
    (episode: AssetEpisode, season: AssetSeason) => {
      setShowEpisodesPanel(false);
      onEpisodeSelect?.(episode, season);
    },
    [onEpisodeSelect]
  );

  // ── Zustand store ─────────────────────────────────────────────────────────
  const {
    volume,
    isMuted,
    speed,
    captionSize,
    captionFontSize,
    captionTextColor,
    captionBgColor,
    captionBgOpacity,
    status,
    qualities,
    activeQualityId,
    audioTracks,
    activeAudioTrackId,
    subtitleTracks,
    activeSubtitleTrackId,
    isFullscreen,
    isPip,
    error,
    adState,
    setStatus,
    setError,
    setVolume: storeSetVolume,
    setMuted,
    setSpeed: storeSetSpeed,
    setCaptionSize: storeSetCaptionSize,
    setCaptionFontSize,
    setCaptionTextColor,
    setCaptionBgColor,
    setCaptionBgOpacity,
    setQualities,
    setActiveQuality,
    setAudioTracks,
    setActiveAudioTrack,
    setSubtitleTracks,
    setActiveSubtitleTrack,
    setFullscreen,
    setPip,
    setAdState,
    resetRuntimeState,
  } = usePlayerStore();

  // Auto-play next episode when video ends naturally
  // Guarded: seekbar-drag-to-end shows the card but does NOT auto-navigate.
  useEffect(() => {
    if (status === 'ended' && nextEpisodeFromList && !hasTriggeredNextEpisodeAuto) {
      if (userRecentlySeekedRef.current) {
        logger.info('[OTTPlayer] Video ended via seek — suppressing auto-play (user must click Play Next)');
        return; // ← seek guard: card is visible but auto-play is blocked
      }
      setHasTriggeredNextEpisodeAuto(true);
      if (onEpisodeSelect) {
        logger.info('[OTTPlayer] Video ended naturally, auto-playing next episode');
        onEpisodeSelect(
          nextEpisodeFromList.episode,
          nextEpisodeFromList.season
        );
      }
    }
  }, [status, nextEpisodeFromList, hasTriggeredNextEpisodeAuto, onEpisodeSelect]);

  // ── Eager cleanup on contentId change ─────────────────────────────────────
  // This effect runs FIRST when video.contentId changes. It immediately stops
  // all audio/video playback before the new engine init effect fires. Without
  // this, the old Shaka player keeps streaming audio through the <video>
  // element during the fetch window (1-5s) when switching episodes via
  // router.push(). This is the PRIMARY fix for the dual audio bug.
  const prevContentIdRef = useRef<string | number | null>(null);
  useEffect(() => {
    // Skip on initial mount — only run when contentId actually changes
    if (prevContentIdRef.current === null) {
      prevContentIdRef.current = video.contentId;
      return;
    }
    if (prevContentIdRef.current === video.contentId) return;
    prevContentIdRef.current = video.contentId;

    logger.info('[OTTPlayer] contentId changed — eager cleanup', {
      from: prevContentIdRef.current,
      to: video.contentId,
    });

    // 1. Destroy engine (this pauses + detaches src on the <video> element)
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
      setActiveEngine(null);
    }

    // 2. Destroy ad engine + pause ad <video>
    if (adEngineRef.current) {
      adEngineRef.current.destroy();
      adEngineRef.current = null;
    }
    const adVideoEl = adVideoRef.current;
    if (adVideoEl) {
      adVideoEl.pause();
      adVideoEl.removeAttribute('src');
      adVideoEl.load();
    }

    // 3. Destroy PiP manager
    if (pipManagerRef.current) {
      pipManagerRef.current.destroy();
      pipManagerRef.current = null;
    }

    // 4. Reset UI state for the incoming video
    pendingAdRequestRef.current = false;
    setShowResumePrompt(false);
    setHasDismissedResume(false);
    setShowNextEpisode(false);
    setShowEpisodesPanel(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setFeedbackAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.contentId]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let isCancelled = false;

    const engine = new PlayerEngine();
    const pipMgr = new PipManager(engine.eventBus);
    pipMgr.attach(videoEl);

    engineRef.current = engine;
    setActiveEngine(engine);
    pipManagerRef.current = pipMgr;

    resetRuntimeState();
    setError(null);
    setStatus('loading');

    // Subscribe to event bus for UI updates
    const unsubs: Array<() => void> = [];

    unsubs.push(
      engine.eventBus.on('PLAY', () => setIsPlaying(true))
    );
    unsubs.push(
      engine.eventBus.on('PAUSE', () => setIsPlaying(false))
    );
    unsubs.push(
      engine.eventBus.on('BUFFER_START', () => setStatus('buffering'))
    );
    unsubs.push(
      engine.eventBus.on('BUFFER_END', () =>
        setStatus(isPlaying ? 'playing' : 'paused')
      )
    );
    unsubs.push(
      engine.eventBus.on('ENDED', () => {
        setIsPlaying(false);
        setStatus('ended');
      })
    );
    unsubs.push(
      engine.eventBus.on('ERROR', ({ error: err }) => {
        setError(err);
        setStatus('error');
      })
    );
    unsubs.push(
      engine.eventBus.on('TIME_UPDATE', ({ currentTime: ct, duration: dur, buffered: buf }) => {
        setCurrentTime(ct);
        setDuration(dur);
        setBuffered(buf);
      })
    );
    unsubs.push(
      engine.eventBus.on('CONTENT_ENDED', ({ durationSeconds, watchDurationSeconds }) => {
        if (PLAYER_FEATURE_FLAGS.ads && hasAds && adEngineRef.current) {
          logger.info('[OTTPlayer] Content ended, triggering post-rolls');
          adEngineRef.current.contentComplete();
        } else {
          engine.eventBus.emit('ENDED', {
            durationSeconds,
            watchDurationSeconds,
          });
        }
      })
    );
    unsubs.push(
      engine.eventBus.on('AD_STARTED', ({ adId, adType, title, description, advertiserName, adPosition, totalAds, clickThroughUrl }) => {
        setIsAdPaused(false);
        const storeMuted = usePlayerStore.getState().isMuted;
        const storeVol = usePlayerStore.getState().volume;
        if (adVideoRef.current) {
          adVideoRef.current.muted = storeMuted;
          adVideoRef.current.volume = storeVol;
        }
        adEngineRef.current?.setMuted?.(storeMuted);
        adEngineRef.current?.setVolume?.(storeVol);
        setIsAdMuted(storeMuted);
        setAdState({
          isPlaying: true,
          adId,
          adType,
          isLoading: false,
          title,
          description,
          advertiserName,
          adPosition,
          totalAds,
          clickThroughUrl,
        });
      })
    );
    unsubs.push(
      engine.eventBus.on('AD_COMPLETED', ({ adId }) => {
        if (adId === '') {
          setAdState({ isPlaying: false, adId: null, adType: null, title: null, description: null, advertiserName: null, adPosition: 1, totalAds: 1, clickThroughUrl: null });
        }
      })
    );
    unsubs.push(
      engine.eventBus.on('AD_SKIPPED', () => {
        setAdState({ isPlaying: false, adId: null, adType: null, title: null, description: null, advertiserName: null, adPosition: 1, totalAds: 1, clickThroughUrl: null });
      })
    );
    unsubs.push(
      engine.eventBus.on('AD_PROGRESS', ({ adId, remainingSeconds, totalSeconds, isSkippable, skipOffsetSeconds, adPosition, totalAds }) => {
        const latestClickUrl = adEngineRef.current?.getClickThroughUrl?.() || null;
        setAdState({
          isPlaying: true,
          adId,
          remainingSeconds,
          totalSeconds,
          isSkippable,
          skipOffsetSeconds,
          isLoading: false,
          adPosition,
          totalAds,
          ...(latestClickUrl ? { clickThroughUrl: latestClickUrl } : {}),
        });
      })
    );
    unsubs.push(
      engine.eventBus.on('ALL_ADS_COMPLETED', () => {
        setAdState({ isPlaying: false, adId: null, adType: null, title: null, description: null, advertiserName: null, adPosition: 1, totalAds: 1, clickThroughUrl: null });
        if (videoRef.current?.ended) {
          const dur = engine.getDuration();
          const watchDur = engine.getSessionManager().getWatchDurationSeconds();
          engine.eventBus.emit('ENDED', {
            durationSeconds: dur,
            watchDurationSeconds: watchDur,
          });
        }
      })
    );
    unsubs.push(
      engine.eventBus.on('AD_ERROR', ({ errorMessage }) => {
        setAdState({
          isPlaying: false,
          hasError: true,
          errorMessage,
          isLoading: false,
        });
        if (videoRef.current?.ended) {
          const dur = engine.getDuration();
          const watchDur = engine.getSessionManager().getWatchDurationSeconds();
          engine.eventBus.emit('ENDED', {
            durationSeconds: dur,
            watchDurationSeconds: watchDur,
          });
        }
      })
    );
    unsubs.push(
      engine.eventBus.on('PIP_ENTER', () => setPip(true))
    );
    unsubs.push(
      engine.eventBus.on('PIP_EXIT', () => setPip(false))
    );
    unsubs.push(
      engine.eventBus.on('AD_CUE_POINTS_CHANGED', ({ cuePoints }) => {
        logger.info('[OTTPlayer] Ad cue points changed', { cuePoints });
        setAdCuePoints(cuePoints);
      })
    );
    // Load the content
    engine
      .initialize(videoEl, video, {
        videoContainer: containerRef.current,
        captionSize,
        startTime: video.bypassResumePrompt && video.savedPosition ? video.savedPosition : undefined,
      })
      .then(() => {
        if (isCancelled || engineRef.current !== engine) return;

        setError(null);
        setStatus('ready');

        // Populate track selectors
        setQualities(engine.getQualities());
        setAudioTracks(engine.getAudioTracks());
        setSubtitleTracks(engine.getSubtitleTracks());

        // Apply saved preferences
        const currentMuted = usePlayerStore.getState().isMuted;
        const currentVolume = usePlayerStore.getState().volume;
        engine.setVolume(currentMuted ? 0 : currentVolume);
        engine.setPlaybackSpeed(usePlayerStore.getState().speed);
        engine.setCaptionSize(captionSize);

        // Helper function to manage playback flow after initialization (and ads) are ready
        const startPlaybackFlow = () => {
          if (isCancelled || engineRef.current !== engine) return;

          if (video.bypassResumePrompt && video.savedPosition && video.savedPosition > 0) {
            logger.info('[OTTPlayer] Bypassing resume prompt, seeking to position', { pos: video.savedPosition });
            engine.seek(video.savedPosition);
            if (playedAdCuesRef.current && video.adCuePoints) {
              video.adCuePoints.forEach((cue) => {
                if (cue <= video.savedPosition!) {
                  playedAdCuesRef.current.add(cue);
                }
              });
            }
            setHasDismissedResume(true);

            // Check if ads should be fired instead of directly playing
            let adFired = false;
            if (pendingAdRequestRef.current && adEngineRef.current) {
              pendingAdRequestRef.current = false;
              try {
                videoRef.current?.pause();
                setAdState({ isLoading: true });
                adEngineRef.current.requestAds('pre_roll');
                logger.info('[OTTPlayer] Ad request fired from autoplay (bypass resume)');
                adFired = true;
              } catch (err) {
                logger.error('[OTTPlayer] Failed to request ads from autoplay (bypass resume)', err);
              }
            }
            if (!adFired) {
              engine.play();
            }
            return;
          }

          // Show resume prompt if applicable, otherwise autoplay like a premium OTT player.
          let willShowResume = false;
          const contentDuration = video.durationSeconds || engine.getDuration() || 0;
          if (
            PLAYER_FEATURE_FLAGS.resumeWatching &&
            !hasDismissedResume &&
            video.savedPosition !== null &&
            video.savedPosition > RESUME_MIN_POSITION_SECONDS &&
            contentDuration > 0 &&
            (video.savedPosition / contentDuration) * 100 < RESUME_MAX_PERCENTAGE
          ) {
            willShowResume = true;
            setShowResumePrompt(true);
          }

          if (!willShowResume) {
            logger.info('[OTTPlayer] Triggering autoplay');
            let adFired = false;
            if (pendingAdRequestRef.current && adEngineRef.current) {
              pendingAdRequestRef.current = false;
              try {
                videoRef.current?.pause();
                setAdState({ isLoading: true });
                adEngineRef.current.requestAds('pre_roll');
                logger.info('[OTTPlayer] Ad request fired from autoplay');
                adFired = true;
              } catch (err) {
                logger.error('[OTTPlayer] Failed to request ads from autoplay', err);
              }
            }
            if (!adFired) {
              engine.play();
            }
          }
        };

        // Initialize ads
        if (PLAYER_FEATURE_FLAGS.ads && hasAds && adContainerRef.current && adVideoRef.current) {
          const adEngine = new ImaAdsEngine();
          adEngineRef.current = adEngine;
          setAdState({ isLoading: false });

          adEngine
            .initialize({
              adTagUrl: effectiveAdTagUrl ?? '',
              vmapUrl: effectiveVmapUrl ?? undefined,
              vmapXml: effectiveVmapXml ?? undefined,
              videoElement: adVideoRef.current,
              contentVideoElement: videoEl,
              adContainer: adContainerRef.current,
              eventBus: engine.eventBus,
              cuePoints: video.adCuePoints,
            })
            .then(() => {
              pendingAdRequestRef.current = true;
              logger.info('[OTTPlayer] Ad engine ready — starting playback flow');
              startPlaybackFlow();
            })
            .catch((err) => {
              logger.warn('[OTTPlayer] Ad init failed — continuing without ads', { err });
              setAdState({ isLoading: false, hasError: true });
              startPlaybackFlow();
            });
        } else {
          startPlaybackFlow();
        }
        // Player is 'ready' — user sees the paused frame and play button
      })
      .catch((err) => {
        if (isCancelled || engineRef.current !== engine) {
          logger.info('[OTTPlayer] Suppressing init error callback for stale or unmounted engine instance');
          return;
        }
        logger.error('[OTTPlayer] Engine init failed', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        setStatus('error');
        setError({
          code: 'INIT_FAILED',
          message: 'Failed to initialize player. Please try again.',
          adapter: 'unknown',
          isRecoverable: true,
          originalError: err instanceof Error ? err : null,
        });
      });

    // Safety-net cleanup — the eager cleanup effect above handles the critical
    // path on contentId change. This cleanup only fires on true unmount.
    return () => {
      isCancelled = true;
      for (const unsub of unsubs) unsub();
      // Only destroy if still the active engine (eager cleanup may have
      // already destroyed these refs and set them to null)
      if (engineRef.current === engine) {
        void engine.destroy();
        engineRef.current = null;
      }
      if (pipManagerRef.current === pipMgr) {
        pipMgr.destroy();
        pipManagerRef.current = null;
      }
      if (adEngineRef.current) {
        adEngineRef.current.destroy();
        adEngineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.contentId]);

  // ── Resize IMA when container size changes (fullscreen, window resize) ────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const adEngine = adEngineRef.current;
      if (!adEngine) return;
      const { clientWidth: w, clientHeight: h } = container;
      if (w > 0 && h > 0) adEngine.resize(w, h);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!PLAYER_FEATURE_FLAGS.thumbnailPreview) return;
    if (!video.thumbnailVttUrl) return;

    fetchAndParseVttThumbnails(video.thumbnailVttUrl).then(setThumbnailCues);
  }, [video.thumbnailVttUrl]);

  // ── Next episode detection ─────────────────────────────────────────────────

  useEffect(() => {
    if (!PLAYER_FEATURE_FLAGS.nextEpisode) return;
    if (!video.seriesInfo?.nextEpisode) return;
    if (duration <= 0) return;

    const pct = (currentTime / duration) * 100;
    if (pct >= NEXT_EPISODE_TRIGGER_PERCENTAGE && !showNextEpisode) {
      // Latch: if triggered while a seek is active, suppress auto-play
      // for the entire lifetime of this overlay instance
      if (userRecentlySeekedRef.current) {
        setNextEpisodeTriggeredBySeeking(true);
      }
      setShowNextEpisode(true);
    }
  }, [currentTime, duration, video.seriesInfo, showNextEpisode]);

  // ── Resume prompt (after duration is known) ────────────────────────────────

  useEffect(() => {
    if (!PLAYER_FEATURE_FLAGS.resumeWatching) return;
    if (hasDismissedResume) return;
    if (status !== 'ready') return;
    if (video.savedPosition === null) return;

    if (
      duration > 0 &&
      video.savedPosition > RESUME_MIN_POSITION_SECONDS &&
      (video.savedPosition / duration) * 100 < RESUME_MAX_PERCENTAGE
    ) {
      setShowResumePrompt(true);
    }
  }, [duration, video.savedPosition, hasDismissedResume, status]);

  // ── Show controls when ad break ends ──────────────────────────────────────
  // adState.isPlaying transitions false → controls mount and need to be visible.
  useEffect(() => {
    if (!adState.isPlaying) {
      showControls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adState.isPlaying]);

  // Show controls when entering/exiting fullscreen to keep them visible
  useEffect(() => {
    showControls();
  }, [isFullscreen, showControls]);

  // ── Analytics ──────────────────────────────────────────────────────────────

  usePlayerAnalytics({
    engine: engineRef.current,
    video,
    isEnabled: PLAYER_FEATURE_FLAGS.analytics,
  });

  // ── Watch progress ─────────────────────────────────────────────────────────

  useWatchProgress({
    contentId: video.contentId,
    engine: engineRef.current,
    isEnabled: PLAYER_FEATURE_FLAGS.resumeWatching,
  });

  // ── Socket heartbeat ───────────────────────────────────────────────────────

  const { emitWatchEnd } = usePlayerHeartbeat({
    engine: activeEngine ?? engineRef.current,
    playerId: video.playerId,
    assetId: video.contentId,
    parentId: video.parentId,
    assetType: video.assetType,
    isSubscribed: isSubscribed,
    isEnabled: !!video.playerId,
  });

  const handleBack = useCallback(() => {
    logger.info('[OTTPlayer] handleBack called — emitting watch-end');
    emitWatchEnd();
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router, emitWatchEnd]);

  // ── Mid-roll ad polling ────────────────────────────────────────────────────
  // Only used for manual VAST (adTagUrl). When VMAP is active, IMA handles
  // mid-rolls automatically — no polling needed.

  useEffect(() => {
    if (!PLAYER_FEATURE_FLAGS.ads) return;
    if (effectiveVmapUrl) return; // VMAP: IMA fires mid-rolls on its own
    if (!effectiveAdTagUrl || video.adCuePoints.length === 0) return;
    if (!adEngineRef.current) return;

    // Reset played cues when video changes
    const initialPosition = (video.bypassResumePrompt && video.savedPosition) ? video.savedPosition : 0;
    playedAdCuesRef.current = new Set(
      video.adCuePoints.filter(cue => cue <= initialPosition)
    );

    const lastTimeRef = { current: 0 };

    adPollIntervalRef.current = setInterval(() => {
      const adEngine = adEngineRef.current;
      if (!adEngine || !engineRef.current) return;

      // Don't trigger while an ad is already playing or if content is paused
      if (adEngine.isAdPlaying()) return;
      if (videoRef.current?.paused) return;

      const ct = engineRef.current.getCurrentTime();
      const delta = ct - lastTimeRef.current;

      // Seek-over detection: user jumped forward > 3s (not normal playback drift)
      if (delta > 3) {
        const skippedCues = video.adCuePoints.filter(
          (cue) =>
            cue > 0 &&
            !playedAdCuesRef.current.has(cue) &&
            lastTimeRef.current < cue &&
            ct > cue
        );
        // Queue up to 2 skipped cues
        skippedCues.slice(0, 2).forEach((cue) => {
          playedAdCuesRef.current.add(cue);
          if (adEngine) {
            logger.info(`[OTTPlayer] Seek crossed mid-roll cue point (${cue}), firing ad...`);
            setAdState({ isLoading: true });
            adEngine.requestAds('mid_roll');
          }
        });
      }

      // Normal mid-roll check (cues strictly > 0)
      const dueCue = video.adCuePoints.find(
        (cue) => cue > 0 && !playedAdCuesRef.current.has(cue) && ct >= cue
      );
      if (dueCue !== undefined) {
        playedAdCuesRef.current.add(dueCue);
        if (adEngine) {
          logger.info(`[OTTPlayer] Mid-roll triggered at ${dueCue}`);
          setAdState({ isLoading: true });
          adEngine.requestAds('mid_roll');
        }
      }

      lastTimeRef.current = ct;
    }, AD_POLL_INTERVAL_MS);

    return () => {
      if (adPollIntervalRef.current) {
        clearInterval(adPollIntervalRef.current);
        adPollIntervalRef.current = null;
      }
    };
    // Re-run when ad engine or video content changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.contentId, effectiveAdTagUrl]);

  // ── Controls ───────────────────────────────────────────────────────────────

  // ── Control handlers ───────────────────────────────────────────────────────
  
  useEffect(() => {
    if (controlsVisible && focusToControlsRef.current) {
      const timer = setTimeout(() => {
        setFocus('play-pause-btn');
      }, 100);
      focusToControlsRef.current = false;
      return () => clearTimeout(timer);
    }
  }, [controlsVisible]);

  // Automatically focus player when ready or mounted
  useEffect(() => {
    setFocus('ott-player-main');
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    storeSetVolume(v);
    engineRef.current?.setVolume(v);
    if (adEngineRef.current) {
      adEngineRef.current.setVolume(v);
    }
  }, [storeSetVolume]);

  const handleSpeedChange = useCallback((s: PlaybackSpeed) => {
    storeSetSpeed(s);
    engineRef.current?.setPlaybackSpeed(s);
  }, [storeSetSpeed]);

  const handleQualityChange = useCallback((id: number) => {
    setActiveQuality(id);
    engineRef.current?.setQuality(id);
  }, [setActiveQuality]);

  const handleAudioChange = useCallback((id: number) => {
    setActiveAudioTrack(id);
    engineRef.current?.setAudioTrack(id);
  }, [setActiveAudioTrack]);

  const handleSubtitleChange = useCallback((id: number) => {
    setActiveSubtitleTrack(id);
    engineRef.current?.setSubtitleTrack(id);
  }, [setActiveSubtitleTrack]);

  const handleCaptionSizeChange = useCallback((size: CaptionSize) => {
    storeSetCaptionSize(size);
    engineRef.current?.setCaptionSize(size);
  }, [storeSetCaptionSize]);

  const handleSeek = useCallback((seconds: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const dur = engine.getDuration();
    const clamped =
      dur > 0 ? Math.max(0, Math.min(seconds, dur)) : Math.max(0, seconds);

    // ── Seek-to-end guard ───────────────────────────────────────────────
    // Mark that user just performed a seek. Clears after 3s of continuous
    // playback so a mid-video seek followed by watching to the end still
    // triggers auto-play as expected.
    userRecentlySeekedRef.current = true;
    if (seekCooldownTimerRef.current) {
      clearTimeout(seekCooldownTimerRef.current);
    }
    seekCooldownTimerRef.current = setTimeout(() => {
      userRecentlySeekedRef.current = false;
      seekCooldownTimerRef.current = null;
    }, SEEK_COOLDOWN_MS);

    engine.seek(clamped);
  }, []);

  const handleSkipAd = useCallback(() => {
    adEngineRef.current?.skip();
  }, []);

  const handleAdClick = useCallback(() => {
    logger.info('[OTTPlayer] Ad clicked — handling ad clickthrough navigation');

    let clickUrl = adState.clickThroughUrl || adEngineRef.current?.getClickThroughUrl?.() || null;
    if (clickUrl && !isLandingPageUrl(clickUrl)) {
      clickUrl = null;
    }

    // 1. Emit AD_CLICKED event for analytics and eventBus listeners
    if (engineRef.current) {
      engineRef.current.eventBus.emit('AD_CLICKED', {
        adId: adState.adId || '',
        clickThroughUrl: clickUrl || undefined,
      });
    }

    // 2. Open clickthrough URL in target=_blank (with popup blocker fallback)
    if (clickUrl) {
      logger.info('[OTTPlayer] Opening ad clickThroughUrl in new window', { url: clickUrl });
      try {
        const win = window.open(clickUrl, '_blank', 'noopener,noreferrer');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          const link = document.createElement('a');
          link.href = clickUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        window.open(clickUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      logger.info('[OTTPlayer] No advertiser landing URL found; relying on IMA native overlay click handling');
    }
  }, [adState.adId, adState.clickThroughUrl]);

  const handleAdPlayPause = useCallback(() => {
    if (!adEngineRef.current) return;
    if (isAdPaused) {
      adEngineRef.current.resume();
      setIsAdPaused(false);
    } else {
      adEngineRef.current.pause();
      setIsAdPaused(true);
    }
  }, [isAdPaused]);

  const handleAdMuteToggle = useCallback(() => {
    const newMuted = !isAdMuted;
    setIsAdMuted(newMuted);
    if (adVideoRef.current) {
      adVideoRef.current.muted = newMuted;
    }
    if (adEngineRef.current) {
      adEngineRef.current.setMuted(newMuted);
    }
    setMuted(newMuted);
  }, [isAdMuted, setMuted]);

  // ── Fire pending ad request on first user gesture ─────────────────────────
  // IMA requires adDisplayContainer.initialize() to be called from a user
  // gesture. We deferred requestAds() to here — the first play click.
  // Returns true if an ad request was fired (caller should NOT start content).
  const fireAdIfPending = useCallback((): boolean => {
    if (!pendingAdRequestRef.current || !adEngineRef.current) return false;
    pendingAdRequestRef.current = false;

    try {
      // Pause content immediately — IMA will resume it via CONTENT_RESUME_REQUESTED
      // after the pre-roll completes. Without this, content plays for 1-2s while
      // IMA fetches and loads the ad creative.
      videoRef.current?.pause();
      setAdState({ isLoading: true });
      adEngineRef.current.requestAds('pre_roll');
      logger.info('[OTTPlayer] Ad request fired from user gesture');
      return true;
    } catch (err) {
      logger.error('[OTTPlayer] Failed to request ads from user gesture — bypassing ads', { err });
      videoRef.current?.play().catch(() => { });
      return false;
    }
  }, []);

  const handleResume = useCallback(() => {
    setShowResumePrompt(false);
    setHasDismissedResume(true);
    const engine = engineRef.current;
    if (!engine) return;

    if (video.savedPosition !== null) {
      engine.seek(video.savedPosition);
      if (playedAdCuesRef.current && video.adCuePoints) {
        video.adCuePoints.forEach((cue) => {
          if (cue <= video.savedPosition!) {
            playedAdCuesRef.current.add(cue);
          }
        });
      }
      engine.eventBus.emit('RESUME_PLAYBACK', {
        resumePositionSeconds: video.savedPosition,
      });
    }

    // If ads are pending, fire them instead of starting content directly.
    // IMA will resume content after the pre-roll via CONTENT_RESUME_REQUESTED.
    const adFired = fireAdIfPending();
    if (!adFired) {
      engine.play();
    }
  }, [video.savedPosition, fireAdIfPending]);

  const handleStartOver = useCallback(() => {
    setShowResumePrompt(false);
    setHasDismissedResume(true);
    const engine = engineRef.current;
    if (!engine) return;

    engine.seek(0);

    // If ads are pending, fire them instead of starting content directly.
    // IMA will resume content after the pre-roll via CONTENT_RESUME_REQUESTED.
    const adFired = fireAdIfPending();
    if (!adFired) {
      engine.play();
    }
  }, [fireAdIfPending]);

  const handleNextEpisodePlay = useCallback(() => {
    let nextId = '';
    if (video.seriesInfo?.nextEpisode) {
      nextId = video.seriesInfo.nextEpisode.contentId;
    } else if (nextEpisodeFromList) {
      nextId = String(nextEpisodeFromList.episode.asset_id);
    }

    if (!nextId) return;

    if (nextEpisodeFromList && seasons) {
      const { episode, season } = nextEpisodeFromList;
      const seriesTitle = video.seriesInfo?.seriesTitle || video.title;
      const seriesId = video.parentId || video.contentId;

      // Carry over subscription/purchase status from current episode to prevent ads on next episode
      let isSvodSubscribed = false;
      let isTvodPurchased = false;
      let assetCategoryCode = video.assetCategory === 'tvod' ? 3 : video.assetCategory === 'svod' ? 2 : 1;
      let assetCategory = video.assetCategory || 'avod';

      try {
        const currentMeta = sessionStorage.getItem(`play_metadata_${video.contentId}`);
        if (currentMeta) {
          const parsedMeta = JSON.parse(currentMeta);
          if (parsedMeta.isSvodSubscribed !== undefined) isSvodSubscribed = parsedMeta.isSvodSubscribed;
          if (parsedMeta.isTvodPurchased !== undefined) isTvodPurchased = parsedMeta.isTvodPurchased;
          if (parsedMeta.assetCategoryCode !== undefined) assetCategoryCode = parsedMeta.assetCategoryCode;
          if (parsedMeta.assetCategory !== undefined) assetCategory = parsedMeta.assetCategory;
        }
      } catch (e) {
        // ignore parse error
      }

      sessionStorage.setItem(
        `play_metadata_${nextId}`,
        JSON.stringify({
          title: episode.asset_title,
          description: episode.asset_description,
          seriesInfo: {
            seriesId: String(seriesId),
            seriesTitle: seriesTitle,
            seasonNumber: Number(season.season_number ?? 1),
            episodeNumber: Number(episode.episode_number ?? 1),
            nextEpisode: null,
          },
          certification: video.certification ?? null,
          classifications: video.classifications ?? null,
          isSvodSubscribed,
          isTvodPurchased,
          assetCategoryCode,
          assetCategory,
          assetTypeName: 'episode',
        })
      );
    }

    engineRef.current?.eventBus.emit('NEXT_EPISODE', {
      triggeredBy: 'auto',
      nextContentId: nextId,
    });
    router.replace(ROUTES.WATCH(nextId));
  }, [router, video, nextEpisodeFromList, seasons]);

  const handleNextEpisodeCancel = useCallback(() => {
    setShowNextEpisode(false);
    setNextEpisodeTriggeredBySeeking(false);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setStatus('loading');
    const videoEl = videoRef.current;
    if (!videoEl || !engineRef.current) return;
    void engineRef.current.initialize(videoEl, video, {
      videoContainer: containerRef.current,
      captionSize,
      startTime: video.bypassResumePrompt && video.savedPosition ? video.savedPosition : undefined,
    });
  }, [setError, setStatus, video, captionSize]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const { togglePlay, seekForward, seekBackward, toggleMute, toggleFullscreen, togglePip, handleTouchEnd } =
    usePlayerControls({
      engine: engineRef.current,
      pipManager: pipManagerRef.current,
      containerRef,
      isEnabled: status !== 'idle' && status !== 'error',
      onActivity: showControls,
      isPlaying,
      onActionFeedback: (action, value) => triggerFeedback(action as FeedbackAction, value),
      onNextEpisode: nextEpisodeFromList ? handleNextEpisodePlay : undefined,
      subtitleTracks,
      activeSubtitleTrackId,
      onSubtitleChange: handleSubtitleChange,
      speed,
      onSpeedChange: handleSpeedChange,
      isAdPlaying: adState.isPlaying,
      onAdPlayPause: handleAdPlayPause,
    });

  // ── Wrapped play/pause that also fires pending ads on first press ─────────
  const handlePlayPause = useCallback(() => {
    // If an ad request is pending, fire it and DO NOT start content —
    // IMA will call CONTENT_RESUME_REQUESTED when the pre-roll finishes.
    const adFired = fireAdIfPending();
    if (!adFired) {
      togglePlay();
    }
  }, [fireAdIfPending, togglePlay]);

  const { ref: playerFocusRef, focused: isPlayerFocused } = useFocusable({
    focusKey: 'ott-player-main',
    onEnterPress: () => {
      if (!isPlayerFocusedRef.current) return true;

      handlePlayPause();
      
      if (controlsVisible) {
        setFocus('play-pause-btn');
      } else {
        showControls();
        focusToControlsRef.current = true;
      }
      return true;
    },
    onArrowPress: (direction) => {
      if (!isPlayerFocusedRef.current) {
        return true;
      }

      if (direction === 'up' || direction === 'down') {
        if (controlsVisible) {
          setFocus('play-pause-btn');
        } else {
          showControls();
          focusToControlsRef.current = true;
        }
      }
      return true;
    }
  });

  useEffect(() => {
    isPlayerFocusedRef.current = isPlayerFocused;
    if (!isPlayerFocused) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
    } else if (controlsVisible) {
      showControls();
    }
  }, [isPlayerFocused, controlsVisible, showControls]);

  useEffect(() => {
    setHasStartedPlaying(false);
    setShowCertificate(false);
  }, [video.contentId]);

  useEffect(() => {
    const hasCert = !!video.certification;
    const hasClassifications = !!(video.classifications && video.classifications.length > 0);
    if (isPlaying && !hasStartedPlaying && (hasCert || hasClassifications)) {
      setHasStartedPlaying(true);
      setShowCertificate(true);
    }
  }, [isPlaying, hasStartedPlaying, video.certification, video.classifications]);

  useEffect(() => {
    if (!showCertificate) return;

    const timer = setTimeout(() => {
      setShowCertificate(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [showCertificate]);

  const contextValue = useMemo(
    () => ({
      videoRef,
      engine: engineRef.current,
      video,
      flags: PLAYER_FEATURE_FLAGS,
    }),
    // engineRef.current changes on effect — we pass null initially but
    // child components read via context only after engine is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [video.contentId]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  // ── Click-to-pause (OTT style — single click on the video area toggles play) ─
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Guard against synthetic/untrusted dispatched events to prevent recursion
      if (!e.isTrusted) return;

      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="slider"]') || target.closest('input')) return;

      // If an ad is currently playing, any click on the ad video area triggers ad navigation
      if (adState.isPlaying) {
        handleAdClick();
        showControls();
        return;
      }

      // Stop clicks in the bottom region (control bar area) from toggling play/pause
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect && e.clientY >= rect.bottom - 110) {
          showControls();
          return;
        }
      }

      if (!controlsVisible) {
        showControls();
        return;
      }
      // Fire pending ad on first interaction (user gesture required by browsers)
      // If ad fired, don't toggle play — IMA handles content start after pre-roll.
      const adFired = fireAdIfPending();
      if (!adFired) {
        togglePlay();
      }
      showControls();
    },
    [controlsVisible, showControls, togglePlay, fireAdIfPending, adState.isPlaying, handleAdClick]
  );

  const skipIntroProgressPercent = useMemo(() => {
    if (!video.skipIntro) return 0;
    const totalWindow = video.skipIntro.visibleEndSeconds - video.skipIntro.visibleAtSeconds;
    if (totalWindow <= 0) return 0;
    const elapsed = currentTime - video.skipIntro.visibleAtSeconds;
    const progress = (elapsed / totalWindow) * 100;
    return Math.max(0, Math.min(100, progress));
  }, [video.skipIntro, currentTime]);

  const skipRecapProgressPercent = useMemo(() => {
    if (!video.skipRecap) return 0;
    const totalWindow = video.skipRecap.visibleEndSeconds - video.skipRecap.visibleAtSeconds;
    if (totalWindow <= 0) return 0;
    const elapsed = currentTime - video.skipRecap.visibleAtSeconds;
    const progress = (elapsed / totalWindow) * 100;
    return Math.max(0, Math.min(100, progress));
  }, [video.skipRecap, currentTime]);

  const captionStyles = {
    '--caption-font-size': `${captionFontSize}px`,
    '--caption-text-color': captionTextColor,
    '--caption-bg-color': getRgbaColor(captionBgColor, captionBgOpacity),
  } as React.CSSProperties;

  return (
    <PlayerContextProvider value={contextValue}>
      <div
        ref={(el) => {
          containerRef.current = el;
          if (typeof (playerFocusRef as any) === 'function') {
            (playerFocusRef as any)(el);
          } else if (playerFocusRef) {
            (playerFocusRef as any).current = el;
          }
        }}
        className={`relative w-full bg-black select-none overflow-hidden transition-shadow ${isPlayerFocused ? "ring-2 ring-white/50" : ""}`}
        style={{
          aspectRatio: isFullscreen ? 'auto' : '16 / 9',
          width: isFullscreen ? '100vw' : '100%',
          height: isFullscreen ? '100vh' : 'auto',
          maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 30px)',
          maxWidth: isFullscreen ? '100vw' : '100%',
          cursor: controlsVisible ? 'default' : 'none',
          ...captionStyles,
        }}
        data-caption-size={captionSize}
        data-controls-visible={controlsVisible}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
        onTouchEnd={handleTouchEnd}
        onClick={handleContainerClick}
        data-testid="ott-player"
      >
        {/* Video element */}
        <VideoElement
          ref={videoRef}
          className="ott-player-video absolute inset-0 w-full h-full object-contain"
        />

        {/* IMA ad container — sibling of content video, NEVER a child.
            Always laid out (never display:none) so IMA can measure dimensions.
            pointer-events only active when an ad is actually playing so that
            normal player controls remain clickable at all other times.
            visibility:hidden hides it visually while keeping layout intact. */}
        <div
          ref={adContainerRef}
          className="absolute inset-0 z-30"
          style={{
            pointerEvents: adState.isPlaying ? 'auto' : 'none',
            visibility: adState.isPlaying ? 'visible' : 'hidden',
          }}
        >
          {/* Dedicated ad <video> — IMA renders creatives here, never into
              Shaka's content video. Two-video pattern for Shaka + IMA.
              Must always have layout dimensions — use visibility not display. */}
          <video
            ref={adVideoRef}
            className="absolute inset-0 w-full h-full"
            playsInline
          />

          {/* Ad overlay UI lives INSIDE the ad container so it renders above
              IMA's injected iframe in the same stacking context (z-40 > iframe).
              If placed outside, IMA's iframe intercepts pointer events on the
              skip button even though AdOverlay has a higher z-index. */}
          <AdOverlay
            adState={adState}
            onSkip={handleSkipAd}
            isAdPaused={isAdPaused}
            isAdMuted={isAdMuted}
            onPlayPause={handleAdPlayPause}
            onMuteToggle={handleAdMuteToggle}
            onFullscreenToggle={toggleFullscreen}
            onBack={handleBack}
            onGoAdsFree={onGoAdsFree}
            isFullscreen={isFullscreen}
            onAdClick={handleAdClick}
          />
        </div>

        {/* Playback Certificate Badge (Top-Left overlay) */}
        {showCertificate && (video.certification || (video.classifications && video.classifications.length > 0)) && !error && (
          <div className="absolute top-20 left-6 z-30 flex items-stretch select-none pointer-events-none animate-fadeIn drop-shadow-md">
            {/* Left indicator line (Orange) */}
            <div className="w-[3px] bg-theme_13_samecolour rounded-full" />
            {/* Text Container */}
            <div className="ml-3 flex flex-col justify-center py-0.5">
              {video.certification && (
                <span className="text-sm sm:text-base font-bold text-white tracking-wide drop-shadow">
                  Rated {video.certification}
                </span>
              )}
              {video.classifications && video.classifications.length > 0 && (
                <span className="text-xs sm:text-sm font-medium text-white/90 mt-0.5 max-w-sm drop-shadow">
                  {video.classifications.join(', ')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {(status === 'loading' || status === 'buffering' || adState.isLoading || (adState.hasError && status === 'ready')) && !error && (
          <LoadingScreen
            message={status === 'buffering' ? 'Buffering...' : 'Loading...'}
            isBuffering={status === 'buffering'}
          />
        )}

        {/* Error */}
        {status === 'error' && error && <ErrorScreen error={error} onRetry={handleRetry} />}

        {/* Resume prompt */}
        {showResumePrompt && video.savedPosition !== null && !error && (
          <ResumePrompt
            positionSeconds={video.savedPosition}
            onResume={handleResume}
            onStartOver={handleStartOver}
          />
        )}

        {/* Next episode */}
        {showNextEpisode &&
          video.seriesInfo?.nextEpisode &&
          !adState.isPlaying &&
          !error && (
            <NextEpisodeOverlay
              nextEpisode={video.seriesInfo.nextEpisode}
              onPlayNow={handleNextEpisodePlay}
              onCancel={handleNextEpisodeCancel}
              suppressAutoPlay={nextEpisodeTriggeredBySeeking}
            />
          )}

        {/* OTT-style visual feedback (play/pause/seek flash in centre) */}
        <PlaybackFeedback action={feedbackAction} />

        {/* Skip Intro Overlay — shows from visibleAtSeconds until user clicks or seeks past durationSeconds */}
        {video.skipIntro &&
          currentTime >= video.skipIntro.visibleAtSeconds &&
          currentTime < video.skipIntro.visibleEndSeconds &&
          !adState.isPlaying &&
          !error && (
            <button
              onClick={() => {
                const target = video.skipIntro!.durationSeconds;
                logger.info('[OTTPlayer] Skipping intro, seeking to', { target });
                engineRef.current?.seek(target);
                engineRef.current?.play();
                analyticsService.track(EVENT_NAMES.SKIP_INTRO_CLICKED, {
                  asset_id: String(video.contentId),
                  asset_title: video.title ?? '',
                  position_seconds: Math.round(currentTime),
                  skip_to_seconds: target,
                });
              }}
              className="absolute bottom-24 right-6 z-50 px-6 py-2.5 bg-black/85 hover:bg-black border border-theme_1/20 text-theme_1 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 active:scale-95 shadow-2xl hover:border-theme_1/40 overflow-hidden"
              style={{ pointerEvents: 'auto', backdropFilter: 'blur(8px)' }}
            >
              <span
                className="absolute inset-y-0 left-0 bg-[#F26E21] transition-[width] duration-200 ease-linear"
                style={{ width: `${skipIntroProgressPercent}%` }}
                aria-hidden="true"
              />
              <span className="relative z-10 select-none">Skip Intro</span>
            </button>
          )}

        {/* Skip Recap Overlay — shows from visibleAtSeconds until user clicks or seeks past durationSeconds */}
        {video.skipRecap &&
          currentTime >= video.skipRecap.visibleAtSeconds &&
          currentTime < video.skipRecap.visibleEndSeconds &&
          !adState.isPlaying &&
          !error && (
            <button
              onClick={() => {
                const target = video.skipRecap!.durationSeconds;
                logger.info('[OTTPlayer] Skipping recap, seeking to', { target });
                engineRef.current?.seek(target);
                engineRef.current?.play();
                analyticsService.track(EVENT_NAMES.SKIP_RECAP_CLICKED, {
                  asset_id: String(video.contentId),
                  asset_title: video.title ?? '',
                  position_seconds: Math.round(currentTime),
                  skip_to_seconds: target,
                });
              }}
              className="absolute bottom-24 right-6 z-50 px-6 py-2.5 bg-black/85 hover:bg-black border border-theme_1/20 text-theme_1 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 active:scale-95 shadow-2xl hover:border-theme_1/40 overflow-hidden"
              style={{ pointerEvents: 'auto', backdropFilter: 'blur(8px)' }}
            >
              <span
                className="absolute inset-y-0 left-0 bg-[#F26E21] transition-[width] duration-200 ease-linear"
                style={{ width: `${skipRecapProgressPercent}%` }}
                aria-hidden="true"
              />
              <span className="relative z-10 select-none">Skip Recap</span>
            </button>
          )}

        {/* Next Title Overlay (Next Episode Countdown Card) */}
        {video.nextTitle &&
          currentTime >= video.nextTitle.visibleAtSeconds &&
          currentTime <= video.nextTitle.visibleEndSeconds &&
          nextEpisodeFromList &&
          !adState.isPlaying &&
          !isNextEpisodePromptDismissed &&
          !error && (
            <div className="absolute bottom-24 right-6 z-40">
              <NextEpisodeCard
                title={nextEpisodeFromList.episode.asset_title}
                thumbnailUrl={
                  nextEpisodeFromList.episode.poster.find((p) => p.is_default)?.url ??
                  nextEpisodeFromList.episode.poster[0]?.url
                }
                episodeLabel={`S${nextEpisodeFromList.season.season_number} EP${nextEpisodeFromList.episode.episode_number}`}
                durationLabel={formatDurationMinutes(nextEpisodeFromList.episode.asset_total_duration)}
                countdownSeconds={video.nextTitle.visibleEndSeconds - currentTime}
                countdownTotalSeconds={
                  video.nextTitle.visibleEndSeconds - video.nextTitle.visibleAtSeconds
                }
                onPlayNow={() => {
                  setHasTriggeredNextEpisodeAuto(true);
                  onEpisodeSelect?.(
                    nextEpisodeFromList.episode,
                    nextEpisodeFromList.season,
                    video.nextTitle!.startAtSeconds
                  );
                }}
                onCancel={() => setIsNextEpisodePromptDismissed(true)}
              />
            </div>
          )}

        {/* ── Episodes panel overlay ── */}
        {showEpisodesPanel && seasons.length > 0 && (
          <EpisodesPanel
            seasons={seasons}
            currentEpisodeId={currentEpisodeId ?? null}
            onEpisodeSelect={handleEpisodePanelSelect}
            onClose={handleEpisodesPanelClose}
          />
        )}

        {/* ── Controls — always mounted, fades in/out like Hotstar ── */}
        {!error && !showResumePrompt && (
          <div
            className="absolute inset-0 z-20"
            style={{
              opacity: controlsVisible ? 1 : 0,
              transition: 'opacity 0.35s ease',
              pointerEvents: controlsVisible ? 'auto' : 'none',
            }}
          >
            <PlayerControls
              isVisible={controlsVisible}
              title={video.title}
              onBack={handleBack}
              showCertificate={showCertificate}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              buffered={buffered}
              volume={volume}
              isMuted={isMuted}
              speed={speed}
              isFullscreen={isFullscreen}
              isPipActive={isPip}
              isPipSupported={PipManager.isSupported()}
              qualities={qualities}
              activeQualityId={activeQualityId}
              audioTracks={audioTracks}
              activeAudioTrackId={activeAudioTrackId}
              subtitleTracks={subtitleTracks}
              activeSubtitleTrackId={activeSubtitleTrackId}
              captionSize={captionSize}
              captionFontSize={captionFontSize}
              captionTextColor={captionTextColor}
              captionBgColor={captionBgColor}
              captionBgOpacity={captionBgOpacity}
              onCaptionFontSizeChange={setCaptionFontSize}
              onCaptionTextColorChange={setCaptionTextColor}
              onCaptionBgColorChange={setCaptionBgColor}
              onCaptionBgOpacityChange={setCaptionBgOpacity}
              thumbnailCues={thumbnailCues}
              isThumbnailEnabled={PLAYER_FEATURE_FLAGS.thumbnailPreview}
              adCuePoints={adCuePoints}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onForward={seekForward}
              onBackward={seekBackward}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={toggleMute}
              onSpeedChange={handleSpeedChange}
              onQualityChange={handleQualityChange}
              onAudioChange={handleAudioChange}
              onSubtitleChange={handleSubtitleChange}
              onCaptionSizeChange={handleCaptionSizeChange}
              onFullscreenToggle={toggleFullscreen}
              onPipToggle={togglePip}
              onEpisodes={seasons.length > 0 ? handleEpisodesToggle : undefined}
              onNextEpisode={nextEpisodeFromList ? handleNextEpisodePlay : undefined}
              onMenuOpenChange={(isOpen) => {
                isMenuOpenRef.current = isOpen;
                showControls();
              }}
            />
          </div>
        )}
      </div>
    </PlayerContextProvider>
  );
}
