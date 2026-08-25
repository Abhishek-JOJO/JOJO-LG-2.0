'use client';

import { useEffect } from 'react';
import { setFocus, doesFocusableExist } from '@noriginmedia/norigin-spatial-navigation';

/**
 * Bridges the LG Magic Remote's pointer (air-mouse) mode into spatial navigation.
 *
 * webOS TVs fire a native `cursorStateChange` event on `document` whenever the
 * Magic Remote pointer appears (user tilts/shakes the remote) or disappears
 * (user presses a D-pad/OK button). We mirror pointer hover onto the spatial
 * nav focus engine so the two input modes never fall out of sync — whichever
 * card the cursor was last over is exactly where D-pad navigation resumes from.
 *
 * `cursorStateChange` also gates the hover listener: spatial nav's own
 * `scrollIntoView()` calls move content under a stationary cursor, which
 * fires phantom `mouseover` events in real browsers. Without the gate, those
 * phantom events would fight D-pad input by re-focusing whatever now sits
 * under the (untouched) cursor. We only trust hover once webOS confirms the
 * pointer is actually visible/active; on desktop (no webOS) the gate is
 * left open so mouse hover still works for local testing.
 */
export const useRemotePointer = () => {
  useEffect(() => {
    let lastFocusKey: string | null = null;
    let pointerVisible = true;
    let hasCursorStateSupport = false;

    const handlePointerHover = (e: MouseEvent) => {
      if (hasCursorStateSupport && !pointerVisible) return;

      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-focuskey]');
      const focusKey = target?.getAttribute('data-focuskey');
      if (!focusKey || focusKey === lastFocusKey) return;
      if (!doesFocusableExist(focusKey)) return;

      lastFocusKey = focusKey;
      setFocus(focusKey);
    };

    const handleCursorStateChange = (e: Event) => {
      hasCursorStateSupport = true;
      pointerVisible = Boolean((e as CustomEvent<{ visibility: boolean }>).detail?.visibility);
    };

    document.addEventListener('mouseover', handlePointerHover);
    document.addEventListener('cursorStateChange', handleCursorStateChange);

    return () => {
      document.removeEventListener('mouseover', handlePointerHover);
      document.removeEventListener('cursorStateChange', handleCursorStateChange);
    };
  }, []);
};
