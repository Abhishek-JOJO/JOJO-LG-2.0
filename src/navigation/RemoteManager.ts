'use client';

import { useEffect } from 'react';
import { normalizePathname } from '@/lib/utils/pathname';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAssetDetailStore } from '@/features/asset/store/useAssetDetailStore';
import { useExitConfirmStore } from '@/store/useExitConfirmStore';
import { useNavStore } from '@/store/useNavStore';
import { tvSoundManager } from '@/lib/webos/tvSoundManager';

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
      // Primes the shared TV UI sound AudioContext on the very first remote
      // keypress of the session — the earliest reliable user gesture app-wide,
      // and where webOS TV's ~500ms Web Audio warm-up should happen (silently),
      // not on the user's first actual select sound. No-ops after the first call.
      tvSoundManager.init();

      // If a component (e.g. modal or video player) already handled & prevented the key, do not override
      if (e.defaultPrevented) return;

      // Map webOS specific keys to actions
      switch (e.keyCode) {
        case WEBOS_KEYS.BACK:
          const currentPathForBack = typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : '';
          // A full-screen overlay (search, asset detail, the exit-confirm popup
          // itself) owns the Back key while it's open — its own listener closes
          // it. Registered later than this one, so without this check we'd
          // navigate/exit/reopen out from under it before that listener ever runs.
          if (
            usePlayerStore.getState().isSearchOpen ||
            useAssetDetailStore.getState().isOpen ||
            useExitConfirmStore.getState().isOpen ||
            (typeof document !== 'undefined' && !!document.querySelector('[data-focuskey="profile-dropdown-boundary"]'))
          ) {
            return;
          }
          const contentSheet = typeof document !== 'undefined' ? document.getElementById("asset-detail-content-sheet") : null;
          if (contentSheet && contentSheet.getAttribute("data-overlay-open") === "true") {
            return;
          }
          // The video player owns the Back key while it's mounted, same reason
          // as the overlays above — it has its own multi-stage behavior (hide
          // controls first, close an open submenu, THEN leave) and computes
          // exactly where "leave" should go (reopening the show's asset-detail
          // modal). This handler doesn't stopPropagation and stopImmediatePropagation
          // is never called anywhere, so both listeners always fire for the
          // same keypress regardless of which registered first — this bare
          // `window.history.back()` was winning the race almost every time
          // (it's registered at the app root, so it mounts, and therefore
          // fires, before the player's own listener even attaches), landing
          // wherever raw browser history happened to point — usually home —
          // before the player's own intended navigation ever got a chance to
          // run.
          const isWatchPage = currentPathForBack === '/watch' || currentPathForBack.startsWith('/watch/');
          if (isWatchPage) {
            return;
          }
          e.preventDefault();
          const activeBrowseTab = useNavStore.getState().activeBrowseTab;
          if (activeBrowseTab && activeBrowseTab !== '/' && activeBrowseTab !== '/home') {
            useNavStore.getState().setActiveBrowseTab('/');
            window.scrollTo({ top: 0, behavior: 'auto' });
            try {
              window.history.pushState({ browseTab: '/' }, '', '#/');
            } catch (err) {}
            return;
          }
          // If we're on the root page, ask for confirmation before minimizing the
          // app (platform convention) — otherwise go back in history.
          if (currentPathForBack === '/' || currentPathForBack === '/landing' || currentPathForBack === '/login') {
            useExitConfirmStore.getState().open();
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
        case WEBOS_KEYS.INFO:
          // Toggles the on-screen debug overlay (components/debug/DebugOverlay.tsx) —
          // lets us diagnose focus/lag issues directly on the TV without a separate
          // dev machine. Remove this case (and the overlay) once diagnosis is done.
          document.dispatchEvent(new CustomEvent('tv-debug-toggle'));
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
