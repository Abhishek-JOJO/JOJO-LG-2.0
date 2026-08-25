/**
 * SDK Registry
 * 
 * Prevents multiple SDK initializations
 * Tracks which SDKs have been initialized
 */

type SDKName = 'google' | 'facebook' | 'apple';

// Track initialized SDKs
const initializedSDKs = new Set<SDKName>();

/**
 * Check if an SDK has been initialized
 * 
 * @param sdk - SDK name
 * @returns true if SDK is initialized
 */
export function isInitialized(sdk: SDKName): boolean {
  return initializedSDKs.has(sdk);
}

/**
 * Mark an SDK as initialized
 * 
 * @param sdk - SDK name
 */
export function markInitialized(sdk: SDKName): void {
  initializedSDKs.add(sdk);
}

/**
 * Reset SDK initialization state (useful for testing)
 * 
 * @param sdk - SDK name (optional, resets all if not provided)
 */
export function resetInitialization(sdk?: SDKName): void {
  if (sdk) {
    initializedSDKs.delete(sdk);
  } else {
    initializedSDKs.clear();
  }
}

/**
 * Get all initialized SDKs
 * 
 * @returns Array of initialized SDK names
 */
export function getInitializedSDKs(): SDKName[] {
  return Array.from(initializedSDKs);
}
