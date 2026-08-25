/**
 * Utility wrapper for Tizen APIs to safely use them in Next.js
 * Since `tizen` is only available on the Samsung TV runtime, we must guard it.
 */

declare global {
  interface Window {
    tizen?: any;
    webapis?: any;
  }
}

export const isTizen = (): boolean => {
  return typeof window !== 'undefined' && window.tizen !== undefined;
};

export const getTizenDeviceID = (): string | null => {
  if (isTizen()) {
    try {
      return window.tizen.systeminfo.getPropertyValue('DUID');
    } catch (e) {
      console.warn('Failed to get Tizen DUID', e);
    }
  }
  return null;
};

export const exitTizenApp = (): void => {
  if (isTizen()) {
    try {
      window.tizen.application.getCurrentApplication().exit();
    } catch (e) {
      console.warn('Failed to exit Tizen app', e);
    }
  } else {
    console.log('[Dev] Simulated Tizen Exit App');
  }
};

export const registerTizenKey = (keyName: string): void => {
  if (isTizen()) {
    try {
      window.tizen.tvinputdevice.registerKey(keyName);
    } catch (e) {
      console.warn(`Failed to register Tizen key: ${keyName}`, e);
    }
  }
};
