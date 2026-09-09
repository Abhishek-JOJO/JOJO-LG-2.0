"use client";

import { ToastContainer } from "@components/feedback/ToastContainer";
import { BootstrapProvider } from "@lib/bootstrap/BootstrapProvider";
import { AppProvider } from "@lib/providers/AppProvider";
import { ReactQueryProvider } from "@lib/react-query/provider";
import { initLocale, useLocaleStore } from "@store/useLocaleStore";
import { initApp } from "@lib/init/initApp";
import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useEffect, useState } from "react";
import { AnalyticsProvider } from "@/shared/analytics";
import { MobileAccessGuard } from "@/components/common/MobileAccessGuard";
import { VersionUpdateBanner } from "@/components/common/VersionUpdateBanner";
import { ProductionSecurityGuard } from "@/components/security/ProductionSecurityGuard";
import { SpatialNavigationProvider } from "@/src/navigation/SpatialNavigationProvider";
import { DebugOverlay } from "@/components/debug/DebugOverlay";

import defaultMessages from "@/messages/en.json";
import guMessages from "@/messages/gu.json";
import { DEFAULT_LOCALE, Locale } from "@/enums/ui.enum";
import { StorageKey } from "@/enums/storage.enum";
import { TIME_ZONE } from "@/lib/utils";

const messagesMap: Record<Locale, Record<string, unknown>> = {
  en: defaultMessages as Record<string, unknown>,
  gu: guMessages as Record<string, unknown>,
};

export function Providers({ children, locale: serverLocale = "en", isMobileServer }: { children: ReactNode; locale?: Locale; isMobileServer?: boolean }) {
  const { locale, messages } = useLocaleStore();

  const [initialLocale] = useState<Locale>(serverLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize app (auth + profile from localStorage)
    initApp();

    // Rehydrate the Zustand store (loads messages + persists to localStorage)
    initLocale().then(() => {
      setIsInitialized(true);
    });
  }, []);

  // Keep html[lang] in sync after mount
  useEffect(() => {
    if (isInitialized) {
      document.documentElement.lang = locale;
    }
  }, [locale, isInitialized]);

  // Before the async initLocale() resolves, use the server-synchronized locale
  // and its pre-bundled messages so the first render matches the server exactly.
  const currentLocale = isInitialized ? locale : initialLocale;
  const currentMessages =
    isInitialized && messages ? messages : (messagesMap[currentLocale] || defaultMessages);

  return (
    <ReactQueryProvider>
      <NextIntlClientProvider locale={currentLocale} messages={currentMessages} timeZone={TIME_ZONE}>

        <BootstrapProvider>
          <AnalyticsProvider>
            <MobileAccessGuard isMobileServer={isMobileServer}>
              <AppProvider>
                <ProductionSecurityGuard>
                  <SpatialNavigationProvider>
                    {children}
                    <ToastContainer />
                    {/* Version update detection — polls /api/version and auto-reloads on mismatch */}
                    <VersionUpdateBanner />
                    {/* On-TV diagnostic HUD — toggle with the remote's INFO key. See components/debug/DebugOverlay.tsx */}
                    <DebugOverlay />
                  </SpatialNavigationProvider>
                </ProductionSecurityGuard>
              </AppProvider>
            </MobileAccessGuard>
          </AnalyticsProvider>
        </BootstrapProvider>
      </NextIntlClientProvider>
    </ReactQueryProvider>
  );
}
