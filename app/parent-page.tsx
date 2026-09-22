"use client"

import { ContentRailsSkeleton } from "@/components/content-rail/ContentRailsSkeleton";
import { ContentRailsView } from "@/features/content-rail/ui/ContentRailsView";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import SubscriptionSuccessPopup from "@/components/payment/SubscriptionSuccessPopup";
import TVODSuccessPopup from "@/components/payment/TVODSuccessPopup";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { localStorageManager } from "@/lib/localStorage/localStorage.manager";
import { StorageKey } from "@/enums/storage.enum";
import { appConfig } from "@/lib/config/app.config";
import { analyticsService, EVENT_NAMES, buildUserSpecificPropertiesPayload } from "@/shared/analytics";

/**
 * Routes where the home page content rails must NOT render.
 * These are routes that navigate away from home (e.g. OTP success → /watching).
 * During the navigation transition Next.js keeps this component briefly mounted,
 * so we guard against firing content-rail API calls when the user is
 * already leaving (or has left) the home page.
 */
const SUPPRESS_HOME_ROUTES = [
    ROUTES.WATCHING,
    ROUTES.REGISTER_OTP,
    ROUTES.LOGIN_OTP,
    ROUTES.REGISTER_CREATE_ACCOUNT,
    ROUTES.ADD_PROFILE,
    ROUTES.AVATAR,
    ROUTES.DOWNLOAD_APP,
    ROUTES.APP_INSTALL
];

import { useActivePathname } from "@/hooks/useActivePathname";
import { useNavStore } from "@/store/useNavStore";
import { getQueryClient } from "@/lib/react-query/queryClient";
import { getContentRails } from "@/features/content-rail/api/getContentRails";
import { useLocaleStore } from "@/store/useLocaleStore";
import NataksClient from "@/app/nataks/nataks-client";

interface ParentPageProps {
  initialRoute?: string;
}

export default function ParentPage({ initialRoute }: ParentPageProps = {}) {
    const pathname = useActivePathname();
    const [hasScrolled, setHasScrolled] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);

    useEffect(() => {
        if (initialRoute) {
            useNavStore.getState().setActiveBrowseTab(initialRoute);
        }
    }, [initialRoute]);

    const { isAppReady } = useBootstrap();
    const sessionId = useAuthStore(state => state.token);
    const [countryCode, setCountryCode] = useState(appConfig.GEO_DEFAULT_COUNTRY_CODE);

    useEffect(() => {
        const geoCache = localStorageManager.get<any>(StorageKey.GEO_CACHE);
        if (geoCache?.geoData?.country_code) {
            setCountryCode(geoCache.geoData.country_code);
        }
    }, []);

    const { data: subData } = useVerifySubscription(countryCode, sessionId, isAppReady);
    const hasTrackedUserSpecificPropsRef = useRef(false);

    useEffect(() => {
        if (!hasTrackedUserSpecificPropsRef.current) {
            const { user, isAuthenticated } = useAuthStore.getState();
            const isGuest = !isAuthenticated || !user || user.isGuest;

            if (!isGuest && subData?.data) {
                hasTrackedUserSpecificPropsRef.current = true;
                const payload = buildUserSpecificPropertiesPayload(subData.data);
                analyticsService.track(EVENT_NAMES.USER_SPECIFIC_PROPERTIES, payload);
            }
        }
    }, [subData]);

    // Check for success checkout data on mount
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem("payment_success_state");
            if (saved) {
                setSuccessData(JSON.parse(saved));
                sessionStorage.removeItem("payment_success_state");
            }
        } catch (e) {
            console.error("Failed to parse payment success state", e);
        }
    }, []);

    // Do not render content rails when the user is on/navigating to
    // a non-home route — this prevents spurious API calls during transitions.
    const isSuppressed = SUPPRESS_HOME_ROUTES.some(
        route => pathname === route || pathname.startsWith(`${route}/`)
    );

    useEffect(() => {
        if (hasScrolled) return;
        const onScroll = () => {
            if (window.scrollY > 10) setHasScrolled(true);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [hasScrolled]);

    // Background pre-warm for remaining tabs (Movies, Shows, Natak) after initial load
    useEffect(() => {
        if (!isAppReady || !sessionId) return;
        const queryClient = getQueryClient();
        const locale = useLocaleStore.getState().locale || "en";
        const navItems = useNavStore.getState().persistedNavItems;
        const subnavIds = (navItems && navItems.length > 0)
            ? navItems.map((n: any) => n.subnav_id).filter(Boolean)
            : [1, 2, 3, 4];

        const timer = setTimeout(() => {
            subnavIds.forEach((subnavId: number) => {
                queryClient.prefetchInfiniteQuery({
                    queryKey: ["contentRails", subnavId, sessionId, locale, 20],
                    queryFn: () => getContentRails(subnavId, 1, sessionId, 20),
                    initialPageParam: 1,
                    staleTime: appConfig.STALE_TIME,
                }).catch(() => {});
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [isAppReady, sessionId]);

    // Completely suppress render when on a non-home route
    if (isSuppressed) {
        return null;
    }

    // We no longer block rendering based on `isAppReady` or `sessionId` here.
    // If the data was prefetched on the server (HydrationBoundary), ContentRailsView
    // will instantly render it. If not, it will natively show its own Skeleton.

    return (
        <div className="min-h-screen" style={{ background: "var(--theme_12)" }}>
            {pathname === ROUTES.NATAK || pathname === "/nataks" ? (
                <NataksClient />
            ) : (
                <ContentRailsView />
            )}
            {successData && (
                successData.matchedType === "TVOD" || successData.paymentType === "TVOD" ? (
                    <TVODSuccessPopup
                        successData={successData}
                        onClose={() => setSuccessData(null)}
                    />
                ) : (
                    <SubscriptionSuccessPopup
                        successData={successData}
                        onClose={() => setSuccessData(null)}
                    />
                )
            )}
        </div>
    );
}