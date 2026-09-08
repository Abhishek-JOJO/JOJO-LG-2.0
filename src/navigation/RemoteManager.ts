'use client';

import { useEffect } from 'react';
import { normalizePathname } from '@/lib/utils/pathname';
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
      // If a component (e.g. modal or video player) already handled & prevented the key, do not override
      if (e.defaultPrevented) return;

      // Map webOS specific keys to actions
      switch (e.keyCode) {
        case WEBOS_KEYS.BACK:
          e.preventDefault();
          // If we're on the root page, minimize the app (platform convention),
          // otherwise go back in history
          const currentPath = normalizePathname(window.location.pathname);
          if (currentPath === '/' || currentPath === '/landing') {
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
        case WEBOS_KEYS.STOP:
          document.dispatchEvent(new CustomEvent('tv-media-stop'));
          break;
        case WEBOS_KEYS.FF:
          document.dispatchEvent(new CustomEvent('tv-media-ff'));
          break;
        case WEBOS_KEYS.RW:
          document.dispatchEvent(new CustomEvent('tv-media-rw'));
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
