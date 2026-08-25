"use client";

/**
 * Player Context
 *
 * Provides player instance references to child components without prop drilling.
 * Scoped to a single player — does NOT replace Zustand store.
 */

import React, { createContext, useContext, type RefObject } from 'react';
import type { PlayerEngine } from '../engine/PlayerEngine';
import type { PlayerFeatureFlags, VideoDetails } from '../model/types';

interface PlayerContextValue {
  /** Ref to the underlying <video> element */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** The player engine instance */
  engine: PlayerEngine | null;
  /** Current video metadata */
  video: VideoDetails | null;
  /** Feature flags for this player instance */
  flags: PlayerFeatureFlags;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerContextProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PlayerContextValue;
}) {
  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error(
      'usePlayerContext must be used within a PlayerContextProvider'
    );
  }
  return ctx;
}
