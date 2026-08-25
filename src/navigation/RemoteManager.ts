'use client';

import { useEffect } from 'react';
import { isTizen, registerTizenKey, exitTizenApp } from '@/lib/tizen';

// Tizen specific Key Codes
export const TIZEN_KEYS = {
  RETURN: 10009,
  EXIT: 10182,
  PLAY: 415,
  PAUSE: 19,
  STOP: 413,
  FF: 417,
  RW: 412,
  INFO: 457,
};

/**
 * Initializes global remote listeners and maps Tizen keys.
 * Used at the root level of the app (e.g., in a Provider).
 */
export const useRemoteManager = () => {
  useEffect(() => {
    if (isTizen()) {
      // Register special TV keys so they fire keydown events instead of default TV behavior
      registerTizenKey('Return');
      registerTizenKey('MediaPlay');
      registerTizenKey('MediaPause');
      registerTizenKey('MediaStop');
      registerTizenKey('MediaFastForward');
      registerTizenKey('MediaRewind');
      registerTizenKey('Info');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Map Tizen specific keys to actions
      switch (e.keyCode) {
        case TIZEN_KEYS.RETURN:
          e.preventDefault();
          // We can emit a custom event or check history
          // For now, if we're on the root page we exit, else we go back
          if (window.location.pathname === '/' || window.location.pathname === '/landing') {
            exitTizenApp();
          } else {
            window.history.back();
          }
          break;
        case TIZEN_KEYS.EXIT:
          e.preventDefault();
          exitTizenApp();
          break;
        case TIZEN_KEYS.PLAY:
          // You can dispatch a custom event for the player
          document.dispatchEvent(new CustomEvent('tv-media-play'));
          break;
        case TIZEN_KEYS.PAUSE:
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
