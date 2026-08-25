/**
 * VTT Thumbnail Parser
 *
 * Parses WebVTT thumbnail tracks into ThumbnailCue objects.
 * Supports sprite sheets (#xywh=) and individual image files.
 * Resolves relative image paths against the VTT file URL.
 */

import { logger } from '@lib/logger/logger';
import type { ThumbnailCue } from '../model/types';

function parseTimestamp(ts: string): number {
  const normalized = ts.trim().replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s);
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return parseInt(m, 10) * 60 + parseFloat(s);
  }
  return 0;
}

function parseXywh(fragment: string): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const match = fragment.match(/xywh=(\d+),(\d+),(\d+),(\d+)/);
  if (!match) return null;
  return {
    x: parseInt(match[1], 10),
    y: parseInt(match[2], 10),
    width: parseInt(match[3], 10),
    height: parseInt(match[4], 10),
  };
}

function resolveImageUrl(payload: string, vttBaseUrl?: string): string {
  const trimmed = payload.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!vttBaseUrl) return trimmed;
  try {
    return new URL(trimmed, vttBaseUrl).href;
  } catch {
    return trimmed;
  }
}

/**
 * Parse a VTT thumbnail track string into ThumbnailCue array.
 */
export function parseVttThumbnails(
  vttContent: string,
  vttBaseUrl?: string
): ThumbnailCue[] {
  const cues: ThumbnailCue[] = [];
  const blocks = vttContent.split(/\r?\n\r?\n+/);

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line !== 'WEBVTT' && !line.startsWith('NOTE'));

    if (lines.length < 2) continue;

    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1) continue;

    const timing = lines[timingIndex];
    const [startStr, endStr] = timing.split('-->').map((s) => s.trim());
    if (!startStr || !endStr) continue;

    const startSeconds = parseTimestamp(startStr);
    const endSeconds = parseTimestamp(endStr);

    const payload = lines[timingIndex + 1];
    if (!payload) continue;

    const hashIdx = payload.indexOf('#');
    const rawUrl = hashIdx !== -1 ? payload.slice(0, hashIdx) : payload;
    const fragment = hashIdx !== -1 ? payload.slice(hashIdx + 1) : '';
    const imageUrl = resolveImageUrl(rawUrl, vttBaseUrl);
    if (!imageUrl) continue;

    const sprite = parseXywh(fragment);

    cues.push({
      startSeconds,
      endSeconds,
      imageUrl,
      x: sprite?.x ?? 0,
      y: sprite?.y ?? 0,
      width: sprite?.width ?? 160,
      height: sprite?.height ?? 90,
      isSprite: !!sprite,
    });
  }

  return cues;
}

/**
 * Fetch a VTT file and return parsed thumbnail cues.
 */
export async function fetchAndParseVttThumbnails(
  vttUrl: string
): Promise<ThumbnailCue[]> {
  try {
    const response = await fetch(vttUrl, { credentials: 'omit' });
    if (!response.ok) {
      logger.warn('[VTT] Fetch failed', { vttUrl, status: response.status });
      return [];
    }
    const text = await response.text();
    const cues = parseVttThumbnails(text, vttUrl);
    logger.info('[VTT] Parsed thumbnail cues', { vttUrl, count: cues.length });
    return cues;
  } catch (error) {
    logger.warn('[VTT] Fetch error', { vttUrl, error });
    return [];
  }
}

/**
 * Find the thumbnail cue for a given playback position.
 */
export function getThumbnailAtTime(
  cues: ThumbnailCue[],
  timeSeconds: number
): ThumbnailCue | null {
  const exact =
    cues.find(
      (c) => timeSeconds >= c.startSeconds && timeSeconds < c.endSeconds
    ) ?? null;
  if (exact) return exact;

  // Fallback: last cue that has started (handles boundary timestamps)
  for (let i = cues.length - 1; i >= 0; i -= 1) {
    if (timeSeconds >= cues[i].startSeconds) return cues[i];
  }
  return null;
}
