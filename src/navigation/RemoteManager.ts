'use client';

import { useEffect } from 'react';
import { exitWebOSApp } from '@/lib/webos';

// LG webOS Remote Key Codes
export const WEBOS_KEYS = {
  BACK: 461,
  PLAY: 415,
  PAUSE: 19,
  STOP: 413,
  FF: 417,
  RW: 412,
  INFO: 457,
};

/**
 * Initializes global remote listeners and maps webOS keys.
 * Used at the root level of the app (e.g., in a Provider).
 *
 * Unlike Tizen, webOS does not require explicit key registration —
 * back/media keys fire as normal keydown events by default.
 */
export const useRemoteManager = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Map webOS specific keys to actions
      switch (e.keyCode) {
        case WEBOS_KEYS.BACK:
          e.preventDefault();
          // If we're on the root page, minimize the app (platform convention),
          // otherwise go back in history
          if (window.location.pathname === '/' || window.location.pathname === '/landing') {
            exitWebOSApp();
          } else {
            window.history.back();
          }
          break;
        case WEBOS_KEYS.PLAY:
          document.dispatchEvent(new CustomEvent('tv-media-play'));
          break;
        case WEBOS_KEYS.PAUSE:
          document.dispatchEvent(new CustomEvent('tv-media-pause'));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};
