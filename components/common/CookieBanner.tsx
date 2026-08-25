"use client";

import { logger } from "@/lib/logger/logger";
import { cookieConsent } from "@lib/storage/cookieConsent";
import { useConsentStatus } from "@/lib/consent/useConsentStatus";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { JOJOButton, JOJOCustomButton } from "../ui/JOJOButton";

/**
 * CookieBanner
 *
 * Renders the consent dialog based on useConsentStatus().showBanner.
 *
 * showBanner = false when:
 *   - User already accepted  (explicit_accept)
 *   - User already declined  (explicit_decline)
 *   - Geo-bypass is active for the user's country  (geo_bypass)
 *   - Geo not yet resolved   (unknown — wait silently)
 *
 * showBanner = true when:
 *   - Geo resolved, user is NOT bypassed, and no cookie written yet  (pending)
 *
 * To toggle geo-bypass for any country, configure it in bypassJurisdictions inside
 *   lib/consent/consentConfig.ts
 * That's the ONLY change needed — this component self-updates.
 */
export function CookieBanner() {
  const t = useTranslations("cookieBanner");
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch — run consent check only client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Single hook drives everything — no local consent logic here
  const { showBanner, reason } = useConsentStatus();

  useEffect(() => {
    if (mounted) {
      logger.info('[Cookie Banner] Consent status resolved', { showBanner, reason });
    }
  }, [mounted, showBanner, reason]);

  // Don't render until client-side hydration is complete
  if (!mounted) return null;

  // useConsentStatus handles all cases:
  // geo_bypass → showBanner=false → banner hidden for Indian users (when flag is ON)
  // explicit_accept/decline → showBanner=false → no banner for returning users
  // unknown → showBanner=false → wait for geo to resolve
  // pending → showBanner=true → show the banner
  if (!showBanner) return null;

  const handleAccept = () => {
    logger.info('[Cookie Banner] User accepted');
    cookieConsent.accept(); // writes cookie + dispatches cookie-consent-changed
  };

  const handleDecline = () => {
    logger.info('[Cookie Banner] User declined');
    cookieConsent.decline(); // writes cookie + dispatches cookie-consent-changed
  };

  // NOTE: No setVisible(false) needed here.
  // After accept/decline, cookieConsent dispatches cookie-consent-changed →
  // useConsentStatus re-evaluates → showBanner becomes false → component unmounts.

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-9999 flex items-center justify-between gap-5 px-5 py-4 bg-theme_10 backdrop-blur-[10px] border-t border-theme_9 shadow-[0_-4px_20px_var(--theme_12_60)] transition-colors duration-200"
    >
      <span className="text-sm leading-normal text-theme_5">
        {t("message")}
      </span>

      <div className="flex items-center gap-3 shrink-0">
        <JOJOCustomButton
          size={JOJOButton.Size.S}
          state={JOJOButton.State.DEFAULT}
          onClick={handleDecline}
        >
          {t("decline")}
        </JOJOCustomButton>
        <JOJOCustomButton
          size={JOJOButton.Size.S}
          state={JOJOButton.State.ACTIVE}
          onClick={handleAccept}
        >
          {t("accept")}
        </JOJOCustomButton>
      </div>
    </div>
  );
}
