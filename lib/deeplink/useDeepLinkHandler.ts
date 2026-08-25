import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { pairDevice } from "@/lib/api/pair";
import { deepLinkManager, DeepLinkPayload, AdAttribution } from "./deepLinkManager";
import { AttributionManager } from "./attributionManager";
import { logger } from "@lib/logger/logger";
import { analyticsService } from "@/shared/analytics";
import { commonEvents } from "@/shared/analytics/events/common.events";
import { ROUTES } from "@/lib/constants/routes";
import { guestLogin } from "@/features/auth/api/guestLogin";

import { cleanProperties } from "@/shared/analytics/utils/cleanProperties";

export function useDeepLinkHandler(isAppReady: boolean) {
  const router = useRouter();
  const sessionId = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setGuestAuth = useAuthStore((state) => state.setGuestAuth);
  const selectedProfile = useProfileStore((state) => state.selectedProfile);

  const [pendingAsset, setPendingAsset] = useState<DeepLinkPayload | null>(null);
  const [showMismatchPopup, setShowMismatchPopup] = useState(false);

  // Helper to execute asset sharing redirect
  const handleAssetRedirect = (assetPayload: DeepLinkPayload) => {
    const targetUrl = deepLinkManager.getAssetUrl(assetPayload);
    logger.info("[DeepLink] Redirecting to shared asset", { targetUrl });
    if (typeof window !== "undefined") {
      window.location.replace(targetUrl);
    } else {
      router.push(targetUrl);
    }
  };

  // Web Opened tracking effect (Guest_web_open vs User_web_opened — rate-limited to once per day)
  useEffect(() => {
    if (typeof window === "undefined" || !isAppReady) return;

    try {
      const bootParams = new URLSearchParams(window.location.search);
      const adAttribution = deepLinkManager.getAdAttribution(bootParams);

      const {
        ad_id,
        ad_type,
        ad_placement,
        campaign_id,
        campaign_name,
        cta_type,
        ...filteredProperties
      } = {
        ...adAttribution,
        ...AttributionManager.getSessionParams(),
        ...AttributionManager.getAdClickParams(),
      } as any;

      const cleanedProperties = cleanProperties(filteredProperties);
      const isGuestUser = !sessionId || (user?.isGuest ?? false);
      analyticsService.trackWebOpened(cleanedProperties, isGuestUser);
      logger.info("[Analytics] Web opened event checked", { isGuest: isGuestUser, eventProperties: cleanedProperties });
    } catch (e) {
      logger.error("[Analytics] Failed to track web opened event", e);
    }
  }, [isAppReady, sessionId, user?.isGuest]);

  // Deep Link Handling Effect (UTM capture + sharing redirect + Gold redirect)
  useEffect(() => {
    if (typeof window === "undefined" || !isAppReady) return;

    // 1. Capture UTM/Ad Attribution parameters
    const bootParams = new URLSearchParams(window.location.search);
    const adAttribution = deepLinkManager.getAdAttribution(bootParams);
    const hasAdAttribution = deepLinkManager.hasAttribution(adAttribution);

    if (hasAdAttribution) {
      if (bootParams.get("ad_id") || bootParams.get("target_screen")) {
        AttributionManager.captureAdClick(bootParams);
      } else {
        AttributionManager.capture(bootParams);
      }
    }

    // 2. Extract and Process encrypted data payload
    const dataParam = bootParams.get("data");
    if (!dataParam) return;

    const payload = deepLinkManager.parseDeeplink(dataParam);
    if (!payload) {
      logger.warn("[DeepLink] Failed to parse deep link payload, clearing parameters");
      router.replace(window.location.pathname);
      return;
    }

    logger.info("[DeepLink] Parsed deep link payload", payload);

    // Track deeplink arrival event with all UTM and data params
    try {
      const fullDeeplinkUrl = window.location.href;
      analyticsService.track(commonEvents.deeplinkWiseCome({
        deeplink_url: fullDeeplinkUrl,
        data_param: dataParam,
        utm_source:   bootParams.get("utm_source")   || undefined,
        utm_medium:   bootParams.get("utm_medium")   || undefined,
        utm_campaign: bootParams.get("utm_campaign") || undefined,
        utm_content:  bootParams.get("utm_content")  || undefined,
        source:       bootParams.get("source")       || undefined,
      }));
      logger.info("[DeepLink] deeplink_wise_come event fired");
    } catch (e) {
      logger.error("[DeepLink] Failed to fire deeplink_wise_come event", e);
    }

    // Flow A: TV/QR Pairing Link
    if (payload.qr_code) {
      localStorage.setItem("qr_code_pending", payload.qr_code);
      logger.info("[DeepLink] Stashed QR code, clearing URL parameters");
      router.replace(window.location.pathname);
      return;
    }

    // Flow B: Gold Subscription Redirect
    if (payload.redirectionType === "goldSubscription" || payload.type === "goldSubscription") {
      if (sessionId) {
        window.location.replace(ROUTES.SUBSCRIPTION);
      } else {
        window.location.replace(ROUTES.LOGIN);
      }
      return;
    }

    // Flow C: Asset Sharing Link
    if (payload.path) {
      const currentUserId = user?.id;
      const isGuestUser = user?.isGuest ?? false;

      // 1. Mismatch check for registered users
      if (payload.userId && currentUserId && payload.userId !== currentUserId && !isGuestUser) {
        setPendingAsset(payload);
        setShowMismatchPopup(true);
        return;
      }

      // 2. If no session, perform guest login first
      if (!sessionId) {
        logger.info("[DeepLink] No session for deep link, performing auto guest login...");
        guestLogin({ data: "data" })
          .then((response) => {
            const newSessionId = response?.data?.session_id || response?.data?.data?.session_id;
            if (newSessionId) {
              const guestId = `guest_${Date.now()}`;
              setGuestAuth(newSessionId, guestId);
              logger.info("[DeepLink] Guest session initialized automatically for deep link");
              
              // Now that we have a guest session, redirect directly to the asset
              const targetUrl = deepLinkManager.getAssetUrl(payload);
              logger.info("[DeepLink] Redirecting guest directly to deep link asset", { targetUrl });
              if (typeof window !== "undefined") {
                window.location.replace(targetUrl);
              } else {
                router.push(targetUrl);
              }
            } else {
              logger.warn("[DeepLink] Guest login failed to return session ID, redirecting to login");
              router.replace(ROUTES.LOGIN);
            }
          })
          .catch((err) => {
            logger.error("[DeepLink] Guest login failed", err);
            router.replace(ROUTES.LOGIN);
          });
        return;
      }

      // 3. Session exists - redirect to asset if guest or profile is selected
      if (selectedProfile || isGuestUser) {
        handleAssetRedirect(payload);
      } else {
        logger.info("[DeepLink] Stashing deep link asset for post-auth/post-profile redirect");
        localStorage.setItem("deepLinkAsset", JSON.stringify(payload));
        router.replace(ROUTES.WATCHING);
      }
    }
  }, [isAppReady]);

  // TV Pairing Background Effect
  useEffect(() => {
    if (!isAppReady) return;

    const processQrCode = async () => {
      const qrCode = localStorage.getItem("qr_code_pending");
      const alreadyProcessed = sessionStorage.getItem("qr_code_processed") === "1";
      if (!qrCode || alreadyProcessed) return;

      try {
        logger.info("[DeepLink] Process pending QR Code pairing", { qrCode });
        const res = await pairDevice(qrCode, sessionId ?? undefined);
        const d = res.data?.data;
        if (d?.session_id && d?.user_id) {
          setAuth(
            {
              id: d.user_id,
              phone: d.phone || "",
              isGuest: false,
              createdAt: new Date().toISOString(),
            },
            d.session_id,
            ""
          );
          sessionStorage.setItem("qr_code_processed", "1");
          logger.info("[DeepLink] TV Pairing successful. Redirecting to profile selection.");
          router.replace(ROUTES.WATCHING);
        }
      } catch (err) {
        logger.error("[DeepLink] TV pairing failed", err);
      }
    };

    processQrCode();
  }, [sessionId, isAppReady]);

  const confirmMismatch = () => {
    if (!pendingAsset) return;
    setShowMismatchPopup(false);
    if (sessionId && selectedProfile) {
      handleAssetRedirect(pendingAsset);
    } else {
      localStorage.setItem("deepLinkAsset", JSON.stringify(pendingAsset));
      if (sessionId) {
        router.replace(ROUTES.WATCHING);
      }
    }
    setPendingAsset(null);
  };

  const cancelMismatch = () => {
    setShowMismatchPopup(false);
    setPendingAsset(null);
  };

  return {
    showMismatchPopup,
    pendingAsset,
    confirmMismatch,
    cancelMismatch,
  };
}
export { deepLinkManager };
export type { DeepLinkPayload, AdAttribution };
