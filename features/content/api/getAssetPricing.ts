/**
 * Get Asset Pricing API — POST /v3/subscription/get-one-time-product
 * Returns TVOD pricing and user purchase status.
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';
import type { AssetPricingApiShape } from '../model/types';

export async function getAssetPricing(
  assetId: string,
  countryCode: string,
  sessionId?: string
): Promise<ApiResponse<AssetPricingApiShape>> {
  return apiClient.post<ApiResponse<AssetPricingApiShape>>(
    ApiEndpoint.GET_ASSET_PRICING,
    {
      aAssetIds: [assetId],
      countryCode,
      country: countryCode,
    },
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}
