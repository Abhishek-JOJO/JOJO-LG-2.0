/**
 * Geo Feature Mappers
 * Transform API responses to domain models
 */

import type { ApiResponse, GeoLocation, Availability } from "./types";

export function mapGeoResponse(apiResponse: ApiResponse<any>): GeoLocation {
  const data = apiResponse.data;
  
  // Parse lat_long if it's a string like "21.99740028,78.99880028"
  let latitude = 0;
  let longitude = 0;
  
  if (data?.lat_long && typeof data.lat_long === 'string') {
    const [lat, lng] = data.lat_long.split(',').map(Number);
    latitude = lat || 0;
    longitude = lng || 0;
  } else {
    latitude = data?.latitude || 0;
    longitude = data?.longitude || 0;
  }
  
  return {
    country_code: data?.country_code || '',
    country_name: data?.country_name || data?.country_code || '',
    city: data?.city === null ? '' : (data?.city || ''),
    region: data?.region === null ? '' : (data?.region || ''),
    latitude,
    longitude,
    timezone: data?.timezone || '',
  };
}

export function mapAvailabilityResponse(apiResponse: ApiResponse<any>): Availability {
  const data = apiResponse.data;
  
  // API returns:
  // - is_overseas: false → India (login handles registration)
  // - is_overseas: true → Overseas (separate registration page)
  //
  // We map to "available" which means "available for integrated login/registration":
  // - India (is_overseas: false) → available: true (integrated flow)
  // - Overseas (is_overseas: true) → available: false (separate registration)
  const isOverseas = data?.is_overseas ?? false;
  
  return {
    available: !isOverseas, // Invert: NOT overseas = available for integrated flow
    country_code: data?.country_code || '',
  };
}
