/**
 * Geo Cache Manager
 * Caches geo-location data with TTL to prevent redundant API calls
 */

import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import { logger } from "@lib/logger/logger";
import type { GeoLocation } from "@features/geo/model/types";

interface GeoCache {
  geoData: GeoLocation;
  ip: string;
  timestamp: number;
  isAvailable: boolean;
}

const GEO_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached geo data if valid
 * Returns null if cache is invalid or expired
 */
export function getCachedGeo(currentIp: string): GeoCache | null {
  const cached = localStorageManager.get<GeoCache>(StorageKey.GEO_CACHE);
  
  if (!cached) {
    logger.info('[Geo Cache] No cache found');
    return null;
  }
  
  // Check if IP changed
  if (cached.ip !== currentIp) {
    logger.info('[Geo Cache] IP changed', { 
      cachedIp: cached.ip, 
      currentIp 
    });
    return null;
  }
  
  // Check if cache expired
  const cacheAge = Date.now() - cached.timestamp;
  if (cacheAge > GEO_CACHE_TTL_MS) {
    logger.info('[Geo Cache] Cache expired', { 
      ageMinutes: Math.floor(cacheAge / 60000) 
    });
    return null;
  }
  
  logger.info('[Geo Cache] Using cached geo data', {
    country: cached.geoData.country_code,
    ageMinutes: Math.floor(cacheAge / 60000)
  });
  
  return cached;
}

/**
 * Save geo data to cache
 */
export function setCachedGeo(
  geoData: GeoLocation,
  ip: string,
  isAvailable: boolean
): void {
  const cache: GeoCache = {
    geoData,
    ip,
    timestamp: Date.now(),
    isAvailable,
  };
  
  localStorageManager.set(StorageKey.GEO_CACHE, cache);
  
  logger.info('[Geo Cache] Geo data cached', {
    country: geoData.country_code,
    ip,
    isAvailable
  });

  // Dispatch custom event to notify components in the same tab
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('geo-cache-updated'));
    logger.info('[Geo Cache] Dispatched geo-cache-updated event');
  }
}

/**
 * Clear geo cache
 */
export function clearGeoCache(): void {
  localStorageManager.remove(StorageKey.GEO_CACHE);
  logger.info('[Geo Cache] Cache cleared');
}
