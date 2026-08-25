/**
 * Bootstrap Context
 * Provides isAppReady state to AppProvider
 */

import { createContext, useContext } from "react";

interface BootstrapContextValue {
  isAppReady: boolean;
}

export const BootstrapContext = createContext<BootstrapContextValue>({
  isAppReady: false,
});

export function useBootstrap() {
  const context = useContext(BootstrapContext);
  if (!context) {
    throw new Error('useBootstrap must be used within BootstrapProvider');
  }
  return context;
}
