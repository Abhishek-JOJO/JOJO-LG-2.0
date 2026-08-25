import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";

/**
 * Synchronizes the device ID to cookies so server components (SSR) can read it.
 */
function syncDeviceIdCookie(deviceId: string): void {
  if (typeof document !== "undefined") {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const secureFlag = isLocal ? "" : "secure; ";
    // Persistent cookie (approx 1 year) matching the auth token expiry strategy
    document.cookie = `jojo_device_id=${deviceId}; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
  }
}

/**
 * Generates a unique browser/device ID
 * Stored in localStorage for persistence
 */
export function getBrowserUID(): string {
  // Check if we already have a device ID
  const existingId = localStorageManager.get<string>(StorageKey.DEVICE_ID);
  
  if (existingId) {
    syncDeviceIdCookie(existingId);
    return existingId;
  }

  // Generate new device ID
  const deviceId = generateDeviceId();
  
  // Store for future use
  localStorageManager.set(StorageKey.DEVICE_ID, deviceId);
  syncDeviceIdCookie(deviceId);
  
  return deviceId;
}

/**
 * Generates a unique device ID using browser fingerprint
 */
function generateDeviceId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: Generate UUID v4 manually
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Clears the stored device ID (useful for logout)
 */
export function clearDeviceId(): void {
  localStorageManager.remove(StorageKey.DEVICE_ID);
  if (typeof document !== "undefined") {
    document.cookie = "jojo_device_id=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}
