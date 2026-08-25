/**
 * Base Social Provider Utilities
 * 
 * Shared utilities for social login providers to eliminate code duplication
 * Handles common patterns: SSR safety, SDK loading, timeout handling
 */

import { loadScript } from './loadScript';

/**
 * SSR Safety Check
 * Throws error if running on server
 */
export function ensureBrowser(providerName: string): void {
  if (typeof window === 'undefined') {
    throw new Error(`${providerName} login can only be used in browser`);
  }
}

/**
 * Timeout Wrapper
 * Wraps a promise with a timeout
 * 
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message if timeout occurs
 * @returns Promise that rejects on timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Load SDK with error handling
 * 
 * @param sdkUrl - URL of the SDK to load
 * @param sdkName - Name of the SDK (for error messages)
 * @returns Promise that resolves when SDK is loaded
 */
export async function loadSocialSDK(sdkUrl: string, sdkName: string): Promise<void> {
  try {
    await loadScript(sdkUrl);
  } catch (error) {
    throw new Error(`Failed to load ${sdkName} SDK`);
  }
}

/**
 * Check if SDK is available on window
 * 
 * @param sdkCheck - Function that returns true if SDK is available
 * @param sdkName - Name of the SDK (for error messages)
 */
export function ensureSDKAvailable(sdkCheck: () => boolean, sdkName: string): void {
  if (!sdkCheck()) {
    throw new Error(`${sdkName} SDK not available`);
  }
}