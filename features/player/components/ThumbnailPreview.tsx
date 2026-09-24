"use client";

import React, { useMemo } from 'react';
import type { ThumbnailCue } from '../model/types';
import { getThumbnailIndexAtTime } from '../utils/parseVttThumbnails';
import { formatPlayerTime } from '../utils/formatPlayerTime';

interface ThumbnailPreviewProps {
  cues: ThumbnailCue[];
  hoverPosition: number;
  duration: number;
}

/** TV-scale center frame — fixed in place and centered above the seek bar */
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 270;
const TIME_BAR_HEIGHT = 50;

export function ThumbnailPreview({
  cues,
  hoverPosition,
  duration,
}: ThumbnailPreviewProps) {
  const timeSeconds = hoverPosition * duration;

  const currentCue = useMemo(() => {
    const index = getThumbnailIndexAtTime(cues, timeSeconds);
    if (index === -1) return null;
    return cues[index] ?? null;
  }, [cues, timeSeconds]);

  if (!currentCue) return null;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 20,
      }}
    >
      <div
        className="player-menu-pop-in flex flex-col items-center rounded-2xl overflow-hidden border-[3px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.95)] bg-neutral-950"
        style={{ width: THUMBNAIL_WIDTH, transformOrigin: 'bottom center' }}
      >
        {/* Single Center Thumbnail Frame */}
        <div className="relative overflow-hidden bg-neutral-900" style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}>
          {currentCue.isSprite ? (
            <div
              style={{
                width: currentCue.width,
                height: currentCue.height,
                transform: `scale(${Math.max(THUMBNAIL_WIDTH / currentCue.width, THUMBNAIL_HEIGHT / currentCue.height, 1)})`,
                transformOrigin: 'top left',
                backgroundImage: `url("${currentCue.imageUrl}")`,
                backgroundPosition: `-${currentCue.x}px -${currentCue.y}px`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'auto',
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentCue.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          )}
        </div>

        {/* Larger, Prominent TV Duration Bar */}
        <div
          className="flex items-center justify-center bg-black/90 border-t border-white/10 w-full"
          style={{ height: TIME_BAR_HEIGHT }}
        >
          <span className="text-xl sm:text-2xl font-black text-white tracking-widest tabular-nums leading-none drop-shadow">
            {formatPlayerTime(timeSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}
