/**
 * Player Constants
 */

import type { CaptionSize, PlaybackSpeed } from '../model/types';

export const SEEK_OFFSET_SECONDS = 10;

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const CAPTION_SIZE_OPTIONS: {
  value: CaptionSize;
  label: string;
  fontScaleFactor: number;
}[] = [
  { value: 'small', label: 'Small', fontScaleFactor: 0.85 },
  { value: 'medium', label: 'Medium', fontScaleFactor: 1 },
  { value: 'large', label: 'Large', fontScaleFactor: 1.25 },
];

export const CAPTION_SIZE_LABELS: Record<CaptionSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export function getCaptionFontScale(size: CaptionSize): number {
  return CAPTION_SIZE_OPTIONS.find((o) => o.value === size)?.fontScaleFactor ?? 1;
}

export const PLAYBACK_SPEED_LABELS: Record<PlaybackSpeed, string> = {
  0.5: '0.5×',
  0.75: '0.75×',
  1: 'Normal',
  1.25: '1.25×',
  1.5: '1.5×',
  2: '2×',
};

/** Auto-hide controls after this many ms of inactivity */
export const CONTROLS_HIDE_DELAY_MS = 3000;

/** Save watch progress every N seconds */
export const PROGRESS_SAVE_INTERVAL_MS = 30_000;

/** Show next-episode overlay at this completion percentage */
export const NEXT_EPISODE_TRIGGER_PERCENTAGE = 90;

/** Next-episode countdown in seconds */
export const NEXT_EPISODE_COUNTDOWN_SECONDS = 10;

/** Resume prompt — ignore positions less than this (e.g. first 5 seconds) */
export const RESUME_MIN_POSITION_SECONDS = 5;

/** Resume prompt — ignore if > 95% complete (treat as "watched") */
export const RESUME_MAX_PERCENTAGE = 95;

/** Double-tap seek zone width as fraction of player width */
export const DOUBLE_TAP_ZONE_FRACTION = 0.3;

/** IMA SDK URL */
export const IMA_SDK_URL =
  'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

/** Quality label for Auto */
export const QUALITY_AUTO_LABEL = 'Auto';

/** Send player heartbeat every N milliseconds */
export const HEARTBEAT_INTERVAL_MS = 1_000;

/** Mid-roll ad polling interval in milliseconds */
export const AD_POLL_INTERVAL_MS = 500;
