"use client";

import React, { memo } from 'react';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface ResumePromptProps {
  positionSeconds: number;
  onResume: () => void;
  onStartOver: () => void;
}

export const ResumePrompt = memo(function ResumePrompt({
  positionSeconds,
  onResume,
  onStartOver,
}: ResumePromptProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-black/80 border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 text-center">
        <h3 className="text-white font-semibold text-lg mb-1">
          Continue Watching?
        </h3>
        <p className="text-theme_1/60 text-sm mb-6">
          Resume from{' '}
          <span className="text-theme_1 font-medium">
            {formatTime(positionSeconds)}
          </span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={onResume}
            className="flex-1 py-2.5 bg-theme_13_samecolour text-theme_1 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Resume
          </button>
          <button
            onClick={onStartOver}
            className="flex-1 py-2.5 bg-theme_1/10 text-theme_1 rounded-full text-sm font-medium hover:bg-theme_1/20 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
});
