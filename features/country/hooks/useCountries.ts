/**
 * Country Hooks
 * TanStack Query hooks for country data with smart caching
 * 
 * Caching Strategy:
 * 1. Check if cached data exists in localStorage
 * 2. Get backend timestamp from config API
 * 3. Compare cached timestamp with backend timestamp
 * 4. If timestamps match, use cached data (no API call)
 * 5. If timestamps differ or no cache, fetch fresh data and update cache
 * 6. Cache is cleared when user clears browser data
 */

import { useQuery } from "@tanstack/react-query";
import { logger } from "@/lib/logger/logger";
import { getAppConfig } from "@/lib/config/app.config";
import { getCountries } from "../api/getCountries";
import { mapCountriesResponse } from "../model/mapper";
import { CountryCacheService } from "../services/countryCache";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import type { ApiResponse, Country } from "../model/types";

/**
 * Hook to fetch and cache country list with timestamp validation
 * 
 * Features:
 * - Smart caching with timestamp validation
 * - Only fetches when backend data changes
 * - Survives page refreshes
 * - Automatically clears when user clears browser data
 */
export function useCountries() {
  const { isAppReady } = useBootstrap();

  return useQuery({
    queryKey: ['countries'],
    enabled: isAppReady,
    queryFn: async (): Promise<Country[]> => {
      try {
        // Get backend timestamp from config
        const config = getAppConfig();
        const backendTimestamp = config.apiUpdates?.find(u => u.name === 'country-list')?.timestamp || null;
        
        logger.info('[Countries] Starting fetch with smart caching', {
          backendTimestamp,
          hasConfig: !!config,
          apiUpdatesCount: config.apiUpdates?.length || 0
        });

        // Log cache statistics
        const cacheStats = CountryCacheService.getStats();
        logger.info('[Countries] Cache statistics', cacheStats);

        // Check if cache is valid
        const isCacheValid = CountryCacheService.isValid(backendTimestamp);

        if (isCacheValid) {
          // Use cached data - no API call needed
          const cachedData = CountryCacheService.get();
          if (cachedData && cachedData.length > 0) {
            logger.info('[Countries] ✅ Using cached data (no API call)', {
              count: cachedData.length,
              timestamp: backendTimestamp,
              sample: cachedData.slice(0, 3).map(c => c.country_name)
            });
            return cachedData;
          }
        }

        // Cache invalid or missing - fetch fresh data
        logger.info('[Countries] 🌐 Fetching fresh data from API', {
          reason: !cacheStats.hasCachedData 
            ? 'No cached data' 
            : !cacheStats.hasCachedTimestamp 
            ? 'No cached timestamp' 
            : 'Timestamp mismatch',
          cachedTimestamp: cacheStats.cachedTimestamp,
          backendTimestamp
        });

        const response = await getCountries() as ApiResponse<any>;
        logger.info('[Countries] Raw API response received', { 
          hasData: !!response.data,
          dataType: Array.isArray(response.data) ? 'array' : typeof response.data
        });

        const mapped = mapCountriesResponse(response);
        logger.info('[Countries] Mapped countries', { 
          count: mapped.length, 
          sample: mapped.slice(0, 3).map(c => c.country_name)
        });

        // Save to cache with timestamp
        if (backendTimestamp && mapped.length > 0) {
          CountryCacheService.set(mapped, backendTimestamp);
          logger.info('[Countries] ✅ Saved to cache', {
            count: mapped.length,
            timestamp: backendTimestamp
          });
        } else {
          logger.warn('[Countries] ⚠️ Not caching data', {
            hasTimestamp: !!backendTimestamp,
            hasData: mapped.length > 0
          });
        }

        return mapped;
      } catch (error) {
        logger.error('[Countries] ❌ Error fetching countries', {
          message: error instanceof Error ? error.message : String(error),
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...(error as any)
          } : error
        });
        
        // Try to use cached data as fallback even if timestamp doesn't match
        const cachedData = CountryCacheService.get();
        if (cachedData && cachedData.length > 0) {
          logger.warn('[Countries] Using stale cached data as fallback', {
            count: cachedData.length
          });
          return cachedData;
        }
        
        throw error;
      }
    },
    staleTime: Infinity, // Cache forever in React Query
    gcTime: Infinity, // Keep in cache forever
    retry: 2, // Retry failed requests
    retryDelay: 1000, // Wait 1s between retries
  });
}
