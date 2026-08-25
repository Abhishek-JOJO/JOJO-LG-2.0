"use client";

/**
 * EpisodeCard
 * Single episode row — thumbnail, number, title, duration, description.
 */

import React from 'react';
import type { Episode } from '../model/types';

interface EpisodeCardProps {
  episode: Episode;
  isActive?: boolean;
  onClick: (episode: Episode) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
  return `${s}s`;
}

export function EpisodeCard({ episode, isActive = false, onClick }: EpisodeCardProps) {
  return (
    <button
      onClick={() => onClick(episode)}
      className={`
        w-full flex gap-3 items-start p-3 rounded-xl text-left transition-colors duration-150
        ${isActive ? 'bg-theme_1/10 ring-1 ring-theme_13_samecolour' : 'hover:bg-theme_1/5'}
      `}
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-36 h-20 rounded-lg overflow-hidden bg-theme_1/10 relative">
        {episode.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={episode.poster.url}
            alt={episode.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-theme_1/30 text-2xl font-bold">{episode.episodeNumber}</span>
          </div>
        )}

        {/* Active indicator */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="w-8 h-8 rounded-full bg-theme_13_samecolour flex items-center justify-center">
              <svg width="12" height="14" viewBox="0 0 12 14" fill="theme_1">
                <path d="M1 1l10 6-10 6V1z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-theme_1 text-sm font-medium line-clamp-2 leading-tight">
            {episode.episodeNumber}. {episode.title}
          </span>
          {episode.durationSeconds > 0 && (
            <span className="shrink-0 text-theme_1/50 text-xs mt-0.5">
              {formatDuration(episode.durationSeconds)}
            </span>
          )}
        </div>

        {episode.description && (
          <p
            className="text-theme_1/50 text-xs line-clamp-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: episode.description }}
          />
        )}
      </div>
    </button>
  );
}
