/**
 * useOverseasDetection Hook
 * 
 * Centralized overseas user detection with caching and error handling.
 * Returns country code, overseas status, and geo availability.
 * 
 * Features:
 * - Memoized to prevent unnecessary re-computations
 * - Always returns valid country code (never null)
 * - Logs detection for debugging
 * - Type-safe return values
 */

import { useMemo } from 'react';
import { useGeoAvailability } from './useGeoAvailability';
import { logger } from '@/lib/logger/logger';
import { appConfig } from '@/lib/config/app.config';

export interface OverseasDetectionResult {
  countryCode: string;
  isOverseas: boolean;
  isIndia: boolean;
  isAvailable: boolean;
  countryName: string | null;
}

export function useOverseasDetection(): OverseasDetectionResult {
  const { countryCode: rawCountryCode, isAvailable, countryName } = useGeoAvailability();

  const result = useMemo(() => {
    // Always ensure we have a valid country code
    const countryCode = rawCountryCode || appConfig.GEO_DEFAULT_COUNTRY_CODE || 'IN';
    const isIndia = countryCode === 'IN';
    const isOverseas = !isIndia;

    // Log detection for debugging (dev only)
    if (process.env.NODE_ENV === 'development') {
      logger.info('[useOverseasDetection] Detection result', {
        countryCode,
        isOverseas,
        isIndia,
        isAvailable,
        countryName,
      });
    }

    return {
      countryCode,
      isOverseas,
      isIndia,
      isAvailable,
      countryName,
    };
  }, [rawCountryCode, isAvailable, countryName]);

  return result;
}
