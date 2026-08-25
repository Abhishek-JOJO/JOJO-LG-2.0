/**
 * Geo Feature Types
 */

import type { ApiResponse } from "@lib/types/api.types";

export type { ApiResponse };

export interface GeoLocation {
  country_code: string;
  country_name: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface Availability {
  available: boolean;
  country_code: string;
}
