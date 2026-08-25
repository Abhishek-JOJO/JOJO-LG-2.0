"use client";

/**
 * PlayerIcon
 *
 * All icons sourced from /public/player-icons/ SVGs.
 *
 * Usage:
 *   <PlayerIcon name="backward" size={24} />
 */

import React from 'react';
import Image from 'next/image';

export type PlayerIconName =
  | 'play'
  | 'pause'
  | 'backward'
  | 'forward'
  | 'unmute'
  | 'mute'
  | 'captions'
  | 'settings'
  | 'rate'
  | 'episodes'
  | 'next-episode'
  | 'fullscreen'
  | 'exit-fullscreen'
  | 'back-arrow';

interface PlayerIconProps {
  name: PlayerIconName;
  size?: number;
  className?: string;
}

const ICON_FILE_MAP: Record<PlayerIconName, string> = {
  play: 'Component 295.svg',
  pause: 'ic_pause.svg',
  backward: 'ic_backward.svg',
  forward: 'ic_forward.svg',
  unmute: 'ic_unmute.svg',
  mute: 'ic_mute.svg',
  captions: 'ic_captions.svg',
  settings: 'ic_settings.svg',
  rate: 'ic_rate.svg',
  episodes: 'ic_episodes.svg',
  'next-episode': 'ic_next episode.svg',
  fullscreen: 'ic_full screen.svg',
  'exit-fullscreen': 'ic_exit full screen.svg',
  'back-arrow': 'ic_back arrow.svg',
};

export function PlayerIcon({ name, size = 24, className = '' }: PlayerIconProps) {
  const fileName = ICON_FILE_MAP[name];
  if (!fileName) return null;

  return (
    <Image
      src={`/player-icons/${encodeURIComponent(fileName)}`}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: 'auto', height: size }}
      alt=""
      aria-hidden
      draggable={false}
      unoptimized
    />
  );
}
