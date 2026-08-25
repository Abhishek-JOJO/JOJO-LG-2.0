/**
 * Geo Service
 * Business logic for geo-location and availability
 */

import { getGeoLocation } from "@features/geo/api/getGeoLocation";
import { checkAvailability } from "@features/geo/api/checkAvailability";
import { mapGeoResponse, mapAvailabilityResponse } from "@features/geo/model/mapper";
import { AppError } from "@lib/error/types";
import { HttpStatus } from "@enums/http.enum";
import { logger } from "@lib/logger/logger";
import type { GeoLocation, ApiResponse } from "@features/geo/model/types";
import { appConfig } from "../config/app.config";

export async function fetchGeoData(publicIp: string): Promise<{
  geoData: GeoLocation;
  isAvailable: boolean;
}> {
  try {
    // Step 1: Fetch geo-location
    const geoResponse = await getGeoLocation(publicIp) as ApiResponse<any>;

    logger.info('[Geo] Geo-location response', {
      hasData: !!geoResponse.data,
      hasMetaData: !!geoResponse.metaData,
      status: geoResponse.metaData?.status
    });

    // Validate response - check metaData status
    if (geoResponse.metaData && geoResponse.metaData.status !== 200) {
      throw new AppError(
        geoResponse.metaData?.message || 'Geo-location fetch failed',
        geoResponse.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // If no data but status is 200, throw error
    if (!geoResponse.data) {
      throw new AppError('No geo-location data received', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const geoData = mapGeoResponse(geoResponse);

    logger.info('[Geo] Mapped geo data', {
      country_code: geoData.country_code,
      city: geoData.city,
      latitude: geoData.latitude,
      longitude: geoData.longitude
    });

    // Step 2: Check availability (only if we have a country code)
    if (!geoData.country_code) {
      logger.warn('[Geo] No country code available, skipping availability check');
      return {
        geoData,
        isAvailable: true, // Default to available
      };
    }

    const availabilityResponse = await checkAvailability(geoData.country_code) as ApiResponse<any>;

    logger.info('[Geo] Availability response', {
      hasData: !!availabilityResponse.data,
      hasMetaData: !!availabilityResponse.metaData,
      status: availabilityResponse.metaData?.status,
      is_overseas: availabilityResponse.data?.is_overseas
    });

    // Validate response - check metaData status
    if (availabilityResponse.metaData && availabilityResponse.metaData.status !== 200) {
      throw new AppError(
        availabilityResponse.metaData?.message || 'Availability check failed',
        availabilityResponse.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // If no data but status is 200, default to available
    if (!availabilityResponse.data) {
      logger.warn('[Geo] No availability data, defaulting to available');
      return {
        geoData,
        isAvailable: true,
      };
    }

    const availability = mapAvailabilityResponse(availabilityResponse);

    logger.info('[Geo] Mapped availability', {
      is_overseas: availabilityResponse.data?.is_overseas,
      available: availability.available,
      logic: availability.available ? 'India mode (integrated)' : 'Overseas mode (separate registration)'
    });

    return {
      geoData,
      isAvailable: availability.available,
    };
  } catch (error) {
    // Log fallback usage
    logger.warn('[Geo] Falling back to default country', {
      error: error instanceof Error ? error.message : 'Unknown',
      publicIp
    });

    // Fallback to default country
    return {
      geoData: {
        country_code: appConfig.GEO_DEFAULT_COUNTRY_CODE,
        country_name: appConfig.GEO_DEFAULT_COUNTRY_NAME,
        city: appConfig.GEO_DEFAULT_CITY,
        region: appConfig.GEO_DEFAULT_REGION,
        latitude: appConfig.GEO_DEFAULT_LATITUDE,
        longitude: appConfig.GEO_DEFAULT_LONGITUDE,
        timezone: appConfig.GEO_DEFAULT_TIMEZONE,
      },
      isAvailable: true,
    };
  }
}
