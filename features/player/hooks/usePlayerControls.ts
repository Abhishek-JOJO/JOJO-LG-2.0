"use client";

/**
 * usePlayerControls
 *
 * Handles ONLY:
 * - Keyboard shortcuts
 * - Fullscreen management
 * - PiP
 * - Seek / Play / Mute actions
 * - Mobile double-tap gestures
 *
 * Controls VISIBILITY is owned by OTTPlayer via local state + CSS transitions.
 * This hook receives `onActivity` callback to notify OTTPlayer of user activity.
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePlayerStore } from '@store/usePlayerStore';
import type { PlayerEngine } from '../engine/PlayerEngine';
import type { PipManager } from '../engine/PipManager';
import {
  SEEK_OFFSET_SECONDS,
  DOUBLE_TAP_ZONE_FRACTION,
  PLAYBACK_SPEEDS,
} from '../constants/player.constants';
import type { SubtitleTrack, PlaybackSpeed } from '../model/types';

interface UsePlayerControlsOptions {
  engine: PlayerEngine | null;
  pipManager: PipManager | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isEnabled: boolean;
  /** Called whenever the user interacts — OTTPlayer uses this to show controls */
  onActivity: () => void;
  /** Whether video is currently playing — passed from OTTPlayer local state */
  isPlaying: boolean;
  onActionFeedback?: (action: string, value?: number) => void;
  onNextEpisode?: () => void;
  subtitleTracks?: SubtitleTrack[];
  activeSubtitleTrackId?: number;
  onSubtitleChange?: (id: number) => void;
  speed?: PlaybackSpeed;
  onSpeedChange?: (speed: PlaybackSpeed) => void;
  isAdPlaying?: boolean;
  onAdPlayPause?: () => void;
}

