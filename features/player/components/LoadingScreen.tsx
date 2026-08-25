"use client";

import React, { memo } from 'react';

interface LoadingScreenProps {
  message?: string;
  isBuffering?: boolean;
}

export const LoadingScreen = memo(function LoadingScreen({ message = 'Loading...', isBuffering = false }: LoadingScreenProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center z-20 transition-all duration-200 ${
        isBuffering ? 'bg-black/30 backdrop-blur-[1px]' : 'bg-black'
      }`}
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative flex items-center justify-center">
        <img
          src="/logos/loader.png"
          alt={message}
          className="w-16 h-16 animate-spin object-contain"
        />
      </div>
    </div>
  );
});
