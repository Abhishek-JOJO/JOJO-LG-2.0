/**
 * useGeoAvailability Hook
 * 
 * Returns geo availability status from cached geo data.
 * This determines if the user's country supports registration flow.
 * 
 * @returns {Object} Geo availability data
 * @returns {boolean} isAvailable - True for India (login handles registration), False for overseas (separate registration page)
 * @returns {string | null} countryCode - User's country code from geo location
 * @returns {string | null} countryName - User's country name
 */

import { StorageKey } from "@/enums/storage.enum";
import { logger } from "@/lib/logger/logger";
import { useState, useEffect } from "react";

interface GeoAvailabilityData {
  isAvailable: boolean;
  countryCode: string | null;
  countryName: string | null;
}

export function useGeoAvailability(): GeoAvailabilityData {
  // Helper function to read geo data from localStorage
  const readGeoFromStorage = (): GeoAvailabilityData => {
    try {
      // Check if we're in the browser before accessing localStorage
      if (typeof window === 'undefined') {
        logger.warn('[useGeoAvailability] Running on server, using defaults (isAvailable: true)');
        return {
          isAvailable: true, // Default to true (India behavior)
          countryCode: null,
          countryName: null,
        };
      }

      // Read from localStorage
      const cachedGeoStr = localStorage.getItem(StorageKey.GEO_CACHE);
      
      if (!cachedGeoStr) {
        logger.warn('[useGeoAvailability] No geo cache found, using defaults (isAvailable: true)');
        return {
          isAvailable: true, // Default to true (India behavior)
          countryCode: null,
          countryName: null,
        };
      }

      const cachedGeo = JSON.parse(cachedGeoStr);
      
      // Check if cache has isAvailable field (new format)
      const hasIsAvailableField = 'isAvailable' in (cachedGeo || {});
      
      if (!hasIsAvailableField) {
        logger.warn('[useGeoAvailability] Old cache format detected (missing isAvailable field)');
      }
      
      // Extract availability and country info
      const isAvailable = cachedGeo?.isAvailable ?? true;
      const countryCode = cachedGeo?.geoData?.country_code ?? null;
      const countryName = cachedGeo?.geoData?.country_name ?? null;

      return {
        isAvailable,
        countryCode,
        countryName,
      };
    } catch (error) {
      logger.error('[useGeoAvailability] Failed to parse geo cache', { error });
      // Return defaults on error
      return {
        isAvailable: true,
        countryCode: null,
        countryName: null,
      };
    }
  };

  // Initialize state by reading from localStorage
  const [geoData, setGeoData] = useState<GeoAvailabilityData>(readGeoFromStorage);

  // Listen for storage changes (when geo data is updated)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only react to changes in GEO_CACHE key
      if (e.key === StorageKey.GEO_CACHE) {
        logger.info('[useGeoAvailability] Detected geo cache update, refreshing state');
        const newGeoData = readGeoFromStorage();
        setGeoData(newGeoData);
        
        logger.info('[useGeoAvailability] State updated', {
          isAvailable: newGeoData.isAvailable,
          countryCode: newGeoData.countryCode,
          countryName: newGeoData.countryName,
        });
      }
    };

    // Listen for storage events (triggered by changes in other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also set up a custom event listener for same-tab updates
    const handleCustomStorageChange = () => {
      logger.info('[useGeoAvailability] Detected custom geo cache update, refreshing state');
      const newGeoData = readGeoFromStorage();
      setGeoData(newGeoData);
      
      logger.info('[useGeoAvailability] State updated', {
        isAvailable: newGeoData.isAvailable,
        countryCode: newGeoData.countryCode,
        countryName: newGeoData.countryName,
      });
    };

    window.addEventListener('geo-cache-updated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('geo-cache-updated', handleCustomStorageChange);
    };
  }, []);

  return geoData;
}
