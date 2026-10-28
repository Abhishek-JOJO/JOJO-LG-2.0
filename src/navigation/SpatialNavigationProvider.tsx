'use client';

import React from 'react';
import { init, FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useRemoteManager } from './RemoteManager';
import { useRemotePointer } from './PointerManager';
import { isTizen } from '@/src/platform/detectPlatform';

// Initialize spatial navigation once (only on client side).
// Debug mode (verbose console logs + on-screen focusable bounding boxes) is
// gated behind the same flag as the on-TV DebugOverlay HUD (toggled with the
// remote's INFO key — see RemoteManager.ts). It's read here at module-eval
// time because `init()` only applies visualDebug once, at startup — so
// toggling it takes effect on the next app reload, not instantly.
if (typeof window !== 'undefined') {
  let debugEnabled = false;
  try {
    debugEnabled = localStorage.getItem('jojo_debug_overlay') === '1';
  } catch {
    // ignore — localStorage unavailable
  }

  // Samsung remotes repeat-fire a held arrow faster than a Tizen TV can
  // render a step (each spotlight step swaps a whole row's images). Unthrottled,
  // the extra repeats queue up and focus keeps moving after the key is
  // released. With throttleKeypresses false, every keyup resets the throttle,
  // so separate taps are never delayed — only held-key repeats are capped.
  const isTizenRuntime = isTizen();

  init({
    debug: debugEnabled,
    visualDebug: debugEnabled,
    throttle: isTizenRuntime ? 120 : 0,
    throttleKeypresses: false,
  });
}

export const SpatialNavigationProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize the platform adapter and normalized TV remote listener.
  useRemoteManager();
  // Bridge the Magic Remote pointer/cursor into spatial navigation focus
  useRemotePointer();

  const { ref, focusKey } = useFocusable({
    focusable: true,
    saveLastFocusedChild: false,
    trackChildren: true,
    autoRestoreFocus: true,
    isFocusBoundary: false,
    focusKey: 'ROOT_FOCUS_KEY'
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="w-full h-full flex flex-col flex-1 outline-none">
        {children}
      </div>
    </FocusContext.Provider>
  );
};
