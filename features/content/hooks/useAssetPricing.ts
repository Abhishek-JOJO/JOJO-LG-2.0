"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/useAuthStore';
import { getAssetPricing } from '../api/getAssetPricing';
import { mapAssetPricing } from '../model/mapper';
import { logger } from '@lib/logger/logger';

export function useAssetPricing(
  assetId: string,
  countryCode: string,
  enabled = true
) {
  const sessionId = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['asset-pricing', assetId, countryCode, sessionId],
    queryFn: async () => {
      logger.info('[useAssetPricing] Fetching', { assetId });
      const response = await getAssetPricing(assetId, countryCode, sessionId ?? undefined);
      return mapAssetPricing(response);
    },
    enabled: !!assetId && !!countryCode && !!sessionId && enabled,
    retry: (failureCount, error: any) => {
      const isSocketError = error?.status === 403 || String(error).includes('socket');
      if (isSocketError) {
        return failureCount < 6;
      }
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(1500 * 1.5 ** attempt, 10_000),
  });
}
