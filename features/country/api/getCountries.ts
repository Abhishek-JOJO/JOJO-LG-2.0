/**
 * Get Countries API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";

export async function getCountries() {
  return apiClient.get(ApiEndpoint.GET_COUNTRIES, { encrypt: true });
}