export function usePlayerControls({
  engine,
  pipManager,
  containerRef,
  isEnabled,
  onActivity,
  isPlaying,
  onActionFeedback,
  onNextEpisode,
  subtitleTracks,
  activeSubtitleTrackId,
  onSubtitleChange,
  speed,
  onSpeedChange,
  isAdPlaying = false,
  onAdPlayPause,
}: UsePlayerControlsOptions) {
  const {
    isFullscreen,
    setFullscreen,
    volume,
    setVolume,
    isMuted,
    setMuted,
  } = usePlayerStore();

  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  // Stable refs so keydown/mouse listeners always read fresh props without re-subscribing
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  const onActionFeedbackRef = useRef(onActionFeedback);
  onActionFeedbackRef.current = onActionFeedback;

  const onNextEpisodeRef = useRef(onNextEpisode);
  onNextEpisodeRef.current = onNextEpisode;

  const subtitleTracksRef = useRef(subtitleTracks);
  subtitleTracksRef.current = subtitleTracks;

  const activeSubtitleTrackIdRef = useRef(activeSubtitleTrackId);
  activeSubtitleTrackIdRef.current = activeSubtitleTrackId;

  const onSubtitleChangeRef = useRef(onSubtitleChange);
  onSubtitleChangeRef.current = onSubtitleChange;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const onSpeedChangeRef = useRef(onSpeedChange);
  onSpeedChangeRef.current = onSpeedChange;

  const isAdPlayingRef = useRef(isAdPlaying);
  isAdPlayingRef.current = isAdPlaying;

  const onAdPlayPauseRef = useRef(onAdPlayPause);
  onAdPlayPauseRef.current = onAdPlayPause;

  // ── Seek Accumulation Refs & Cleanups ──────────────────────────────────────────
  const pendingSeekTimeRef = useRef<number | null>(null);
  const accumulatedOffsetRef = useRef<number>(0);
  const lastSeekDirectionRef = useRef<'forward' | 'backward' | null>(null);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSeekAccumulation = useCallback(() => {
    pendingSeekTimeRef.current = null;
    accumulatedOffsetRef.current = 0;
    lastSeekDirectionRef.current = null;
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  // ── Play/Pause toggle ────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    if (isAdPlayingRef.current) {
      onAdPlayPauseRef.current?.();
      return;
    }
    if (!engine) return;

    const store = usePlayerStore.getState();
    if (store.isMuted) {
      setMuted(false);
      engine.setVolume(store.volume || 0.7);
      onActionFeedbackRef.current?.('unmute');
    }

    if (isPlaying) {
      engine.pause();
      if (!store.isMuted) onActionFeedbackRef.current?.('pause');
    } else {
      engine.play();
      if (!store.isMuted) onActionFeedbackRef.current?.('play');
    }
  }, [engine, isPlaying, setMuted]);

  // ── Seek ─────────────────────────────────────────────────────────────────────

  const seekForward = useCallback(() => {
    if (!engine) return;

    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }

    const duration = engine.getDuration();
    
    if (lastSeekDirectionRef.current !== 'forward' || pendingSeekTimeRef.current === null) {
      pendingSeekTimeRef.current = engine.getCurrentTime();
      accumulatedOffsetRef.current = 0;
      lastSeekDirectionRef.current = 'forward';
    }

    accumulatedOffsetRef.current += SEEK_OFFSET_SECONDS;
    const targetTime = Math.min(pendingSeekTimeRef.current + SEEK_OFFSET_SECONDS, duration);
    pendingSeekTimeRef.current = targetTime;

    engine.seek(targetTime);
    onActionFeedbackRef.current?.('seek_forward', accumulatedOffsetRef.current);

    seekTimeoutRef.current = setTimeout(() => {
      clearSeekAccumulation();
    }, 800);
  }, [engine, clearSeekAccumulation]);

  const seekBackward = useCallback(() => {
    if (!engine) return;

    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }

    if (lastSeekDirectionRef.current !== 'backward' || pendingSeekTimeRef.current === null) {
      pendingSeekTimeRef.current = engine.getCurrentTime();
      accumulatedOffsetRef.current = 0;
      lastSeekDirectionRef.current = 'backward';
    }

    accumulatedOffsetRef.current += SEEK_OFFSET_SECONDS;
    const targetTime = Math.max(pendingSeekTimeRef.current - SEEK_OFFSET_SECONDS, 0);
    pendingSeekTimeRef.current = targetTime;

    engine.seek(targetTime);
    onActionFeedbackRef.current?.('seek_backward', accumulatedOffsetRef.current);

    seekTimeoutRef.current = setTimeout(() => {
      clearSeekAccumulation();
    }, 800);
  }, [engine, clearSeekAccumulation]);

  // ── Volume / Mute ─────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (!engine) return;
    const next = !isMuted;
    setMuted(next);
    engine.setVolume(next ? 0 : volume || 0.7);
    onActionFeedbackRef.current?.(next ? 'mute' : 'unmute');
  }, [engine, isMuted, setMuted, volume]);

  // ── Fullscreen ────────────────────────────────────────────────────────────────

  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current as any;
    if (!el) return;
    try {
      const reqFn =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
      if (reqFn) {
        await reqFn.call(el);
      }
    } catch { /* refused */ }
  }, [containerRef]);

  const exitFullscreen = useCallback(async () => {
    const doc = document as any;
    try {
      const exitFn =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;
      if (exitFn) {
        await exitFn.call(doc);
      }
    } catch { /* ignore */ }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) { await exitFullscreen(); } else { await enterFullscreen(); }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Sync fullscreen state from DOM events
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const active = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setFullscreen(active);
      const pos = engine?.getCurrentTime() ?? 0;
      if (active) engine?.eventBus.emit('FULLSCREEN_ENTER', { position: pos });
      else engine?.eventBus.emit('FULLSCREEN_EXIT', { position: pos });
    };

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];

    events.forEach((evt) => {
      document.addEventListener(evt, onFsChange);
    });

    return () => {
      events.forEach((evt) => {
        document.removeEventListener(evt, onFsChange);
      });
    };
  }, [engine, setFullscreen]);

  // ── PiP ───────────────────────────────────────────────────────────────────────

  const togglePip = useCallback(async () => {
    if (!pipManager || !engine) return;
    try { await pipManager.toggle(engine.getCurrentTime()); } catch { /* refused */ }
  }, [pipManager, engine]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Always register activity to keep controls visible while navigating
      onActivityRef.current();

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('button') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[role="slider"]') ||
        target.closest('[role="switch"]') ||
        target.closest('[role="tab"]')
      ) return;

      // Handle webOS specific numeric keyCodes first
      if (e.keyCode === 415) { // PLAY
        e.preventDefault();
        togglePlay();
        onActivityRef.current();
        return;
      }
      if (e.keyCode === 19) { // PAUSE
        e.preventDefault();
        togglePlay();
        onActivityRef.current();
        return;
      }
      if (e.keyCode === 413) { // STOP
        e.preventDefault();
        engine?.pause();
        onActivityRef.current();
        return;
      }
      if (e.keyCode === 417) { // FF
        e.preventDefault();
        if (!isAdPlayingRef.current) {
          seekForward();
          onActionFeedbackRef.current?.('seek_forward');
        }
        onActivityRef.current();
        return;
      }
      if (e.keyCode === 412) { // RW
        e.preventDefault();
        if (!isAdPlayingRef.current) {
          seekBackward();
          onActionFeedbackRef.current?.('seek_backward');
        }
        onActivityRef.current();
        return;
      }

      switch (e.key) {
        case 'Escape':
          // Esc key on desktop
          onActivityRef.current();
          break;
        case ' ':
        case 'k':
        case 'K':
        case 'p':
        case 'P':
          e.preventDefault();
          togglePlay();
          onActivityRef.current();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          if (!isAdPlayingRef.current) {
            seekForward();
            onActionFeedbackRef.current?.('seek_forward');
          }
          onActivityRef.current();
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          if (!isAdPlayingRef.current) {
            seekBackward();
            onActionFeedbackRef.current?.('seek_backward');
          }
          onActivityRef.current();
          break;
        case 'ArrowRight':
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'ArrowDown':
          // Allow Norigin Spatial Navigation to handle TV remote D-Pad navigation.
          // Trigger onActivity so the controls overlay remains visible during D-Pad usage.
          onActivityRef.current();
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          if (engine) {
            const pct = parseInt(e.key, 10) / 10;
            const dur = engine.getDuration();
            if (dur > 0) {
              engine.seek(dur * pct);
              onActionFeedbackRef.current?.(pct === 0 ? 'seek_backward' : 'seek_forward');
            }
          }
          onActivityRef.current();
          break;
      }
    };

    // Global custom media event handlers dispatched by RemoteManager
    const handleTvPlay = () => {
      togglePlay();
      onActivityRef.current();
    };
    const handleTvPause = () => {
      togglePlay();
      onActivityRef.current();
    };
    const handleTvStop = () => {
      engine?.pause();
      onActivityRef.current();
    };
    const handleTvFf = () => {
      if (!isAdPlayingRef.current) {
        seekForward();
        onActionFeedbackRef.current?.('seek_forward');
      }
      onActivityRef.current();
    };
    const handleTvRw = () => {
      if (!isAdPlayingRef.current) {
        seekBackward();
        onActionFeedbackRef.current?.('seek_backward');
      }
      onActivityRef.current();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('tv-media-play', handleTvPlay);
    document.addEventListener('tv-media-pause', handleTvPause);
    document.addEventListener('tv-media-stop', handleTvStop);
    document.addEventListener('tv-media-ff', handleTvFf);
    document.addEventListener('tv-media-rw', handleTvRw);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('tv-media-play', handleTvPlay);
      document.removeEventListener('tv-media-pause', handleTvPause);
      document.removeEventListener('tv-media-stop', handleTvStop);
      document.removeEventListener('tv-media-ff', handleTvFf);
      document.removeEventListener('tv-media-rw', handleTvRw);
    };
  }, [isEnabled, togglePlay, seekForward, seekBackward, toggleFullscreen, toggleMute, togglePip, setVolume, engine, volume]);

  // ── Mobile double-tap seek ────────────────────────────────────────────────────

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!engine) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const containerWidth = containerRef.current?.clientWidth ?? 1;
      const now = Date.now();
      const last = lastTapRef.current;

      if (last && now - last.time < 300) {
        const x = touch.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0);
        const relX = x / containerWidth;
        if (relX < DOUBLE_TAP_ZONE_FRACTION) seekBackward();
        else if (relX > 1 - DOUBLE_TAP_ZONE_FRACTION) seekForward();
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { time: now, x: touch.clientX };
        onActivityRef.current();
      }
    },
    [engine, seekForward, seekBackward, containerRef]
  );

  return {
    togglePlay,
    seekForward,
    seekBackward,
    toggleMute,
    toggleFullscreen,
    togglePip,
    handleTouchEnd,
  };
}
