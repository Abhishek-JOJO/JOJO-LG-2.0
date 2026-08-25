/**
 * Country Feature Mappers
 * Transform API responses to domain models
 */

import type { ApiResponse, Country } from "./types";

export function mapCountriesResponse(apiResponse: ApiResponse<any>): Country[] {
  const data = apiResponse.data;
  
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.map((item: any) => ({
    country_id: item.country_id || 0,
    country_name: item.country_name || '',
    country_code: item.country_code || '',
    iso3_code: item.iso3_code || '',
    phone_code: item.phone_code || '',
  }));
}
