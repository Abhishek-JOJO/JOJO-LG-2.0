/**
 * Country Cache Service
 * Manages localStorage caching for country list with timestamp validation
 *
 * Cache Strategy:
 * - Store country list with backend timestamp
 * - Compare backend timestamp with cached timestamp to detect stale data
 * - When backend timestamp is unavailable, fall back to a 24-hour TTL
 *   (prevents a fetch storm on every page load)
 * - Migrate legacy caches (without cachedAt) transparently
 * - Clear cache when user clears browser data
 */

import { StorageKey } from "@/enums/storage.enum";
import { logger } from "@/lib/logger/logger";
import type { Country } from "../model/types";

/** 24-hour TTL used when the backend provides no timestamp */
const FALLBACK_TTL_MS = 24 * 60 * 60 * 1000;

export class CountryCacheService {
  /**
   * Check if cached data is valid by comparing timestamps
   * @param backendTimestamp - Timestamp from backend config API
   * @returns true if cache is valid and up-to-date
   */
  static isValid(backendTimestamp: string | null): boolean {
    try {
      // Check if data exists first
      const cachedData = this.get();
      if (!cachedData || cachedData.length === 0) {
        logger.info("[CountryCache] No cached data found, cache invalid");
        return false;
      }

      if (!backendTimestamp) {
        // ── Fallback: no backend timestamp → use 24-hour TTL ─────────────
        // This prevents a fetch storm on every page load when the config API
        // doesn't include a country-list timestamp.
        const cachedAt = this.getCachedAt();
        if (!cachedAt) {
          logger.warn("[CountryCache] No backend timestamp and no cachedAt – cache invalid");
          return false;
        }
        const age = Date.now() - cachedAt;
        const isWithinTtl = age < FALLBACK_TTL_MS;
        logger.info(`[CountryCache] No backend timestamp – TTL check: ${Math.floor(age / 60000)}m old, TTL=${FALLBACK_TTL_MS / 60000}m → ${isWithinTtl ? 'valid' : 'expired'}`);
        return isWithinTtl;
      }

      // ── Normal path: compare backend timestamp with cached timestamp ────
      const cachedTimestamp = this.getTimestamp();
      if (!cachedTimestamp) {
        logger.info("[CountryCache] No cached timestamp found, cache invalid");
        return false;
      }

      const isValid = cachedTimestamp === backendTimestamp;
      logger.info(
        isValid ? "[CountryCache] Cache is valid" : "[CountryCache] Cache is outdated",
        { cachedTimestamp, backendTimestamp, cachedCount: cachedData.length }
      );
      return isValid;
    } catch (error) {
      logger.error("[CountryCache] Error validating cache", { error });
      return false;
    }
  }

  /**
   * Get cached country list
   * @returns Array of countries or null if not cached
   */
  static get(): Country[] | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      const cached = localStorage.getItem(StorageKey.COUNTRY_LIST_DATA);
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached) as Country[];
      logger.info("[CountryCache] Retrieved from cache", { count: parsed.length });
      return parsed;
    } catch (error) {
      logger.error("[CountryCache] Error reading cache", { error });
      return null;
    }
  }

  /**
   * Get cached timestamp
   * @returns Timestamp string or null if not cached
   */
  static getTimestamp(): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(StorageKey.COUNTRY_LIST_TIMESTAMP);
    } catch (error) {
      logger.error("[CountryCache] Error reading timestamp", { error });
      return null;
    }
  }

  /**
   * Get the Unix timestamp (ms) at which the cache was last written.
   * Used for TTL-based validation when no backend timestamp is available.
   * Supports legacy caches that pre-date this field (returns null → invalid).
   */
  static getCachedAt(): number | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(StorageKey.COUNTRY_LIST_TIMESTAMP + '_cached_at');
      if (!raw) return null;
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? null : parsed;
    } catch (error) {
      logger.error("[CountryCache] Error reading cachedAt", { error });
      return null;
    }
  }

  /**
   * Save country list to cache with timestamp
   * @param countries - Array of countries to cache
   * @param timestamp - Backend timestamp for validation
   */
  /**
   * Save country list to cache.
   * @param countries  Array of countries to cache (required)
   * @param timestamp  Backend timestamp for validation (pass empty string when unavailable)
   */
  static set(countries: Country[], timestamp: string): void {
    try {
      if (typeof window === 'undefined') {
        logger.warn("[CountryCache] Cannot cache in SSR environment");
        return;
      }

      if (!countries || countries.length === 0) {
        logger.warn("[CountryCache] Cannot cache empty country list");
        return;
      }

      // Save data
      localStorage.setItem(StorageKey.COUNTRY_LIST_DATA, JSON.stringify(countries));

      // Always record when the cache was written (used for TTL fallback)
      localStorage.setItem(
        StorageKey.COUNTRY_LIST_TIMESTAMP + '_cached_at',
        String(Date.now())
      );

      // Save backend timestamp only when provided
      if (timestamp) {
        localStorage.setItem(StorageKey.COUNTRY_LIST_TIMESTAMP, timestamp);
      } else {
        logger.warn("[CountryCache] No backend timestamp – 24h TTL fallback will be used");
      }

      logger.info("[CountryCache] Saved to cache", {
        count: countries.length,
        timestamp: timestamp || '(none – TTL fallback)',
        sampleCountries: countries.slice(0, 3).map(c => c.country_name)
      });
    } catch (error) {
      logger.error("[CountryCache] Error saving cache", { error });
    }
  }

  /**
   * Clear cached country list and timestamp
   * Called when user clears browser data or cache becomes invalid
   */
  static clear(): void {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem(StorageKey.COUNTRY_LIST_DATA);
      localStorage.removeItem(StorageKey.COUNTRY_LIST_TIMESTAMP);
      localStorage.removeItem(StorageKey.COUNTRY_LIST_TIMESTAMP + '_cached_at');

      logger.info("[CountryCache] Cache cleared");
    } catch (error) {
      logger.error("[CountryCache] Error clearing cache", { error });
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getStats(): {
    hasCachedData: boolean;
    hasCachedTimestamp: boolean;
    cachedCount: number;
    cachedTimestamp: string | null;
  } {
    const data = this.get();
    const timestamp = this.getTimestamp();

    return {
      hasCachedData: data !== null,
      hasCachedTimestamp: timestamp !== null,
      cachedCount: data?.length || 0,
      cachedTimestamp: timestamp
    };
  }
}
