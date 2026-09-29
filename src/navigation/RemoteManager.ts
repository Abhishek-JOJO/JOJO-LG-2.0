'use client';

import { useEffect } from 'react';
import { normalizePathname } from '@/lib/utils/pathname';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAssetDetailStore } from '@/features/asset/store/useAssetDetailStore';
import { useExitConfirmStore } from '@/store/useExitConfirmStore';
import { useNavStore } from '@/store/useNavStore';
import { tvSoundManager } from '@/src/platform/audio/tvSoundManager';
import { getRemoteAction, getTVPlatformAdapter, shouldHandleRemoteEvent } from '@/src/platform';
import { doesFocusableExist, getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { tvNavigate } from './tvNavigate';
import { ROUTES } from '@/lib/constants/routes';
import { useTvOverlayStore } from '@/store/useTvOverlayStore';
import { stepTVVerticalNavigation } from './focusUtils';

/**
 * Initializes the single app-level remote listener. Native LG/Samsung key
 * values are normalized before the existing navigation policy runs.
 * Used at the root level of the app (e.g., in a Provider).
 *
 */
export const useRemoteManager = () => {
  useEffect(() => {
    const platform = getTVPlatformAdapter();
    platform.initialize();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Primes the shared TV UI sound AudioContext on the very first remote
      // keypress of the session — the earliest reliable user gesture app-wide,
      // and where webOS TV's ~500ms Web Audio warm-up should happen (silently),
      // not on the user's first actual select sound. No-ops after the first call.
      tvSoundManager.init();

      // If a component (e.g. modal or video player) already handled & prevented the key, do not override
      if (!shouldHandleRemoteEvent(e)) return;

      const action = getRemoteAction(e);

      if (action === 'BACK' && useTvOverlayStore.getState().screen) {
        e.preventDefault();
        useTvOverlayStore.getState().close();
        return;
      }

      switch (action) {
        case 'BACK':
          const currentPathForBack = typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : '';
          // A full-screen overlay (search, asset detail, the exit-confirm popup
          // itself) owns the Back key while it's open — its own listener closes
          // it. Registered later than this one, so without this check we'd
          // navigate/exit/reopen out from under it before that listener ever runs.
          if (
            usePlayerStore.getState().isSearchOpen ||
            useAssetDetailStore.getState().isOpen ||
            useExitConfirmStore.getState().isOpen ||
            (typeof document !== 'undefined' && (
              !!document.querySelector('[data-focuskey="profile-dropdown-boundary"]') ||
              !!document.querySelector('[role="dialog"]')
            ))
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
          // On the home browse page, Back first returns focus to the Home nav
          // item. A second Back from that Home item opens the exit confirmation.
          if (currentPathForBack === '/') {
            const currentFocusKey = getCurrentFocusKey();
            if (currentFocusKey !== 'nav-link-0' && doesFocusableExist('nav-link-0')) {
              setFocus('nav-link-0');
              return;
            }
            useExitConfirmStore.getState().open();
            return;
          }

          // On non-browse roots, ask for confirmation before minimizing the
          // app (platform convention) — otherwise go back in history.
          if (currentPathForBack === '/landing' || currentPathForBack === '/login') {
            useExitConfirmStore.getState().open();
          } else if (currentPathForBack.includes('/login/otp') || currentPathForBack.endsWith('/otp')) {
            tvNavigate(ROUTES.LOGIN, null);
          } else {
            window.history.back();
          }
          break;
        case 'PLAY':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('tv-media-play'));
          break;
        case 'PAUSE':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('tv-media-pause'));
          break;
        case 'PLAY_PAUSE':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('tv-media-play-pause'));
          break;
        case 'STOP':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('tv-media-stop'));
          break;
        case 'FAST_FORWARD':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('tv-media-ff'));
          break;
        case 'REWIND':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('tv-media-rw'));
          break;
        case 'INFO':
        case 'BLUE':
          // Toggles the on-screen debug overlay (components/debug/DebugOverlay.tsx)
          document.dispatchEvent(new CustomEvent('tv-debug-toggle'));
          break;
        case 'CHANNEL_UP':
        case 'PAGE_UP': {
          const currentPath = typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : '';
          const isWatch = currentPath === '/watch' || currentPath.startsWith('/watch/');
          if (isWatch) return;

          e.preventDefault();
          stepTVVerticalNavigation('up');
          break;
        }
        case 'CHANNEL_DOWN':
        case 'PAGE_DOWN': {
          const currentPath = typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : '';
          const isWatch = currentPath === '/watch' || currentPath.startsWith('/watch/');
          if (isWatch) return;

          e.preventDefault();
          stepTVVerticalNavigation('down');
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        document.dispatchEvent(new CustomEvent('tv-app-background'));
        document.dispatchEvent(new CustomEvent('tv-media-pause'));
      } else {
        document.dispatchEvent(new CustomEvent('tv-app-foreground'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      platform.destroy();
    };
  }, []);
};
