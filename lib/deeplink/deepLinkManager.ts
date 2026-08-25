import { decrypt } from "@/lib/crypto/decrypt";
import { encrypt } from "@/lib/crypto/encrypt";
import { getAssetTypeSlug, slugify } from "@/features/asset/store/useAssetDetailStore";

export interface DeepLinkPayload {
  path: string;
  type: string;
  nameAnalytic?: string;
  userId?: string;
  qr_code?: string;
  redirectionType?: string;
  sessionId?: string;
}

export interface AdAttribution {
  ad_id: string;
  ad_type: string;
  ad_placement: string;
  campaign_id: string;
  campaign_name: string;
  cta_type: string;
  target_screen: string;
  source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
}

export const deepLinkManager = {
  /**
   * Decrypts and parses a hex deep link payload
   */
  parseDeeplink(encryptedHex: string): DeepLinkPayload | null {
    if (!encryptedHex) return null;
    try {
      const decrypted = decrypt(encryptedHex, true);
      if (!decrypted || (typeof decrypted === "string" && !decrypted.trim())) {
        return null;
      }
      return typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;
    } catch (err) {
      return null;
    }
  },

  /**
   * Encrypts a sharing payload to hex URL format
   */
  generateEncryptedShareUrl(
    path: string,
    type: string,
    nameAnalytic: string,
    userId: string,
    origin: string
  ): string {
    const payload: DeepLinkPayload = {
      path,
      type,
      nameAnalytic,
      userId,
    };
    try {
      const encryptedHex = encrypt(JSON.stringify(payload), true);
      const domain = origin.replace(/https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      return `${origin}/?data=${encryptedHex}&utm_source=web&utm_medium=${domain}&utm_campaign=share`;
    } catch (error) {
      return "";
    }
  },

  /**
   * Standardizes UTM & Campaign attribution query tags
   */
  getAdAttribution(searchParams: URLSearchParams): AdAttribution {
    return {
      ad_id:         searchParams.get("ad_id")         || "",
      ad_type:       searchParams.get("ad_type")       || "",
      ad_placement:  searchParams.get("ad_placement")  || "",
      campaign_id:   searchParams.get("campaign_id")   || "",
      campaign_name: searchParams.get("campaign_name") || "",
      cta_type:      searchParams.get("cta_type")      || "",
      target_screen: searchParams.get("target_screen") || "",
      source:        searchParams.get("source")        || "",
      utm_source:    searchParams.get("utm_source")    || "",
      utm_medium:    searchParams.get("utm_medium")    || "",
      utm_campaign:  searchParams.get("utm_campaign")  || "",
      utm_content:   searchParams.get("utm_content")   || "",
    };
  },

  /**
   * Checks if an attribution payload has at least one active parameter
   */
  hasAttribution(attr: AdAttribution): boolean {
    return Object.values(attr).some((v) => v !== "");
  },

  /**
   * Generates target URL for asset page
   */
  getAssetUrl(payload: DeepLinkPayload): string {
    const typeSlug = getAssetTypeSlug(payload.type);
    const titleSlug = slugify(payload.nameAnalytic || "");
    return titleSlug ? `/${typeSlug}/${titleSlug}/${payload.path}` : `/${typeSlug}/${payload.path}`;
  }
};
