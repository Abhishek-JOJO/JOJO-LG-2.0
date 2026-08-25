"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/useAuthStore';
import { logger } from '@lib/logger/logger';
import { useGeoAvailability } from '@/features/geo/hooks/useGeoAvailability';
import { appConfig } from '@/lib/config/app.config';
import { checkAssetAccessStatus } from '../api/checkassetAccessStatus';
import { CURRENCY_SYMBOL_MAP } from '@/lib/utils';

export function useBatchAssetAccess(
  assetIds: string[],
  enabled = true
) {
  const sessionId = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const { countryCode } = useGeoAvailability();
  const activeCountry = countryCode || appConfig.GEO_DEFAULT_COUNTRY_CODE;

  // Filter valid IDs and create a stable key
  const validIds = Array.from(new Set(assetIds.map(String).filter(Boolean)));
  const queryKeyStr = validIds.sort().join(',');

  return useQuery({
    queryKey: ['batch-asset-access', queryKeyStr, activeCountry, user?.id],
    queryFn: async () => {
      logger.info('[useBatchAssetAccess] Fetching batch access status', { count: validIds.length, validIds });
      const response = await checkAssetAccessStatus(
        {
          aAssetIds: validIds,
          sCountryCode2: activeCountry,
        },
        sessionId ?? undefined
      );
      return response?.data || response;
    },
    enabled: validIds.length > 0 && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
  });
}

function normalizeAccessItem(item: any) {
  if (!item) return null;
  const isUserPurchased = Boolean(
    item.isUserPurchased ??
    item.bIsUserPurchased ??
    item.isPurchased ??
    item.bIsPurchased ??
    item.purchased ??
    item.hasAccess ??
    false
  );

  const rawPricing = item.oPricing ?? item.pricing ?? item;

  // API returns nAmount (not nPrice) and sCurrencyCode (not sCurrencySymbol) —
  // cover all field name variants used across API versions.
  const price =
    item.price ??
    item.nPrice ??
    rawPricing?.nPrice ??
    rawPricing?.price ??
    rawPricing?.nAmount ??      // ← check-asset-access-status uses nAmount
    item.nAmount ??
    null;

  // Map sCurrencyCode → display symbol; fall back to the symbol field if present.
  const rawCurrencyCode =
    rawPricing?.sCurrencyCode ??
    item.sCurrencyCode ??
    rawPricing?.sCurrency ??
    item.sCurrency ??
    "INR";



  const currencySymbol =
    item.currencySymbol ??
    item.sCurrencySymbol ??
    rawPricing?.sCurrencySymbol ??
    rawPricing?.currencySymbol ??
    CURRENCY_SYMBOL_MAP[rawCurrencyCode] ??   // ← derive symbol from code
    "₹";

  const currency = rawCurrencyCode;

  return {
    ...item,
    isUserPurchased,
    bIsUserPurchased: isUserPurchased,
    price,
    nPrice: price,
    currencySymbol,
    sCurrencySymbol: currencySymbol,
    currency,
    sCurrency: currency,
    oPricing: rawPricing,
  };
}

export function mapBatchAssetAccess(batchData: any, assetId: string | number) {
  if (!batchData) return null;
  const targetId = String(assetId);

  // Format 1: batchData is an object keyed by assetId (e.g. { "1788": { bIsUserPurchased: true } })
  if (typeof batchData === 'object' && !Array.isArray(batchData)) {
    if (batchData[targetId]) {
      return normalizeAccessItem(batchData[targetId]);
    }
    // Check nested array properties if present
    const list = batchData.aAssetAccess || batchData.aAssets || batchData.data || batchData.items || batchData.aOneTimeProducts;
    if (Array.isArray(list)) {
      const found = list.find((x: any) => String(x.sAssetId || x.asset_id || x.assetId || x.id || x.sProductId) === targetId);
      if (found) return normalizeAccessItem(found);
    }
  }

  // Format 2: batchData is an array of access objects
  if (Array.isArray(batchData)) {
    const found = batchData.find((x: any) => String(x.sAssetId || x.asset_id || x.assetId || x.id || x.sProductId) === targetId);
    if (found) return normalizeAccessItem(found);
  }

  return null;
}