"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/useAuthStore';
import { useLocaleStore } from '@store/useLocaleStore';
import { getAsset } from '../api/getAsset';
import { mapContentAsset } from '../model/mapper';
import { logger } from '@lib/logger/logger';
import { appConfig } from '@/lib/config/app.config';
import { useOverseasDetection } from '@/features/geo/hooks/useOverseasDetection';
import { applyAssetCategoryOverride } from '@/features/asset/utils/assetCategoryOverride';
import { AssetCategoryCode } from '@/features/content/model/types';

import { cookiesManager } from '@/lib/cookies/cookies.manager';

export function useAsset(assetId: string, enabled = true) {
  const clientToken = useAuthStore((state) => state.token);
  const clientLocale = useLocaleStore((state) => state.locale);

  const sessionId = clientToken || cookiesManager.get('jojo_auth_token') || '';
  const locale = clientLocale || cookiesManager.get('jojo_locale') || 'en';
  const { isOverseas } = useOverseasDetection();

  return useQuery({
    queryKey: ['asset', assetId, sessionId, locale],
    queryFn: async () => {
      // Always read the freshest token at call time — the session may have been
      // established (guest bootstrap) just before this queryFn fires.
      const freshToken = useAuthStore.getState().token || cookiesManager.get('jojo_auth_token') || sessionId || undefined;
      logger.info('[useAsset] Fetching', { assetId, locale, hasToken: !!freshToken });
      const response = await getAsset(assetId, freshToken);
      const asset = mapContentAsset(response);
      logger.info('[useAsset] Fetched', { title: asset.title, seasons: asset.seasons.length, locale });

      // Apply overseas category override
      if (isOverseas && asset) {
        const override = applyAssetCategoryOverride({
          assetId: asset.assetId,
          originalCategoryCode: asset.assetCategoryCode,
          isOverseas,
          assetTitle: asset.title,
        });

        if (override.wasOverridden) {
          asset.assetCategoryCode = override.categoryCode as AssetCategoryCode;
          (asset as any).overrideReason = override.reason;
        }
      }

      return asset;
    },
    enabled: !!assetId && enabled,
    staleTime: appConfig.STALE_TIME,
    retry: (failureCount, error: any) => {
      const isSocketError = error?.status === 403 || String(error).includes('socket');
      if (isSocketError) {
        logger.info('[useAsset] Socket connection delay detected. Retrying query...', { failureCount });
        return failureCount < 6;
      }
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1500 * 1.5 ** attempt, 10_000),
  });
}
