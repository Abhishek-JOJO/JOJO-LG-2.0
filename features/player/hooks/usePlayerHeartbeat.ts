"use client";

/**
 * usePlayerHeartbeat
 *
 * Emits socket heartbeat events every second during playback.
 * Emits watch-end on unmount, video ended, visibility hidden, and route change.
 *
 * Socket protocol matches the spec:
 *   player-heartbeat — sent every 1s while playing
 *   watch-end        — sent on exit/unmount
 *
 * Uses refs and safe closures to guarantee watch-end is ALWAYS emitted when player closes,
 * even if the component unmounts after engine destruction.
 */

import { useCallback, useEffect, useRef } from 'react';
import { socketClient } from '@lib/socket/socket.client';
import { analyticsService } from '@/shared/analytics';
import { logger } from '@lib/logger/logger';
import { HEARTBEAT_INTERVAL_MS } from '../constants/player.constants';
import type { PlayerEngine } from '../engine/PlayerEngine';

interface HeartbeatPayload {
  player_session_id: string;
  asset_id: string;
  parent_id: string | null;
  asset_type: number | null;
  state: 'playing' | 'pause';
  progress: number;
  total_duration: number;
  is_subscribe: boolean;
  en: string;
}

interface UsePlayerHeartbeatOptions {
  engine: PlayerEngine | null;
  /** player_id from the playback API response */
  playerId: string | null;
  /** asset being played */
  assetId: string;
  /** parent asset ID — season/show for episodes, null for movies */
  parentId: string | null;
  /** asset type code */
  assetType: number | null;
  /** whether the user has an active subscription */
  isSubscribed: boolean;
  isEnabled: boolean;
}

