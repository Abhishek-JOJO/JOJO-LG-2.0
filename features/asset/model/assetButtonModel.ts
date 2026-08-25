import { ASSET_CATEGORY_CODE } from "@/features/content/model/types";
import { JOJOButton } from "@/components/ui/JOJOButton";
import type { ContentAsset } from "@/features/content/model/types";

export interface AssetButtonConfigOptions {
  asset: ContentAsset | null | undefined;
  isOverseas: boolean;
  isSubscribed: boolean;
  isTvodPurchased: boolean;
  pricing: any;
  isPricingLoading: boolean;
  isVerifyLoading: boolean;
  progress?: number;
  isCompleted?: boolean;
}

export interface AssetButtonConfig {
  text: string;
  appearance: any; 
  showIcon: boolean;
  disabled?: boolean;
}

export const getAssetButtonConfig = ({
  asset,
  isOverseas,
  isSubscribed,
  isTvodPurchased,
  pricing,
  isPricingLoading,
  isVerifyLoading,
  progress,
  isCompleted,
}: AssetButtonConfigOptions): AssetButtonConfig => {
  // 1. Normalize Category Code robustly across all raw API response shapes
  const categoryCode =
    asset?.assetCategoryCode ??
    (asset as any)?.asset_category ??
    (asset as any)?.asset_category_code ??
    (asset as any)?.assetCategory ??
    (asset as any)?.asset_catagory_type;

  const isSVODAsset =
    categoryCode === ASSET_CATEGORY_CODE.SVOD ||
    categoryCode === 2 ||
    categoryCode === '2' ||
    (typeof categoryCode === 'string' && categoryCode.toUpperCase() === 'SVOD');

  const isTVODAsset =
    categoryCode === ASSET_CATEGORY_CODE.TVOD ||
    categoryCode === 3 ||
    categoryCode === '3' ||
    (typeof categoryCode === 'string' && categoryCode.toUpperCase() === 'TVOD');

  if (isVerifyLoading && (isSVODAsset || isOverseas)) {
    return { text: "Loading...", appearance: JOJOButton.Appearance.GOLD, showIcon: false, disabled: true };
  }

  // 2. Strict Entitlement Check: User must have active access to watch this asset
  const canPlay = isTVODAsset
    ? isTvodPurchased
    : isSVODAsset
    ? isSubscribed
    : isOverseas
    ? isSubscribed
    : true; // Free / AVOD / FVOD content in India

  // 3. Resume Logic: ONLY shown if user is entitled to play this asset
  const hasProgress = typeof progress === "number" && progress > 0;
  const notCompleted = isCompleted === false || isCompleted === undefined;

  if (canPlay && hasProgress && notCompleted) {
    const appearance = (isSVODAsset || isTVODAsset || isSubscribed) 
      ? JOJOButton.Appearance.GOLD 
      : JOJOButton.Appearance.DEFAULT;
    return { text: "Resume", appearance, showIcon: true };
  }

  // 2. TVOD LOGIC (Priority check before general overseas logic)
  if (isTVODAsset) {
    // Already purchased TVOD asset
    if (isTvodPurchased) {
      return { text: "Play", appearance: JOJOButton.Appearance.GOLD, showIcon: true };
    }

    // Rent pricing (works for both India and Overseas TVOD assets)
    let rentText = "Rent Now";
    if (isPricingLoading) {
      rentText = "Loading...";
    } else if (pricing?.price) {
      rentText = `Rent Now ${pricing.currencySymbol || ""}${pricing.price}`;
    }
    return { 
      text: rentText, 
      appearance: JOJOButton.Appearance.GOLD, 
      showIcon: false, 
      disabled: isPricingLoading 
    };
  }

  // 3. SVOD LOGIC
  if (isSVODAsset) {
    if (isSubscribed) {
      return { text: "Watch Now", appearance: JOJOButton.Appearance.GOLD, showIcon: true };
    } else {
      return { text: "Subscribe to Watch", appearance: JOJOButton.Appearance.GOLD, showIcon: false };
    }
  }

  // 4. OVERSEAS LOGIC (for non-TVOD, non-SVOD assets)
  // Note: Free content (AVOD/FVOD) is converted to SVOD by useAsset hook for overseas users
  if (isOverseas) {
    if (isSubscribed) {
      return { text: "Watch Now", appearance: JOJOButton.Appearance.GOLD, showIcon: true };
    }
    return { text: "Subscribe to Watch", appearance: JOJOButton.Appearance.GOLD, showIcon: false };
  }

  // Free / AVOD asset
  return { text: "Play", appearance: JOJOButton.Appearance.DEFAULT, showIcon: true };
};