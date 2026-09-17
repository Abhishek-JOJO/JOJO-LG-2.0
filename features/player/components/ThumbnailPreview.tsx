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

/** Larger, TV-scale center frame — fixed in place like Netflix/Hotstar rather
 * than the smaller size a web player can get away with up close. */
const CENTER_WIDTH = 480;
const CENTER_HEIGHT = 270;
/** Side (prev/next) frames — smaller and dimmed, same 16:9 ratio. */
const SIDE_WIDTH = 300;
const SIDE_HEIGHT = 169;
const TIME_BAR_HEIGHT = 36;
const FRAME_GAP = 18;

/** One filmstrip frame — either a real cue's thumbnail or an empty
 * placeholder (kept the same size so the cluster's total width, and
 * therefore its centered position, never shifts based on whether a
 * prev/next cue actually exists at the start/end of the track). */
function Frame({
  cue,
  width,
  height,
  active,
}: {
  cue: ThumbnailCue | null;
  width: number;
  height: number;
  active: boolean;
}) {
  return (
    <div
      className={`overflow-hidden bg-theme_10/95 shrink-0 transition-opacity duration-150 ${
        active
          ? 'border-[3px] border-white shadow-[0_12px_28px_-4px_rgba(0,0,0,0.9),0_4px_14px_-2px_rgba(0,0,0,0.6)] opacity-100'
          : 'border border-white/10 opacity-55'
      }`}
      style={{ width }}
    >
      <div className="relative overflow-hidden bg-theme_10" style={{ width, height }}>
        {cue ? (
          cue.isSprite ? (
            <div
              style={{
                width: cue.width,
                height: cue.height,
                transform: `scale(${Math.max(width / cue.width, height / cue.height, 1)})`,
                transformOrigin: 'top left',
                backgroundImage: `url("${cue.imageUrl}")`,
                backgroundPosition: `-${cue.x}px -${cue.y}px`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'auto',
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cue.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          )
        ) : (
          <div className="w-full h-full bg-theme_10/60" />
        )}
      </div>
    </div>
  );
}

export function ThumbnailPreview({
  cues,
  hoverPosition,
  duration,
}: ThumbnailPreviewProps) {
  const timeSeconds = hoverPosition * duration;

  const { prevCue, currentCue, nextCue } = useMemo(() => {
    const index = getThumbnailIndexAtTime(cues, timeSeconds);
    if (index === -1) return { prevCue: null, currentCue: null, nextCue: null };
    return {
      prevCue: cues[index - 1] ?? null,
      currentCue: cues[index],
      nextCue: cues[index + 1] ?? null,
    };
  }, [cues, timeSeconds]);

  if (!currentCue) return null;

  return (
    // Outer wrapper: ONLY static positioning (centered above the seek bar,
    // like Netflix/Hotstar — fixed in place, never follows the thumb/pointer
    // left-right). This must stay a plain, un-animated transform: the
    // .player-menu-pop-in class below has its own @keyframes that set
    // `transform: translateY(...) scale(...)` on `from`/`to` — CSS animations
    // take precedence over inline styles for the properties they animate, so
    // putting that class on the SAME element as `translateX(-50%)` silently
    // wiped out the centering the whole time (it rendered wherever the
    // animation's own transform happened to place it instead). Splitting the
    // static centering (outer) from the pop-in animation (inner) fixes that.
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 16,
      }}
    >
      {/* .player-menu-pop-in defaults to transform-origin: bottom right (tuned
          for the corner-anchored Settings/Subtitle dropdowns) — override to
          bottom center so THIS pop-in scales from the middle, matching a
          centered element instead of looking corner-anchored. */}
      <div
        className="player-menu-pop-in flex items-end"
        style={{ gap: FRAME_GAP, transformOrigin: 'bottom center' }}
      >
        {/* `items-end` aligns each flex item's own bottom edge — but the
            center column is a Frame *plus* the time strip below it, while
            the side columns are bare Frames. That meant the side columns'
            bottoms (their actual image) were flush with the BOTTOM OF THE
            TIME STRIP, not the bottom of the center image — visually the
            side thumbnails sat ~36px lower than the center one instead of
            lining up with it. Giving the side columns their own invisible
            spacer of the same height makes every column's total height
            include (or account for) the time strip, so the three *images*
            share one common bottom edge regardless of the time strip only
            existing under the center one. */}
        <div>
          <Frame cue={prevCue} width={SIDE_WIDTH} height={SIDE_HEIGHT} active={false} />
          <div aria-hidden="true" style={{ height: TIME_BAR_HEIGHT }} />
        </div>

        <div>
          <Frame cue={currentCue} width={CENTER_WIDTH} height={CENTER_HEIGHT} active />
          {/* Time strip — only under the center/active frame */}
          <div
            className="flex items-center justify-center bg-black/60 border-t border-white/5"
            style={{ height: TIME_BAR_HEIGHT, width: CENTER_WIDTH }}
          >
            <span className="text-sm font-semibold text-white/95 tracking-wide tabular-nums leading-none">
              {formatPlayerTime(timeSeconds)}
            </span>
          </div>
        </div>

        <div>
          <Frame cue={nextCue} width={SIDE_WIDTH} height={SIDE_HEIGHT} active={false} />
          <div aria-hidden="true" style={{ height: TIME_BAR_HEIGHT }} />
        </div>
      </div>
    </div>
  );
}
