/**
 * Utility wrapper for LG webOS TV APIs to safely use them in Next.js
 * Since `webOS` is only available on the LG webOS TV runtime, we must guard it.
 * Requires webOSTV.js to be loaded (see app/layout.tsx) — unlike Tizen, webOS
 * does not require explicit registration of remote keys; they fire as normal
 * keydown events out of the box.
 */

declare global {
  interface Window {
    webOS?: {
      platformBack?: () => void;
      deviceInfo?: (callback: (info: Record<string, unknown>) => void) => void;
      fetchAppId?: () => string;
    };
    PalmSystem?: {
      deviceInfo?: string;
    };
  }
}

export const isWebOS = (): boolean => {
  return typeof window !== 'undefined' && window.webOS !== undefined;
};

export const getWebOSDeviceID = (): string | null => {
  if (isWebOS()) {
    try {
      // PalmSystem.deviceInfo is a synchronous JSON string exposed on webOS TVs
      return window.PalmSystem?.deviceInfo ?? null;
    } catch (e) {
      console.warn('Failed to get webOS device info', e);
    }
  }
  return null;
};

/**
 * Sends the app to background using the platform-native back behavior.
 * webOS apps should minimize rather than force-close (unlike Tizen's
 * application.exit()), per LG's app lifecycle guidelines.
 */
export const exitWebOSApp = (): void => {
  if (isWebOS()) {
    try {
      window.webOS?.platformBack?.();
    } catch (e) {
      console.warn('Failed to minimize webOS app', e);
    }
  } else {
    console.log('[Dev] Simulated webOS platformBack');
  }
};
