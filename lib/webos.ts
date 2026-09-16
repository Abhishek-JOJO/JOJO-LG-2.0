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
      platformBack?: () => void;
      close?: () => void;
      deactivate?: () => void;
    };
  }
}

export const isWebOS = (): boolean => {
  // PalmSystem is injected natively by webOS's Web App Manager for every packaged
  // app — window.webOS is a separate, higher-level convenience SDK that has to be
  // loaded explicitly (see public/webOSTV.js) and isn't guaranteed to exist even on
  // real hardware. Checking PalmSystem is the reliable "are we actually on webOS"
  // signal; window.webOS is kept in the check too since some code paths only need
  // its own methods and shouldn't regress if it's ever genuinely absent.
  return typeof window !== 'undefined' && (window.PalmSystem !== undefined || window.webOS !== undefined);
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
 *
 * This app's appinfo.json sets `disableBackHistoryAPI: true`, which tells webOS's
 * Web App Manager to hand it ALL Back-key handling with no automatic fallback —
 * so if this call is ever a no-op, Back does nothing at all on the root page,
 * with no OS-level safety net to fall back on.
 *
 * PalmSystem.platformBack() — the method this used to call, and the one widely
 * documented for this exact purpose — is a genuinely real, callable function on
 * this device (confirmed directly on-device), but calling it produces no
 * observable effect at all: no error, but document.visibilityState/hasFocus
 * never change and the app never actually backgrounds. Whatever it's meant to
 * do on other webOS versions, it's a silent no-op on this hardware/firmware.
 * PalmSystem.deactivate() was verified directly on-device instead: calling it
 * flips document.visibilityState to "hidden" and hasFocus() to false — the app
 * is genuinely backgrounded — and relaunching brings back the exact same running
 * process (same devtools target), confirming it's a clean minimize, not a crash
 * or restart. That's the primary method now, with platformBack/close kept as
 * fallbacks for devices/firmware where deactivate itself isn't present.
 */
export const exitWebOSApp = (): void => {
  if (isWebOS()) {
    try {
      if (window.PalmSystem?.deactivate) {
        window.PalmSystem.deactivate();
      } else if (window.PalmSystem?.platformBack) {
        window.PalmSystem.platformBack();
      } else if (window.PalmSystem?.close) {
        window.PalmSystem.close();
      } else {
        window.webOS?.platformBack?.();
      }
    } catch (e) {
      console.warn('Failed to minimize webOS app', e);
    }
  } else {
    console.log('[Dev] Simulated webOS deactivate');
  }
};
