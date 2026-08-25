"use client";

import React, { useMemo } from 'react';
import type { ThumbnailCue } from '../model/types';
import { getThumbnailAtTime } from '../utils/parseVttThumbnails';
import { formatPlayerTime } from '../utils/formatPlayerTime';

interface ThumbnailPreviewProps {
  cues: ThumbnailCue[];
  hoverPosition: number;
  duration: number;
  progressBarRect: DOMRect | null;
}

/** Standard 16:9 preview size used by most OTT players */
const PREVIEW_WIDTH = 224;
const PREVIEW_HEIGHT = 126;
const TIME_BAR_HEIGHT = 26;

export function ThumbnailPreview({
  cues,
  hoverPosition,
  duration,
  progressBarRect,
}: ThumbnailPreviewProps) {
  const timeSeconds = hoverPosition * duration;
  const cue = getThumbnailAtTime(cues, timeSeconds);

  const layout = useMemo(() => {
    if (!cue || !progressBarRect) return null;

    const scaleX = PREVIEW_WIDTH / cue.width;
    const scaleY = PREVIEW_HEIGHT / cue.height;
    const scale = Math.max(scaleX, scaleY, 1);

    const pixelX = hoverPosition * progressBarRect.width;
    const totalWidth = PREVIEW_WIDTH;
    const left = Math.max(
      0,
      Math.min(pixelX - totalWidth / 2, progressBarRect.width - totalWidth)
    );

    return { left, scale, cue };
  }, [cue, hoverPosition, progressBarRect]);

  if (!layout) return null;

  const { left, scale, cue: activeCue } = layout;

  return (
    <div
      className="absolute z-50 pointer-events-none player-menu-pop-in"
      style={{
        bottom: '100%',
        left,
        marginBottom: 12,
        width: PREVIEW_WIDTH,
      }}
    >
      <div
        className="overflow-hidden bg-theme_10/95 border border-white/15 rounded-none shadow-[0_12px_24px_-4px_rgba(0,0,0,0.85),0_4px_12px_-2px_rgba(0,0,0,0.5)] backdrop-blur-md"
        style={{ width: PREVIEW_WIDTH }}
      >
        {/* Image area */}
        <div
          className="relative overflow-hidden bg-theme_10"
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
        >
          {activeCue.isSprite ? (
            <div
              style={{
                width: activeCue.width,
                height: activeCue.height,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                backgroundImage: `url("${activeCue.imageUrl}")`,
                backgroundPosition: `-${activeCue.x}px -${activeCue.y}px`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'auto',
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeCue.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}
        </div>

        {/* Time strip — full-width bar below image */}
        <div
          className="flex items-center justify-center bg-black/60 border-t border-white/5"
          style={{ height: TIME_BAR_HEIGHT }}
        >
          <span className="text-[11px] font-semibold text-white/95 tracking-wide tabular-nums leading-none">
            {formatPlayerTime(timeSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}
