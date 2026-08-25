"use client";

import React, { useState } from 'react';
import type { AudioTrack } from '../model/types';

interface AudioSelectorProps {
  tracks: AudioTrack[];
  activeTrackId: number;
  onSelect: (trackId: number) => void;
}

export function AudioSelector({
  tracks,
  activeTrackId,
  onSelect,
}: AudioSelectorProps) {
  const [open, setOpen] = useState(false);

  if (tracks.length <= 1) return null;

  const active = tracks.find((t) => t.id === activeTrackId) ?? tracks[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-theme_1 text-xs px-2 py-1 rounded hover:bg-theme_1/10 transition-colors"
        aria-label="Audio language"
        aria-expanded={open}
      >
        {active?.label ?? 'Audio'}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-theme_1/10 rounded-lg overflow-hidden min-w-[120px] z-50">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => {
                onSelect(track.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${track.id === activeTrackId
                  ? 'text-theme_13_samecolour bg-theme_1/10'
                  : 'text-theme_1 hover:bg-theme_1/10'
                }`}
            >
              {track.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
