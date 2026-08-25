/**
 * Script Loader Utility
 * 
 * Loads external scripts with caching to prevent duplicate loads
 * SSR-safe and handles errors properly
 */

// Cache to track loaded scripts
const scriptCache = new Map<string, Promise<void>>();

/**
 * Load an external script
 * 
 * @param src - Script URL
 * @returns Promise that resolves when script is loaded
 */
export function loadScript(src: string): Promise<void> {
  // SSR safety check
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadScript can only be called in browser environment'));
  }

  // Return cached promise if script is already loading/loaded
  if (scriptCache.has(src)) {
    return scriptCache.get(src)!;
  }

  // Create new promise for this script
  const promise = new Promise<void>((resolve, reject) => {
    // Check if script already exists in DOM
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    // Create and inject script
    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      // Remove from cache on error so it can be retried
      scriptCache.delete(src);
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });

  // Cache the promise
  scriptCache.set(src, promise);

  return promise;
}

/**
 * Check if a script is already loaded
 * 
 * @param src - Script URL
 * @returns true if script is loaded or loading
 */
export function isScriptLoaded(src: string): boolean {
  return scriptCache.has(src);
}

/**
 * Clear script cache (useful for testing)
 */
export function clearScriptCache(): void {
  scriptCache.clear();
}
