/**
 * Apple Sign-In Provider
 *
 * Redirects to the Node backend's /api/auth/apple endpoint.
 * The Node server builds the Apple OAuth URL with the registered redirect_uri
 * and handles the Apple callback, then redirects back to this Next.js app
 * with the id_token as a query param.
 *
 * Flow:
 *   1. User clicks Apple button
 *   2. Browser → Node server /api/auth/apple
 *   3. Node server → Apple authorize URL (registered redirect_uri on Node server)
 *   4. Apple → Node server /api/auth/apple/callback (POST with code + id_token)
 *   5. Node server → Next.js /auth/apple/callback?id_token=...&state=...
 */

import { StorageKey } from '@/enums/storage.enum';
import { env } from '@/lib/config/env';
import { ensureBrowser } from './baseSocialProvider';
import { logger } from '@/lib/logger/logger';

/**
 * Generate a cryptographically secure state string for CSRF protection.
 */
function generateState(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

/**
 * Initiate Apple Sign-In by opening a popup window.
 * The Node server is already registered with Apple Developer Console.
 */
export function initiateAppleLogin(): Promise<{ token: string; state: string } | { error: string }> {
  // SSR safety
  ensureBrowser('Apple');

  const nodeServerUrl = env.fallbackApiBaseUrl;
  if (!nodeServerUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL (Node server URL) is not configured');
  }

  const state = generateState();

  try {
    localStorage.setItem(StorageKey.APPLE_AUTH_STATE, state);
    // Set flag for overlay
    localStorage.setItem('apple_login_in_progress', 'true');
  } catch {
    logger.warn('[Apple] Could not persist auth state to localStorage');
  }

  return new Promise((resolve, reject) => {
    // Open Apple OAuth in popup window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `${nodeServerUrl}/v3/auth/apple`,
      'AppleSignIn',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      // Clear flag if popup blocked
      try {
        localStorage.removeItem('apple_login_in_progress');
      } catch { }
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Poll for popup closure or message
    const pollInterval = setInterval(() => {
      try {
        // Check if popup is closed
        if (popup.closed) {
          clearInterval(pollInterval);
          // Clear flag when popup closes
          try {
            localStorage.removeItem('apple_login_in_progress');
          } catch { }

          // Check if we received the callback data
          const callbackData = localStorage.getItem('apple_callback_data');
          if (callbackData) {
            try {
              const data = JSON.parse(callbackData);
              localStorage.removeItem('apple_callback_data');
              resolve(data); // Can be { token, state } or { error }
            } catch {
              reject(new Error('Failed to parse Apple callback data'));
            }
          } else {
            reject(new Error('Apple sign-in was cancelled or failed'));
          }
        }
      } catch (e) {
        // Cross-origin errors are expected, ignore them
      }
    }, 500);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (!popup.closed) {
        popup.close();
      }
      // Clear flag on timeout
      try {
        localStorage.removeItem('apple_login_in_progress');
      } catch { }
      reject(new Error('Apple sign-in timeout'));
    }, 300000);
  });
}

/**
 * Validate the state returned by Apple against what we stored.
 */
export function validateAppleState(receivedState: string | null): boolean {
  if (!receivedState) return false;
  try {
    const stored = localStorage.getItem(StorageKey.APPLE_AUTH_STATE);
    if (!stored) return false;
    return receivedState === stored;
  } catch {
    return false;
  }
}

/**
 * Remove the stored state after a successful (or failed) login attempt.
 */
export function clearAppleState(): void {
  try {
    localStorage.removeItem(StorageKey.APPLE_AUTH_STATE);
  } catch {
    // ignore
  }
}
