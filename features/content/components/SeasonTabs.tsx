"use client";

/**
 * SeasonTabs
 * Purely presentational tab bar for season selection.
 */

import React from 'react';
import type { Season } from '../model/types';

interface SeasonTabsProps {
  seasons: Season[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function SeasonTabs({ seasons, activeIndex, onChange }: SeasonTabsProps) {
  if (seasons.length <= 1) return null;

  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
      {seasons.map((season, index) => (
        <button
          key={season.assetId}
          onClick={() => onChange(index)}
          className={`
            shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150
            ${index === activeIndex
              ? 'bg-theme_13_samecolour text-theme_1'
              : 'bg-theme_1/10 text-theme_1/70 hover:bg-theme_1/20 hover:text-theme_1'
            }
          `}
        >
          {season.title}
        </button>
      ))}
    </div>
  );
}
