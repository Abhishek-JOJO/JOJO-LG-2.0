'use client';

import React, { useEffect } from 'react';
import { init, FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useRemoteManager } from './RemoteManager';
import { useRemotePointer } from './PointerManager';

// Initialize spatial navigation once (only on client side)
if (typeof window !== 'undefined') {
  init({
    debug: false,
    visualDebug: false,
  });
}

export const SpatialNavigationProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize remote key listeners (including webOS keys)
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
