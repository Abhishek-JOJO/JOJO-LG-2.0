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

        // STEP 1.5: TV Session Validation
        const { token, clearAuth } = useAuthStore.getState();
        const storedUser = localStorageManager.get<{ isGuest?: boolean }>(StorageKey.USER);
        const isExistingGuest = storedUser?.isGuest === true;

        // On TV: We do NOT automatically create guest sessions.
        // Unauthenticated TV users must log in via the Login page (QR code pairing / remote input).
        // If a lingering/stale guest session is found in localStorage, purge it clean.
        if (isExistingGuest) {
          logger.info("[Bootstrap] Lingering guest session detected on TV, clearing auth store");
          clearAuth();
        } else if (!token) {
          logger.info("[Bootstrap] No session found (TV requires user authentication, skipping auto-guest session)");
        } else {
          logger.info("[Bootstrap] Existing authenticated session found, proceeding");
        }

        // STEP 2: Geo — kicked off but NOT awaited. Nothing on the content-browsing
        // path (hero, rails) needs geo data; it's only read later, at actual playback
        // time, by useGeoAvailability() for overseas gating — and that hook already
        // has its own safe default (isAvailable: true) and listens for the
        // `geo-cache-updated` event this dispatches once it resolves, so it picks up
        // the real value reactively whenever it lands. Awaiting it here before
        // app-ready was serializing an entire extra network round trip in front of
        // the hero/rails fetch for data nothing on screen yet needs — that's real,
        // measured time added to every cold launch's skeleton.
        const publicIp = config.publicIp || '';
        const cachedGeo = getCachedGeo(publicIp);

        if (cachedGeo) {
          logger.info("[Bootstrap] Using cached geo data");
        } else {
          logger.info("[Bootstrap] Fetching fresh geo data in background...");
          fetchGeoData(publicIp)
            .then(({ geoData, isAvailable }) => {
              if (cancelled) return;
              setCachedGeo(geoData, publicIp, isAvailable);
              logger.info("[Bootstrap] Geo data fetched and cached", {
                country: geoData.country_code,
                isAvailable
              });
            })
            .catch((geoError) => {
              // Geo failure should NOT block app
              logger.warn("[Bootstrap] Geo fetch failed, using fallback", {
                error: geoError instanceof Error ? geoError.message : 'Unknown'
              });
            });
        }

        // STEP 3: Set app ready — no longer waits on geo.
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
