export function cleanProperties(props?: Record<string, any>): Record<string, any> {
  if (!props || typeof props !== "object") return {};
  const cleaned: Record<string, any> = {};
  Object.keys(props).forEach((key) => {
    const val = props[key];
    if (val !== null && val !== undefined && (typeof val !== "string" || val.trim() !== "")) {
      cleaned[key] = val;
    }
  });
  return cleaned;
}

export function getPresentUrlAttribution(): Record<string, string> {
  if (typeof window === "undefined" || !window.location.search) return {};
  const searchParams = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};

  const assetId = searchParams.get("assetId") || searchParams.get("asset_id");
  if (assetId && assetId.trim() !== "") {
    result["asset_id"] = assetId.trim();
  }

  const contentId = searchParams.get("contentId") || searchParams.get("content_id");
  if (contentId && contentId.trim() !== "") {
    result["content_id"] = contentId.trim();
  }

  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "ad_id",
    "ad_type",
    "ad_placement",
    "campaign_id",
    "campaign_name",
    "cta_type",
    "target_screen",
    "source",
  ];
  keys.forEach((key) => {
    const val = searchParams.get(key);
    if (val && val.trim() !== "") {
      result[key] = val.trim();
    }
  });
  return result;
}
