/**
 * Helper to retrieve the source link URL from properties or localStorage.
 * Handles both plain URL strings and JSON strings correctly.
 */
export function getSourceLink(overrideValue?: string): string {
  if (typeof window === 'undefined') return overrideValue || "";

  let sourceLink = overrideValue || "";
  if (!sourceLink) {
    try {
      const rawCampaign = localStorage.getItem("source_link");
      if (rawCampaign) {
        if (rawCampaign.startsWith("http")) {
          sourceLink = rawCampaign;
        } else {
          const parsed = JSON.parse(rawCampaign);
          sourceLink = parsed.source_link || parsed.link || parsed.redirectUrl || rawCampaign;
        }
      }
    } catch {
      sourceLink = localStorage.getItem("source_link") || "";
    }
  }
  return sourceLink;
}
