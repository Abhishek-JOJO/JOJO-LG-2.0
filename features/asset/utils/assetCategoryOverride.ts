/**
 * Asset Category Override Utility
 * 
 * Implements overseas business rules for asset access:
 * - AVOD (free with ads) → SVOD (subscription required)
 * - FVOD (free on-demand) → SVOD (subscription required)
 * - LVOD (live free) → SVOD (subscription required)
 * - TVOD stays TVOD (but requires SVOD subscription to rent)
 * - SVOD stays SVOD
 * 
 * @see oversea.md Section 3.1
 */

import { ASSET_CATEGORY_CODE } from '@/features/content/model/types';
import { logger } from '@/lib/logger/logger';

interface AssetCategoryOverrideOptions {
  assetId: string;
  originalCategoryCode: number;
  isOverseas: boolean;
  assetTitle?: string;
}

interface AssetCategoryOverrideResult {
  categoryCode: number;
  wasOverridden: boolean;
  reason: string | null;
}

/**
 * Apply overseas category override rules
 */
export function applyAssetCategoryOverride({
  assetId,
  originalCategoryCode,
  isOverseas,
  assetTitle = 'Unknown',
}: AssetCategoryOverrideOptions): AssetCategoryOverrideResult {
  // No override needed for India users
  if (!isOverseas) {
    return {
      categoryCode: originalCategoryCode,
      wasOverridden: false,
      reason: null,
    };
  }

  // Don't override SVOD or TVOD
  if (
    originalCategoryCode === ASSET_CATEGORY_CODE.SVOD ||
    originalCategoryCode === ASSET_CATEGORY_CODE.TVOD
  ) {
    return {
      categoryCode: originalCategoryCode,
      wasOverridden: false,
      reason: null,
    };
  }

  // Override free content (AVOD, FVOD, LVOD) to SVOD
  const isFreeContent =
    originalCategoryCode === ASSET_CATEGORY_CODE.AVOD ||
    originalCategoryCode === ASSET_CATEGORY_CODE.FVOD ||
    originalCategoryCode === ASSET_CATEGORY_CODE.LVOD;

  if (isFreeContent) {
    const categoryName = {
      [ASSET_CATEGORY_CODE.AVOD]: 'AVOD',
      [ASSET_CATEGORY_CODE.FVOD]: 'FVOD',
      [ASSET_CATEGORY_CODE.LVOD]: 'LVOD',
    }[originalCategoryCode] || 'Unknown';

    logger.info('[AssetCategoryOverride] Overriding category for overseas user', {
      assetId,
      assetTitle,
      original: categoryName,
      overridden: 'SVOD',
    });

    return {
      categoryCode: ASSET_CATEGORY_CODE.SVOD,
      wasOverridden: true,
      reason: `${categoryName} content requires subscription for overseas users`,
    };
  }

  // Unknown category — don't override
  return {
    categoryCode: originalCategoryCode,
    wasOverridden: false,
    reason: null,
  };
}
