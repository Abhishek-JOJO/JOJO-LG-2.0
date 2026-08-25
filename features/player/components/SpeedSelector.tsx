"use client";

import React, { useState } from 'react';
import { PLAYBACK_SPEEDS, PLAYBACK_SPEED_LABELS } from '../constants/player.constants';
import type { PlaybackSpeed } from '../model/types';

interface SpeedSelectorProps {
  speed: PlaybackSpeed;
  onSelect: (speed: PlaybackSpeed) => void;
}

export function SpeedSelector({ speed, onSelect }: SpeedSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-theme_1 text-xs px-2 py-1 rounded hover:bg-theme_1/10 transition-colors min-w-[42px]"
        aria-label="Playback speed"
        aria-expanded={open}
      >
        {PLAYBACK_SPEED_LABELS[speed]}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-theme_1/10 rounded-lg overflow-hidden min-w-[90px] z-50">
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${s === speed
                  ? 'text-theme_13_samecolour bg-theme_1/10'
                  : 'text-theme_1 hover:bg-theme_1/10'
                }`}
            >
              {PLAYBACK_SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