export function usePlayerHeartbeat({
  engine,
  playerId,
  assetId,
  parentId,
  assetType,
  isSubscribed,
  isEnabled,
}: UsePlayerHeartbeatOptions) {
  const watchEndSentRef = useRef(false);
  const playbackStartedRef = useRef(false); // Track if playback_started has been sent
  const isPlayingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync refs to avoid stale closures during unmount cleanup
  const engineRef = useRef(engine);
  const playerIdRef = useRef(playerId);
  const assetIdRef = useRef(assetId);
  const parentIdRef = useRef(parentId);
  const assetTypeRef = useRef(assetType);
  const isSubscribedRef = useRef(isSubscribed);

  const lastProgressRef = useRef<number>(0);
  const lastDurationRef = useRef<number>(0);

  useEffect(() => {
    engineRef.current = engine;
    playerIdRef.current = playerId;
    assetIdRef.current = assetId;
    parentIdRef.current = parentId;
    assetTypeRef.current = assetType;
    isSubscribedRef.current = isSubscribed;
  });

  // Reset watchEndSentRef and playbackStartedRef when playing a new asset or player session
  useEffect(() => {
    watchEndSentRef.current = false;
    playbackStartedRef.current = false;
  }, [assetId, playerId]);

  // ── Build payload from refs (resilient to unmount/destruction) ──────────────

  const buildPayload = useCallback((state: 'playing' | 'pause', eventName: string): HeartbeatPayload | null => {
    const pId = playerIdRef.current;
    const aId = assetIdRef.current;
    if (!pId || !aId) return null;

    let progress = lastProgressRef.current;
    let total_duration = lastDurationRef.current;

    // Attempt live read from engine if available and active
    const eng = engineRef.current;
    if (eng) {
      try {
        const ct = eng.getCurrentTime();
        const dur = eng.getDuration();
        if (typeof ct === 'number' && !isNaN(ct) && ct >= 0) {
          progress = parseFloat(ct.toFixed(2));
        }
        if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
          total_duration = parseFloat(dur.toFixed(2));
        }
      } catch (e) {
        // Engine might be destroyed; fallback to lastProgressRef / lastDurationRef
      }
    }

    return {
      player_session_id: pId,
      asset_id: aId,
      parent_id: parentIdRef.current,
      asset_type: assetTypeRef.current,
      state,
      progress,
      total_duration,
      is_subscribe: isSubscribedRef.current,
      en: eventName,
    };
  }, []);

  // ── Heartbeat interval ────────────────────────────────────────────────────

  const startHeartbeat = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      if (!isPlayingRef.current) return;

      const payload = buildPayload('playing', 'player-heartbeat');
      if (!payload) return;

      socketClient.emitRequest('player-heartbeat', payload);
    }, HEARTBEAT_INTERVAL_MS);

    logger.info('[usePlayerHeartbeat] Heartbeat started', { assetId: assetIdRef.current });
  }, [buildPayload]);

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      logger.info('[usePlayerHeartbeat] Heartbeat stopped', { assetId: assetIdRef.current });
    }
  }, []);

  // ── Emit watch-end socket event & playback_end analytics ────────────────────

  const emitWatchEnd = useCallback(() => {
    logger.info('[usePlayerHeartbeat] emitWatchEnd triggered', {
      alreadySent: watchEndSentRef.current,
      playbackStarted: playbackStartedRef.current,
      assetId: assetIdRef.current,
      playerId: playerIdRef.current,
    });

    if (watchEndSentRef.current) {
      logger.info('[usePlayerHeartbeat] watch-end already sent for session, skipping');
      return;
    }

    // Only emit watch-end if playback has actually started
    // This prevents playback_end from firing during ads or before actual content playback
    if (!playbackStartedRef.current) {
      logger.info('[usePlayerHeartbeat] playback not started yet, skipping watch-end');
      return;
    }

    watchEndSentRef.current = true;

    // Stop heartbeat interval when video ends / user exits player
    stopHeartbeat();

    // 1. Socket event: "watch-end"
    const payload = buildPayload(
      isPlayingRef.current ? 'playing' : 'pause',
      'watch-end'
    );
    if (!payload) {
      logger.warn('[usePlayerHeartbeat] buildPayload returned null for watch-end', {
        pId: playerIdRef.current,
        aId: assetIdRef.current,
      });
      return;
    }

    socketClient.emitRequest('watch-end', payload);

    // 2. Analytics event: "playback_end" (PLAYBACK_END)
    analyticsService.trackPlaybackEnd({
      content_id: payload.asset_id,
      position_seconds: payload.progress,
      total_duration_seconds: payload.total_duration,
    });

    logger.info('[usePlayerHeartbeat] watch-end socket event and playback_end analytics emitted', {
      assetId: payload.asset_id,
      progress: payload.progress,
      total_duration: payload.total_duration,
    });
  }, [buildPayload, stopHeartbeat]);

  // Keep a ref to emitWatchEnd to guarantee unmount cleanup calls the latest ref
  const emitWatchEndRef = useRef(emitWatchEnd);
  useEffect(() => {
    emitWatchEndRef.current = emitWatchEnd;
  }, [emitWatchEnd]);

  // ── Subscribe to player events ────────────────────────────────────────────

  useEffect(() => {
    if (!engine || !isEnabled || !playerId) return;

    const bus = engine.eventBus;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      bus.on('TIME_UPDATE', ({ currentTime, duration }) => {
        if (typeof currentTime === 'number' && !isNaN(currentTime)) {
          lastProgressRef.current = parseFloat(currentTime.toFixed(2));
        }
        if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
          lastDurationRef.current = parseFloat(duration.toFixed(2));
        }
      })
    );

    unsubs.push(
      bus.on('RESUME_PLAYBACK', ({ resumePositionSeconds }) => {
        if (resumePositionSeconds > 0) {
          lastProgressRef.current = resumePositionSeconds;
          const payload = buildPayload('playing', 'player-heartbeat');
          if (payload) {
            socketClient.emitRequest('player-heartbeat', payload);
            logger.info('[usePlayerHeartbeat] Initial heartbeat emitted on resume playback', { assetId, resumePositionSeconds });
          }
        }
      })
    );

    unsubs.push(
      bus.on('PLAY', () => {
        isPlayingRef.current = true;
        playbackStartedRef.current = true; // Mark that playback has started
        startHeartbeat();
      })
    );

    unsubs.push(
      bus.on('PAUSE', () => {
        isPlayingRef.current = false;
        const payload = buildPayload('pause', 'player-heartbeat');
        if (payload) socketClient.emitRequest('player-heartbeat', payload);
      })
    );

    unsubs.push(
      bus.on('ENDED', () => {
        isPlayingRef.current = false;
        stopHeartbeat();
        emitWatchEnd();
      })
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [engine, isEnabled, playerId, startHeartbeat, stopHeartbeat, buildPayload, emitWatchEnd, assetId]);

  // ── Window page unload / tab switch handlers ─────────────────────────────

  useEffect(() => {
    if (!isEnabled || !playerId) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        emitWatchEndRef.current();
        logger.info('[usePlayerHeartbeat] watch-end on visibility hidden');
      }
    };

    const onBeforeUnload = () => {
      emitWatchEndRef.current();
      logger.info('[usePlayerHeartbeat] watch-end on page beforeunload');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onBeforeUnload);
    };
  }, [isEnabled, playerId]);

  // ── Unmount cleanup ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopHeartbeat();
      emitWatchEndRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    emitWatchEnd,
  };
}
