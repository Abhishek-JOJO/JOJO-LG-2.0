import { ASSET_CATEGORY_CODE } from "@/features/content/model/types";

/**
 * Robustly maps an unknown API asset category response into a canonical analytics string.
 * Ensures data integrity regardless of whether the backend returns a numeric code (e.g. 1)
 * or a raw string (e.g. "SVOD").
 */
export function mapAnalyticsAssetCategory(category: unknown): string | undefined {
  // 1. If it's already a string, parse it cleanly
  if (typeof category === 'string') {
    const lower = category.toLowerCase().trim();
    if (lower) return lower;
  }

  // 2. If it's a number, map it using the strict content types
  if (typeof category === 'number') {
    switch (category) {
      case ASSET_CATEGORY_CODE.AVOD:
        return 'avod';
      case ASSET_CATEGORY_CODE.SVOD:
        return 'svod';
      case ASSET_CATEGORY_CODE.TVOD:
        return 'tvod';
      case ASSET_CATEGORY_CODE.FVOD:
        return 'fvod';
      case ASSET_CATEGORY_CODE.LVOD:
        return 'lvod';
    }
  }

  // 3. Return undefined for invalid/missing data so callers can handle their own fallbacks
  return undefined;
}
