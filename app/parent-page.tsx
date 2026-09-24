"use client"

import { ContentRailsView } from "@/features/content-rail/ui/ContentRailsView";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, useRef, useMemo } from "react";
import { ROUTES } from "@/lib/constants/routes";
import SubscriptionSuccessPopup from "@/components/payment/SubscriptionSuccessPopup";
import TVODSuccessPopup from "@/components/payment/TVODSuccessPopup";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { localStorageManager } from "@/lib/localStorage/localStorage.manager";
import { StorageKey } from "@/enums/storage.enum";
import { appConfig } from "@/lib/config/app.config";
import { analyticsService, EVENT_NAMES, buildUserSpecificPropertiesPayload } from "@/shared/analytics";
import { useActivePathname, BROWSE_ROUTES } from "@/hooks/useActivePathname";
import { useNavStore } from "@/store/useNavStore";
import { normalizePathname } from "@/lib/utils/pathname";
import { getQueryClient } from "@/lib/react-query/queryClient";
import { getContentRails } from "@/features/content-rail/api/getContentRails";
import { useLocaleStore } from "@/store/useLocaleStore";
import NataksClient from "@/app/nataks/nataks-client";

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
    const persistedNavItems = useNavStore((state) => state.persistedNavItems);

    // ── Navbar tab slide transition (Home / Movies / Shows / Natak …) ──
    // Tab switches don't route-change on TV; they flip activeBrowseTab and the
    // content hard-swaps in one frame. Animate the incoming page sliding in
    // over the old one, like OTT apps.
    //
    // NOTE — enter-only, no mounted exit page: norigin-spatial-navigation
    // stores focusables in ONE global map keyed by focusKey. Mounting a second
    // tree alongside (hero-carousel, spotlight-lead-fixed, rail cards share
    // keys across tabs) overwrites the live page's registrations, and its
    // unmount then deletes them — killing focus on the live page. Production
    // TV apps (Netflix/Hotstar) do the same: only the new screen animates.
    const [prevShownTab, setPrevShownTab] = useState(pathname);
    const [tabDirection, setTabDirection] = useState<1 | -1 | null>(null);

    // Left↔right order of the navbar pills, so the slide direction always
    // matches the remote direction ("/" and "/home" are the same tab).
    const navTabOrder = useMemo(() => {
        const urls = (persistedNavItems || [])
            .map((n) => (n?.url === ROUTES.HOMEPAGE ? ROUTES.HOME : n?.url))
            .filter((u): u is string => typeof u === "string")
            .map((u) => {
                const norm = normalizePathname(u);
                return norm === ROUTES.HOME ? ROUTES.HOMEPAGE : norm;
            })
            .filter((u) => BROWSE_ROUTES.includes(u));
        const unique = Array.from(new Set(urls));
        return unique.length > 1
            ? unique
            : BROWSE_ROUTES.map((u) => (u === ROUTES.HOME ? ROUTES.HOMEPAGE : u));
    }, [persistedNavItems]);

    // Adjust-state-during-render: the very first paint of the new tab must
    // already carry its enter animation — setting this in an effect instead
    // would flash the swapped content for one frame before animating.
    if (prevShownTab !== pathname) {
        setPrevShownTab(pathname);
        const canonical = (p: string) => (p === ROUTES.HOME ? ROUTES.HOMEPAGE : p);
        const fromIdx = navTabOrder.indexOf(canonical(prevShownTab));
        const toIdx = navTabOrder.indexOf(canonical(pathname));
        setTabDirection(
            fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx
                ? (toIdx > fromIdx ? 1 : -1)
                : null
        );
    }

    // Strip the animation class once the slide finishes so the wrapper doesn't
    // keep a transform around (transformed ancestors re-anchor `position:
    // fixed` children like the spotlight lead card away from the viewport).
    useEffect(() => {
        if (tabDirection === null) return;
        const done = setTimeout(() => setTabDirection(null), 420);
        return () => clearTimeout(done);
    }, [tabDirection]);
    const locale = useLocaleStore((state) => state.locale) || "en";
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

    useEffect(() => {
        if (!isAppReady || !sessionId) return;

        const queryClient = getQueryClient();
        const subnavIds = (persistedNavItems && persistedNavItems.length > 0)
            ? persistedNavItems.map((n: any) => n.subnav_id).filter(Boolean)
            : [1, 3, 9, 5];
        const uniqueSubnavIds = Array.from(new Set(subnavIds)).filter((id) => Number(id) !== 1);
        const isTvFileRuntime = typeof window !== "undefined" && window.location.protocol === "file:";

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        const startDelay = 1200;
        const gap = isTvFileRuntime ? 350 : 600;

        const prefetchNext = async (index: number) => {
            if (cancelled || index >= uniqueSubnavIds.length) return;
            const subnavId = uniqueSubnavIds[index];
            await queryClient.prefetchInfiniteQuery({
                queryKey: ["contentRails", subnavId, sessionId, locale, 20],
                queryFn: () => getContentRails(subnavId, 1, sessionId, 20),
                initialPageParam: 1,
                staleTime: appConfig.STALE_TIME,
            }).catch(() => {});
            if (!cancelled) timer = setTimeout(() => void prefetchNext(index + 1), gap);
        };
        timer = setTimeout(() => void prefetchNext(0), startDelay);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [isAppReady, sessionId, persistedNavItems, locale]);

    if (isSuppressed) {
        return null;
    }

    const renderContent = () => {
        if (pathname === ROUTES.NATAK || pathname === "/nataks") {
            return <NataksClient />;
        }
        return <ContentRailsView />;
    };

    return (
        <div
            className={`min-h-screen relative${tabDirection !== null ? " browse-tab-sliding" : ""}`}
            style={{ background: "transparent" }}
        >
            {/* Incoming tab — slides in over the previous page */}
            <div
                className={
                    tabDirection !== null
                        ? `browse-page-enter-layer ${tabDirection === 1 ? "browse-page-enter-right" : "browse-page-enter-left"}`
                        : undefined
                }
            >
                {renderContent()}
            </div>
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
