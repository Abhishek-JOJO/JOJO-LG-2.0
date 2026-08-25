"use client";

import React, { memo, useEffect, useRef, useState } from 'react';
import type { NextEpisodeInfo } from '../model/types';
import { NEXT_EPISODE_COUNTDOWN_SECONDS } from '../constants/player.constants';
import { NextEpisodeCard } from './NextEpisodeCard';

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface NextEpisodeOverlayProps {
  nextEpisode: NextEpisodeInfo;
  onPlayNow: () => void;
  onCancel: () => void;
  /**
   * When true, the countdown timer still animates visually but does NOT
   * auto-trigger onPlayNow when it reaches 0. The user must click "Play Next"
   * manually. Used when a seek-to-end is detected to avoid surprising the user.
   */
  suppressAutoPlay?: boolean;
}

export const NextEpisodeOverlay = memo(function NextEpisodeOverlay({
  nextEpisode,
  onPlayNow,
  onCancel,
  suppressAutoPlay = false,
}: NextEpisodeOverlayProps) {
  const endTimeRef = useRef(Date.now() + NEXT_EPISODE_COUNTDOWN_SECONDS * 1000);
  const hasTriggeredRef = useRef(false);
  const [remainingSeconds, setRemainingSeconds] = useState(NEXT_EPISODE_COUNTDOWN_SECONDS);

  const durationLabel =
    nextEpisode.durationSeconds && nextEpisode.durationSeconds > 0
      ? formatDuration(nextEpisode.durationSeconds)
      : undefined;

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const left = Math.max(0, (endTimeRef.current - Date.now()) / 1000);
      setRemainingSeconds(left);

      if (left <= 0 && !hasTriggeredRef.current && !suppressAutoPlay) {
        hasTriggeredRef.current = true;
        onPlayNow();
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onPlayNow, suppressAutoPlay]);

  return (
    <div className="absolute bottom-24 right-6 z-40">
      <NextEpisodeCard
        title={nextEpisode.title}
        thumbnailUrl={nextEpisode.thumbnailUrl}
        durationLabel={durationLabel}
        countdownSeconds={remainingSeconds}
        countdownTotalSeconds={NEXT_EPISODE_COUNTDOWN_SECONDS}
        onPlayNow={onPlayNow}
        onCancel={onCancel}
      />
    </div>
  );
});
