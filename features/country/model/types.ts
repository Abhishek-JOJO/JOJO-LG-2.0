/**
 * Country Feature Types
 */

import type { ApiResponse } from "@lib/types/api.types";

export type { ApiResponse };

export interface Country {
  country_id: number;
  country_name: string;
  country_code: string;
  iso3_code: string;
  phone_code: string;
}
