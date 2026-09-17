"use client";

/**
 * ProgressBar
 *
 * OTT-style seek bar with:
 * - Immediate scrub UI (local state while dragging)
 * - Single engine seek on pointer release
 * - VTT thumbnail preview on hover
 * - Remaining duration on the right
 */

import React, { useEffect } from 'react';
import { ThumbnailPreview } from './ThumbnailPreview';
import { useSeekBar } from '../hooks/useSeekBar';
import { formatPlayerTime } from '../utils/formatPlayerTime';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { ThumbnailCue } from '../model/types';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  thumbnailCues: ThumbnailCue[];
  isThumbnailEnabled: boolean;
  suppressThumbnail?: boolean;
  adCuePoints?: number[];
  isVisible?: boolean;
  onSeek: (seconds: number) => void;
}

export function ProgressBar({
  currentTime,
  duration,
  buffered,
  thumbnailCues,
  isThumbnailEnabled,
  suppressThumbnail = false,
  adCuePoints = [],
  isVisible = true,
  onSeek,
}: ProgressBarProps) {
  const {
    trackRef,
    isScrubbing,
    hoverFraction,
    displayFraction,
    displayTime,
    barRect,
    clearHover,
    trackProps,
  } = useSeekBar({ duration, currentTime, onSeek });

  const { ref: focusRef, focused } = useFocusable({
    focusable: isVisible,
    onArrowPress: (direction) => {
      if (direction === 'left') {
        onSeek(Math.max(0, currentTime - 10));
        return false;
      }
      if (direction === 'right') {
        onSeek(Math.min(duration, currentTime + 10));
        return false;
      }
      return true;
    }
  });

  useEffect(() => {
    if (suppressThumbnail) clearHover();
  }, [suppressThumbnail, clearHover]);

  const playedPct = displayFraction * 100;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const remainingSeconds = Math.max(0, duration - (isScrubbing ? displayTime : currentTime));

  return (
    <div className="w-full flex items-center gap-3">
      {/* Focus is communicated by the thumb alone (see below) — no ring/
          background/scale on the whole bar, just a broader TV-style track. */}
      <div
        ref={focusRef}
        className="relative flex-1 group/seek"
        style={{ height: 24 }}
      >
        {isThumbnailEnabled &&
          !suppressThumbnail &&
          !isScrubbing &&
          hoverFraction !== null &&
          thumbnailCues.length > 0 && (
            <ThumbnailPreview
              cues={thumbnailCues}
              hoverPosition={hoverFraction}
              duration={duration}
              progressBarRect={barRect}
            />
          )}

        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(isScrubbing ? displayTime : currentTime)}
          aria-label="Seek"
          tabIndex={0}
          className="absolute inset-x-0 cursor-pointer touch-none"
          style={{ top: '50%', transform: 'translateY(-50%)', height: 24 }}
          {...trackProps}
        >
          {/* Broader, TV-scale track — a thin web-style line reads poorly
              from a couch/10-foot viewing distance. */}
          <div
            className={`absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full overflow-hidden transition-all duration-150 ${focused ? 'h-[12px]' : 'h-[9px] group-hover/seek:h-[12px]'
              }`}
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: `${bufferedPct}%`,
                background: 'rgba(255,255,255,0.35)',
              }}
            />
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: `${playedPct}%`,
                background: 'var(--theme_13_samecolour, #ff6b00)',
                transition: isScrubbing ? 'none' : 'width 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          {adCuePoints.map((cuePoint) => {
            const pct = duration > 0 ? (cuePoint / duration) * 100 : 0;
            if (pct <= 0 || pct >= 100) return null;

            // Hide the ad dot if the active playhead/thumb has played or scrubbed past it
            const activeTime = isScrubbing ? displayTime : currentTime;
            if (activeTime >= cuePoint) return null;

            return (
              <div
                key={cuePoint}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-[3px] transition-all duration-150 ${focused ? 'h-[12px]' : 'h-2 group-hover/seek:h-[12px]'
                  }`}
                style={{
                  left: `${pct}%`,
                  backgroundColor: '#ffcc00',
                  boxShadow: '0 0 4px rgba(255, 204, 0, 0.8)',
                }}
              />
            );
          })}

          {/* Thumb only appears while the seek bar actually has D-pad focus
              (or is being scrubbed/hovered) — otherwise it's just a thin
              progress line. Pressing Down/Up away from the seek bar takes
              focus elsewhere, so the thumb fades back out instead of sitting
              on the track all the time. */}
          <div
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-md group-hover/seek:opacity-100 group-hover/seek:w-6 group-hover/seek:h-6 pointer-events-none ${isScrubbing ? '' : 'transition-all duration-150'
              } ${focused || isScrubbing ? 'opacity-100 w-6 h-6 shadow-[0_0_12px_rgba(255,107,0,0.6)] ring-2 ring-white/50' : 'opacity-0'}`}
            style={{
              left: `${playedPct}%`,
              background: 'var(--theme_13_samecolour, #ff6b00)',
            }}
          />
        </div>
      </div>

      <span
        className="shrink-0 text-theme_1 tabular-nums select-none"
        style={{ fontSize: 13, letterSpacing: '0.01em', minWidth: 56, textAlign: 'right' }}
      >
        -{formatPlayerTime(remainingSeconds)}
      </span>
    </div>
  );
}
