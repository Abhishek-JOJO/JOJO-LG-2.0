"use client";

import React, { memo } from 'react';
import type { PlayerError } from '../model/types';

interface ErrorScreenProps {
  error: PlayerError;
  onRetry: () => void;
}

export const ErrorScreen = memo(function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 px-6 text-center"
      role="alert"
    >
      <div className="mb-4 text-5xl">⚠️</div>
      <h2 className="text-xl font-semibold text-theme_1 mb-2">Playback Error</h2>
      <p className="text-sm text-theme_1/60 mb-6 max-w-sm">{error.message}</p>
      {error.isRecoverable && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-theme_13_samecolour text-theme_1 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      )}
      <p className="mt-4 text-xs text-theme_1/30">Error code: {error.code}</p>
    </div>
  );
});
