import { transformTVODToPaymentPlan } from "@/lib/utils/tvodPaymentTransformer";

/**
 * Builds the standardized plan detail event payload for SVOD and TVOD plan detail page analytics.
 */
export function buildPlanDetailAnalytics(
  asset: any,
  pricing: any,
  user: any,
  planType: "SVOD" | "TVOD"
) {
  const tvodPlan = transformTVODToPaymentPlan(pricing, asset);
  const infoItems = tvodPlan?.oProductTranslation?.aInfoItems || [];
  const validityItem = infoItems.find((x: any) => String(x.sTitle || "").toLowerCase().includes("validity"));
  const watchTimeItem = infoItems.find((x: any) => String(x.sTitle || "").toLowerCase().includes("watch"));

  const rawPrice = tvodPlan?.pricing?.nPrice ?? pricing?.price ?? pricing?.nPrice ?? 0;
  const currencySymbol = tvodPlan?.pricing?.sCurrencySymbol ?? pricing?.currencySymbol ?? "₹";
  const currency = tvodPlan?.pricing?.sCurrency ?? pricing?.currency ?? "INR";
  const formattedPrice = `${currencySymbol}${rawPrice}`;

  const planId = tvodPlan?.sProductId || pricing?.planId || pricing?.id || asset?.assetId || asset?.id || "";
  const planName = tvodPlan?.oProductTranslation?.sName || tvodPlan?.oProductTranslation?.sTitle || pricing?.sName || asset?.title || "";
  const validity = tvodPlan?.nInitialValidityDays || validityItem?.sValue || pricing?.nValidity || pricing?.validity || 30;
  const watchTime = tvodPlan?.nRentalValidityDays ? `${tvodPlan.nRentalValidityDays} days` : (watchTimeItem?.sValue || pricing?.sWatchTime || pricing?.watchTime || "7 days");
  const productId = tvodPlan?.sProductId || pricing?.sProductId || pricing?.productId || "";

  const rawType = asset?.assetType || asset?.type?.name || (asset?.assetTypeCode === 1 ? "movie" : asset?.assetTypeCode === 2 ? "show" : "movie");
  const assetType = String(rawType).toLowerCase();

  const rawCategory = asset?.assetCategory || asset?.assetCategoryType?.name || (asset?.isTVOD ? "tvod" : asset?.isSVOD ? "svod" : "avod");
  const assetCategory = String(rawCategory).toLowerCase();

  return {
    plan_id: planId,
    plan_name: planName,
    plan_price: rawPrice,
    formatted_price: formattedPrice,
    validity: validity,
    watchTime: watchTime,
    user_id: user?.id || user?.userId || "",
    currency: currency,
    platform: "web",
    plan_type: planType,
    product_id: productId,
    asset_id: String(asset?.assetId || asset?.id || asset?.asset_id || ""),
    season_id: String(asset?.parentId || asset?.season_id || asset?.seasonId || ""),
    asset_type: assetType,
    asset_category: assetCategory,
    asset_name: asset?.analytic || asset?.name_analytics || asset?.title || "",
    in_top_10: Boolean(asset?.isInTop10 ?? asset?.isTop10 ?? asset?.isintop10 ?? false),
    number_in_top_10: Number(asset?.numberTop10 ?? asset?.numberintop10 ?? asset?.number_in_top_10 ?? 0),
  };
}
