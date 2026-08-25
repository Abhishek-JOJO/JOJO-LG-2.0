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

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
        case 'p':
        case 'P':
          e.preventDefault();
          togglePlay();
          onActivityRef.current();
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          if (!isAdPlayingRef.current) {
            seekForward();
            onActionFeedbackRef.current?.('seek_forward');
          }
          onActivityRef.current();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          if (!isAdPlayingRef.current) {
            seekBackward();
            onActionFeedbackRef.current?.('seek_backward');
          }
          onActivityRef.current();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          void toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          void togglePip();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          {
            const tracks = subtitleTracksRef.current;
            const activeId = activeSubtitleTrackIdRef.current;
            const changeFn = onSubtitleChangeRef.current;
            if (tracks && activeId !== undefined && changeFn) {
              if (activeId === -1) {
                const first = tracks.find(t => t.id !== -1);
                if (first) {
                  changeFn(first.id);
                }
              } else {
                changeFn(-1);
              }
            }
          }
          onActivityRef.current();
          break;
        case ',':
        case '<':
          e.preventDefault();
          {
            const curSpeed = speedRef.current;
            const changeSpeedFn = onSpeedChangeRef.current;
            if (curSpeed !== undefined && changeSpeedFn) {
              const idx = PLAYBACK_SPEEDS.indexOf(curSpeed);
              if (idx > 0) {
                changeSpeedFn(PLAYBACK_SPEEDS[idx - 1]);
              }
            }
          }
          onActivityRef.current();
          break;
        case '.':
        case '>':
          e.preventDefault();
          {
            const curSpeed = speedRef.current;
            const changeSpeedFn = onSpeedChangeRef.current;
            if (curSpeed !== undefined && changeSpeedFn) {
              const idx = PLAYBACK_SPEEDS.indexOf(curSpeed);
              if (idx !== -1 && idx < PLAYBACK_SPEEDS.length - 1) {
                changeSpeedFn(PLAYBACK_SPEEDS[idx + 1]);
              }
            }
          }
          onActivityRef.current();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          if (onNextEpisodeRef.current) {
            onNextEpisodeRef.current();
          }
          onActivityRef.current();
          break;
        case 'ArrowUp':
          e.preventDefault();
          {
            const v = Math.min(volume + 0.1, 1);
            setVolume(v);
            engine?.setVolume(v);
            onActionFeedbackRef.current?.('volume_up');
          }
          onActivityRef.current();
          break;
        case 'ArrowDown':
          e.preventDefault();
          {
            const v = Math.max(volume - 0.1, 0);
            setVolume(v);
            engine?.setVolume(v);
            onActionFeedbackRef.current?.('volume_down');
          }
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

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
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
