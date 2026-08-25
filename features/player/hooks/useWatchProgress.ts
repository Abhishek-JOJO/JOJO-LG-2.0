"use client";

/**
 * useWatchProgress
 *
 * Manages save/restore of watch progress.
 * Saves on pause, visibility change, and every 30 seconds during playback.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@store/useAuthStore';
import { persistWatchProgress, clearWatchProgress } from '../services/player.service';
import { logger } from '@lib/logger/logger';
import { PROGRESS_SAVE_INTERVAL_MS } from '../constants/player.constants';
import type { PlayerEngine } from '../engine/PlayerEngine';
import { socketClient } from '@lib/socket/socket.client';

interface UseWatchProgressOptions {
  contentId: string;
  engine: PlayerEngine | null;
  isEnabled: boolean;
  onCompleted?: () => void;
}

export function useWatchProgress({
  contentId,
  engine,
  isEnabled,
  onCompleted,
}: UseWatchProgressOptions) {
  const sessionId = useAuthStore((state) => state.token);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = useCallback((forceApi: boolean = false) => {
    if (!engine || !isEnabled || !contentId) return;

    // Skip API progress save if WebSocket is active and sending heartbeats
    if (socketClient.isConnected) {
      logger.debug('[useWatchProgress] Skipping HTTP progress save (WebSocket is active)');
      return;
    }

    const position = engine.getCurrentTime();
    const duration = engine.getDuration();

    if (position < 1 || duration < 1) return;

    void persistWatchProgress(
      { contentId, positionSeconds: Math.floor(position), durationSeconds: Math.floor(duration) },
      sessionId ?? undefined,
      forceApi
    );
  }, [contentId, engine, isEnabled, sessionId]);

  const clear = useCallback(() => {
    clearWatchProgress(contentId);
    if (onCompleted) onCompleted();
  }, [contentId, onCompleted]);

  // 30-second interval save (force API update)
  useEffect(() => {
    if (!isEnabled || !engine) return;

    intervalRef.current = setInterval(() => save(true), PROGRESS_SAVE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isEnabled, engine, save]);

  // Save on visibilitychange (tab switch / browser close)
  useEffect(() => {
    if (!isEnabled) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        save(true);
        logger.info('[useWatchProgress] Saved on visibility hidden');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isEnabled, save]);

  // Subscribe to PAUSE event via engine event bus (throttled API save)
  useEffect(() => {
    if (!engine || !isEnabled) return;

    const unsub = engine.eventBus.on('PAUSE', () => {
      save(false);
    });

    return unsub;
  }, [engine, isEnabled, save]);

  // Subscribe to ENDED to clear progress
  useEffect(() => {
    if (!engine || !isEnabled) return;

    const unsub = engine.eventBus.on('ENDED', () => {
      clear();
    });

    return unsub;
  }, [engine, isEnabled, clear]);

  return { save, clear };
}
