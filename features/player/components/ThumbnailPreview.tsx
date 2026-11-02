"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ThumbnailCue } from '../model/types';
import { isTizen } from '@/src/platform/detectPlatform';
import { getThumbnailIndexAtTime } from '../utils/parseVttThumbnails';
import { formatPlayerTime } from '../utils/formatPlayerTime';

interface ThumbnailPreviewProps {
  cues: ThumbnailCue[];
  hoverPosition: number;
  duration: number;
}

// Sprite sheets come in two shapes: one huge image for the whole film (one
// measured 2400x11475, 4.7MB) or hundreds of small sheets (one film had ~530
// 960x540 sheets). As a CSS background a Samsung TV re-decoded the huge one
// for each new frame, so the preview trailed far behind the seek bar. On Tizen
// a sheet is decoded once (off the main thread) and each frame is a small
// canvas copy. Only sheets near the play/scrub position are loaded, and at most
// MAX_DECODED_SHEETS stay decoded (~2MB each for the small ones). Other
// platforms keep the CSS background.
const useSpriteCanvas = typeof window !== 'undefined' && typeof createImageBitmap === 'function' && isTizen();
const MAX_DECODED_SHEETS = 12;
// Sheets to warm ahead of the scrub position (each Right press moves 10s).
const LOOKAHEAD_SECONDS = [20, 40, 60, -20];
const spriteBitmaps = new Map<string, Promise<ImageBitmap | null>>();

function loadSpriteBitmap(url: string): Promise<ImageBitmap | null> {
  let bitmap = spriteBitmaps.get(url);
  if (bitmap) {
    spriteBitmaps.delete(url); // most recently used goes last
  } else {
    bitmap = fetch(url)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((blob) => createImageBitmap(blob))
      .catch(() => {
        spriteBitmaps.delete(url); // let a later scrub try again
        return null;
      });
  }
  spriteBitmaps.set(url, bitmap);
  while (spriteBitmaps.size > MAX_DECODED_SHEETS) {
    const [oldest, evicted] = spriteBitmaps.entries().next().value as [string, Promise<ImageBitmap | null>];
    spriteBitmaps.delete(oldest);
    void evicted.then((b) => b?.close());
  }
  return bitmap;
}

function sheetAt(cues: ThumbnailCue[], seconds: number): string | null {
  const cue = cues[getThumbnailIndexAtTime(cues, seconds)];
  return cue?.isSprite ? cue.imageUrl : null;
}

/** Warms the sheets around `aroundSeconds` ahead of the first scrub (Tizen). */
export function preloadThumbnailSprites(cues: ThumbnailCue[], aroundSeconds: number): void {
  if (!useSpriteCanvas) return;
  for (const offset of [0, ...LOOKAHEAD_SECONDS]) {
    const url = sheetAt(cues, Math.max(0, aroundSeconds + offset));
    if (url) void loadSpriteBitmap(url);
  }
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

  const canvasSprite = useSpriteCanvas && !!currentCue?.isSprite;
  const spriteUrl = canvasSprite ? currentCue!.imageUrl : null;
  const [decoded, setDecoded] = useState<{ url: string; bitmap: ImageBitmap } | null>(null);
  useEffect(() => {
    if (!spriteUrl) return;
    let alive = true;
    loadSpriteBitmap(spriteUrl).then((bitmap) => {
      if (alive && bitmap) setDecoded({ url: spriteUrl, bitmap });
    });
    preloadThumbnailSprites(cues, timeSeconds);
    return () => {
      alive = false;
    };
    // Re-run per sheet, not per frame: timeSeconds is only the lookahead origin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spriteUrl, cues]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !currentCue) return;
    ctx.clearRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    // Another sheet still decoding: stay blank rather than show its neighbour's frame.
    if (!decoded || decoded.url !== currentCue.imageUrl) return;
    // Same cover-fit as the CSS path: scale the tile up to fill the frame.
    const scale = Math.max(THUMBNAIL_WIDTH / currentCue.width, THUMBNAIL_HEIGHT / currentCue.height, 1);
    try {
      ctx.drawImage(
        decoded.bitmap,
        currentCue.x, currentCue.y, currentCue.width, currentCue.height,
        0, 0, currentCue.width * scale, currentCue.height * scale,
      );
    } catch {
      // Evicted (closed) since it was decoded; the load effect brings it back.
    }
  }, [decoded, currentCue]);

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
          {canvasSprite ? (
            // Stays dark until the sheet is decoded; then every frame is instant.
            <canvas ref={canvasRef} width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} className="block" />
          ) : currentCue.isSprite ? (
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
