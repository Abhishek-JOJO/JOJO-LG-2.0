export class AttributionManager {
  private static readonly Keys = {
    // Install tier — written once, never overwritten
    installSource: "attr_install_utm_source",
    installMedium: "attr_install_utm_medium",
    installCampaign: "attr_install_utm_campaign",
    installContent: "attr_install_utm_content",
    hasInstall: "attr_has_install_attribution",
    // Session tier — updated on every attributed open
    sessionSource: "attr_session_utm_source",
    sessionMedium: "attr_session_utm_medium",
    sessionCampaign: "attr_session_utm_campaign",
  };

  private static readonly AdKeys = {
    adId: "attr_ad_id",
    adType: "attr_ad_type",
    adPlacement: "attr_ad_placement",
    campaignId: "attr_ad_campaign_id",
    campaignName: "attr_ad_campaign_name",
    ctaType: "attr_ad_cta_type",
    targetScreen: "attr_ad_target_screen",
    source: "attr_ad_source",
    utmSource: "attr_ad_utm_source",
    utmMedium: "attr_ad_utm_medium",
    utmCampaign: "attr_ad_utm_campaign",
    utmContent: "attr_ad_utm_content",
  };

  /**
   * Capture UTM and campaign parameters from URL query string.
   * Call this on every attributed app open.
   */
  public static capture(searchParams: URLSearchParams): void {
    if (typeof window === "undefined") return;

    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const utmContent = searchParams.get("utm_content");

    // Only proceed if at least one UTM tag exists
    if (!utmSource && !utmMedium && !utmCampaign && !utmContent) return;

    // Update Session attribution
    if (utmSource) localStorage.setItem(this.Keys.sessionSource, utmSource);
    if (utmMedium) localStorage.setItem(this.Keys.sessionMedium, utmMedium);
    if (utmCampaign) localStorage.setItem(this.Keys.sessionCampaign, utmCampaign);

    // Update Install attribution (once-only)
    const hasInstall = localStorage.getItem(this.Keys.hasInstall) === "true";
    if (!hasInstall) {
      if (utmSource) localStorage.setItem(this.Keys.installSource, utmSource);
      if (utmMedium) localStorage.setItem(this.Keys.installMedium, utmMedium);
      if (utmCampaign) localStorage.setItem(this.Keys.installCampaign, utmCampaign);
      if (utmContent) localStorage.setItem(this.Keys.installContent, utmContent);
      localStorage.setItem(this.Keys.hasInstall, "true");
    }
  }

  /**
   * Capture all params from an in-player ad CTA URL
   */
  public static captureAdClick(searchParams: URLSearchParams): void {
    if (typeof window === "undefined") return;

    const params: Record<string, string> = {};
    const keys = [
      "ad_id", "ad_type", "ad_placement", "campaign_id", "campaign_name",
      "cta_type", "target_screen", "source", "utm_source", "utm_medium",
      "utm_campaign", "utm_content"
    ];

    keys.forEach(k => {
      const val = searchParams.get(k);
      if (val) params[k] = val;
    });

    if (params.ad_id) localStorage.setItem(this.AdKeys.adId, params.ad_id);
    if (params.ad_type) localStorage.setItem(this.AdKeys.adType, params.ad_type);
    if (params.ad_placement) localStorage.setItem(this.AdKeys.adPlacement, params.ad_placement);
    if (params.campaign_id) localStorage.setItem(this.AdKeys.campaignId, params.campaign_id);
    if (params.campaign_name) localStorage.setItem(this.AdKeys.campaignName, params.campaign_name);
    if (params.cta_type) localStorage.setItem(this.AdKeys.ctaType, params.cta_type);
    if (params.target_screen) localStorage.setItem(this.AdKeys.targetScreen, params.target_screen);
    if (params.source) localStorage.setItem(this.AdKeys.source, params.source);
    if (params.utm_source) localStorage.setItem(this.AdKeys.utmSource, params.utm_source);
    if (params.utm_medium) localStorage.setItem(this.AdKeys.utmMedium, params.utm_medium);
    if (params.utm_campaign) localStorage.setItem(this.AdKeys.utmCampaign, params.utm_campaign);
    if (params.utm_content) localStorage.setItem(this.AdKeys.utmContent, params.utm_content);

    // Update session/install if UTM source is present in ad CTA
    if (params.utm_source) {
      localStorage.setItem(this.Keys.sessionSource, params.utm_source);
      if (params.utm_medium) localStorage.setItem(this.Keys.sessionMedium, params.utm_medium);
      if (params.utm_campaign) localStorage.setItem(this.Keys.sessionCampaign, params.utm_campaign);

      const hasInstall = localStorage.getItem(this.Keys.hasInstall) === "true";
      if (!hasInstall) {
        localStorage.setItem(this.Keys.installSource, params.utm_source);
        if (params.utm_medium) localStorage.setItem(this.Keys.installMedium, params.utm_medium);
        if (params.utm_campaign) localStorage.setItem(this.Keys.installCampaign, params.utm_campaign);
        if (params.utm_content) localStorage.setItem(this.Keys.installContent, params.utm_content);
        localStorage.setItem(this.Keys.hasInstall, "true");
      }
    }
  }

  /**
   * Get session UTM parameters
   */
  public static getSessionParams(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const p: Record<string, string> = {};
    const source = localStorage.getItem(this.Keys.sessionSource);
    const medium = localStorage.getItem(this.Keys.sessionMedium);
    const campaign = localStorage.getItem(this.Keys.sessionCampaign);

    if (source) p.utm_source = source;
    if (medium) p.utm_medium = medium;
    if (campaign) p.utm_campaign = campaign;
    return p;
  }

  /**
   * Get install UTM parameters
   */
  public static getInstallParams(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const p: Record<string, string> = {};
    const hasInstall = localStorage.getItem(this.Keys.hasInstall) === "true";
    if (!hasInstall) return p;

    const source = localStorage.getItem(this.Keys.installSource);
    const medium = localStorage.getItem(this.Keys.installMedium);
    const campaign = localStorage.getItem(this.Keys.installCampaign);
    const content = localStorage.getItem(this.Keys.installContent);

    if (source) p.install_utm_source = source;
    if (medium) p.install_utm_medium = medium;
    if (campaign) p.install_utm_campaign = campaign;
    if (content) p.install_utm_content = content;
    return p;
  }

  /**
   * Get ad click params
   */
  public static getAdClickParams(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const p: Record<string, string> = {};
    const keys = [
      ["adId", "ad_id"], ["adType", "ad_type"], ["adPlacement", "ad_placement"],
      ["campaignId", "campaign_id"], ["campaignName", "campaign_name"],
      ["ctaType", "cta_type"], ["source", "source"], ["utmSource", "utm_source"],
      ["utmMedium", "utm_medium"], ["utmCampaign", "utm_campaign"], ["utmContent", "utm_content"]
    ];

    keys.forEach(([keyName, paramName]) => {
      const storageKey = this.AdKeys[keyName as keyof typeof AttributionManager.AdKeys];
      const val = localStorage.getItem(storageKey);
      if (val) p[paramName] = val;
    });

    return p;
  }

  /**
   * Get target screen for ad CTA
   */
  public static getAdTargetScreen(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.AdKeys.targetScreen);
  }

  /**
   * Clear ad click params
   */
  public static clearAdClick(): void {
    if (typeof window === "undefined") return;
    Object.values(this.AdKeys).forEach(k => localStorage.removeItem(k));
  }

  /**
   * Clear session UTM parameters
   */
  public static clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.Keys.sessionSource);
    localStorage.removeItem(this.Keys.sessionMedium);
    localStorage.removeItem(this.Keys.sessionCampaign);
    this.clearAdClick();
  }
}
