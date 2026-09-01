"use client";

import { ReactNode, useEffect, useState } from "react";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { fetchConfig, setAppConfig } from "@lib/config/app.config";
import { env } from "@lib/config/env";
import { fetchGeoData } from "@lib/geo/geo.service";
import { getCachedGeo, setCachedGeo } from "@lib/geo/geo.cache";
import { logger } from "@lib/logger/logger";
import { BootstrapContext } from "./BootstrapContext";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@store/useAuthStore";
import { guestLogin } from "@/features/auth/api/guestLogin";
import { isPublicRoute, isGuestAllowedRoute } from "@lib/constants/routes";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import { StorageKey } from "@enums/storage.enum";

interface BootstrapProviderProps {
  children: ReactNode;
}

type BootstrapState = "loading" | "ready" | "error";

export function BootstrapProvider({ children }: BootstrapProviderProps) {
  const t = useTranslations("bootstrap");
  const [state, setState] = useState<BootstrapState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch - only show loading UI after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        logger.info("[Bootstrap] Starting...");

        // STEP 1: Fetch config
        logger.info("[Bootstrap] Fetching config...");
        const config = await fetchConfig();

        if (cancelled) {
          logger.info("[Bootstrap] Cancelled (cleanup)");
          return;
        }

        // Store config in memory
        setAppConfig(config);

        logger.info("[Bootstrap] Config loaded", {
          apiBaseUrl: config.apiBaseUrl,
          envType: config.envType,
          publicIp: config.publicIp
        });

        // STEP 1.5: Guest Session Initialization
        const { token, setGuestAuth } = useAuthStore.getState();
        const storedUser = localStorageManager.get<{ isGuest?: boolean }>(StorageKey.USER);
        const isExistingGuest = storedUser?.isGuest === true;

        // Call guestLogin() when:
        //   a) There is no token at all (fresh browser / cleared storage), OR
        //   b) The stored token belongs to a guest user — guest tokens expire
        //      server-side so we always refresh them on bootstrap to avoid
        //      sending an expired guest token that results in a 403/404.
        const needsGuestSession = !token || isExistingGuest;

        if (needsGuestSession) {
          const pathname = window.location.pathname;
          // Do not initialize guest session on auth routes (login, register, landing)
          const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/landing';

          // Only initialize guest session on non-auth routes that are allowed for guests.
          const isGuestRoute = isGuestAllowedRoute(pathname);
          const isPublic = isPublicRoute(pathname);

          if (!isAuthRoute && (isGuestRoute || isPublic)) {
            logger.info("[Bootstrap] No valid session found, initiating guest session...", { hadToken: !!token, isExistingGuest });
            try {
              const response = await guestLogin({ data: "data" });
              const sessionId = response?.data?.session_id || response?.data?.data?.session_id;
              if (sessionId) {
                setGuestAuth(sessionId, sessionId);
                logger.info("[Bootstrap] Guest session initialized");
              } else {
                logger.warn("[Bootstrap] Guest login returned no session ID");
              }
            } catch (guestErr) {
              logger.error("[Bootstrap] Guest session failed", guestErr);
            }
          } else {
            logger.info("[Bootstrap] Skipping guest session initialization (auth route or protected non-guest route)");
          }
        } else {
          logger.info("[Bootstrap] Existing authenticated session found, skipping guest login");
        }

        // STEP 2: Geo with cache check
        const publicIp = config.publicIp || '';

        // Check cache
        const cachedGeo = getCachedGeo(publicIp);

        if (cachedGeo) {
          // Use cached geo
          logger.info("[Bootstrap] Using cached geo data");
        } else {
          // Fetch fresh geo data
          logger.info("[Bootstrap] Fetching fresh geo data...");

          try {
            const { geoData, isAvailable } = await fetchGeoData(publicIp);

            if (cancelled) return;

            // Cache the result
            setCachedGeo(geoData, publicIp, isAvailable);

            logger.info("[Bootstrap] Geo data fetched and cached", {
              country: geoData.country_code,
              isAvailable
            });
          } catch (geoError) {
            // Geo failure should NOT block app
            logger.warn("[Bootstrap] Geo fetch failed, using fallback", {
              error: geoError instanceof Error ? geoError.message : 'Unknown'
            });
          }
        }

        // STEP 3: Set app ready
        if (cancelled) return;

        setIsAppReady(true);
        setState("ready");

        logger.info("[Bootstrap] App ready");

      } catch (err) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : "Unknown error";
        logger.error("[Bootstrap] Failed, applying fallback bootstrap...", { error: message });

        setAppConfig({
          apiBaseUrl: env.fallbackApiBaseUrl || "https://api.superott.in",
          socketUrl: "wss://socket.superott.in",
          envType: env.fallbackEnvType || "stage",
          analyticUrl: "",
        });

        setIsAppReady(true);
        setState("ready");
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // During SSR and initial render, render children immediately to prevent hydration mismatch
  if (!isMounted) {
    return (
      <BootstrapContext.Provider value={{ isAppReady: false }}>
        {children}
      </BootstrapContext.Provider>
    );
  }

  // Loading state (only shown after mount)
  // if (state === "loading") {
  //   return (
  //     <div className="fixed inset-0 flex items-center justify-center bg-background">
  //       <div className="text-center">
  //         <div className="mb-4">
  //           <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
  //         </div>
  //         <p className="text-lg font-medium">Loading configuration...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Error state
  if (state === "error") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold text-red-600">
            {t("error_title")}
          </h1>
          <p className="mb-4 text-gray-600">
            {t("error_desc")}
          </p>
          {error && (
            <p className="mb-4 text-sm text-gray-500">
              Error: {error}
            </p>
          )}
          <JOJOCustomButton
            size={JOJOButton.Size.M}
            state={JOJOButton.State.ACTIVE}
            onClick={() => window.location.reload()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {t("retry")}
          </JOJOCustomButton>
        </div>
      </div>
    );
  }

  // Ready state - provide context
  return (
    <BootstrapContext.Provider value={{ isAppReady }}>
      {children}
    </BootstrapContext.Provider>
  );
}
