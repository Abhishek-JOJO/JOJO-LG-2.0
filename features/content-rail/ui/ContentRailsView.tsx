"use client";

import { ContentRailItem, ContentRailType } from "@/components/content-rail/config/contentRail.types";
import { ContentRailSection } from "@/components/content-rail/ContentRailSection";
import { HeroSliderSkeleton } from "@/components/content-rail/ContentRailsSkeleton";
import { mapApiRail } from "@/components/content-rail/utils/contentRail.mapper";
import { useAppNavigation } from "@/features/navigation/hooks/useAppNavigation";
import { NavigationItem } from "@/features/navigation/model/types";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActivePathname } from "@/hooks/useActivePathname";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { setFocus, getCurrentFocusKey } from "@noriginmedia/norigin-spatial-navigation";
import { useActiveRailStore } from "@/store/useActiveRailStore";
import { useContentRails } from "../hooks/useContentRails";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useAuthStore } from "@store/useAuthStore";
import { useLocaleStore } from "@store/useLocaleStore";
import { useContinueWatchingStore } from "@store/useContinueWatchingStore";
import { useWatchGating } from "@/features/asset/hooks/useWatchGating";
import { GatePopup } from "@/features/asset/ui/GatePopup";
import { socketClient } from "@/lib/socket/socket.client";
import { getQueryClient } from "@/lib/react-query/queryClient";
import { getAssetPricing } from "@/features/content/api/getAssetPricing";
import { restorePageFocus } from "@/src/navigation/focusUtils";
import { preloadRailItems } from "@/components/content-rail/utils/imagePreloader";

// Global module-level cache to track route-to-subnav_id mapping for instant frame 1 loads on popstate / routing
const routeSubnavMap: Record<string, number> = {
  [ROUTES.HOME]: 1,
  [ROUTES.HOMEPAGE]: 1,
  "/movies": 3,
  "/shows": 9,
  "/nataks": 5,
  "/natak": 5,
};

function cacheRouteSubnavs(items: NavigationItem[] | undefined) {
  if (!items) return;
  items.forEach((item) => {
    if (item?.url && item?.subnav_id) {
      const targetUrl = item.url === ROUTES.HOMEPAGE ? ROUTES.HOME : item.url;
      routeSubnavMap[targetUrl] = item.subnav_id;
    }
  });
}

interface ContentRailsViewProps {
  subnavId?: number;
}

// Preview rows are below the hero and spotlight on TV. Mounting their cards
// immediately also registers/measures every card with spatial navigation,
// even though these rows are not D-pad focusable. Keep their scroll space and
// mount shortly before they become visible; the spotlight itself stays eager.
function PreviewRail(props: ComponentProps<typeof ContentRailSection>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() =>
    typeof window === "undefined" || window.location.protocol !== "file:"
  );

  useEffect(() => {
    if (visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px 0px" });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={containerRef} style={visible ? undefined : { minHeight: 580 }}>
      {visible && <ContentRailSection {...props} />}
    </div>
  );
}

export function ContentRailsView({ subnavId: propSubnavId }: ContentRailsViewProps) {
  const t = useTranslations("contentRails");
  const { isAppReady } = useBootstrap();
  const pathname = useActivePathname();
  const router = useRouter();
  const { data: apiNavItems } = useAppNavigation(isAppReady);

  const sessionId = useAuthStore((s) => s.token);
  const locale = useLocaleStore((s) => s.locale);
  const user = useAuthStore((s) => s.user);
  const isGuest = user?.isGuest ?? false;
  const isTvFileRuntime = typeof window !== "undefined" && window.location.protocol === "file:";

  // Synchronously check if navigation items are already in the TanStack cache
  // We can do this safely on both Client and Server because getQueryClient gives us the correct instance.
  let cachedNavItems: NavigationItem[] | undefined = undefined;
  try {
    cachedNavItems = getQueryClient().getQueryData<NavigationItem[]>(["appNavigation", sessionId, locale]);
  } catch {
    // Ignore cache query errors
  }

  // Synchronously populate the global routeSubnavMap cache whenever nav items are loaded
  const navItems = apiNavItems || cachedNavItems;
  cacheRouteSubnavs(navItems);

  const matchedItem = navItems?.find((item) => {
    const targetUrl = item.url === ROUTES.HOMEPAGE ? ROUTES.HOME : item.url;
    return pathname === targetUrl;
  });

  const subnavId = propSubnavId ?? routeSubnavMap[pathname] ?? matchedItem?.subnav_id ?? 1;
  // The home route's subnav_id is always 1 by convention (same fallback used
  // throughout the app, e.g. SearchModal's homeSubnavId), so on "/" there's no
  // ambiguity to wait on — starting the rails fetch (which carries the hero) only
  // once nav items have already loaded was serializing two full network round
  // trips in front of the hero skeleton for a value we already know. Every other
  // route keeps the existing safety gate, since a wrong subnavId there really
  // would fetch (and briefly flash) the wrong page's content.
  const isNavReady =
    pathname === ROUTES.HOME ||
    !!propSubnavId ||
    !!routeSubnavMap[pathname] ||
    !!apiNavItems ||
    !!cachedNavItems;

  const {
    data,
    isLoading,
    isFetching,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContentRails(subnavId, isAppReady && isNavReady, 20);



  const statusRef = useRef({ hasNextPage, isFetchingNextPage, fetchNextPage });
  useEffect(() => {
    statusRef.current = { hasNextPage, isFetchingNextPage, fetchNextPage };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Restore focus when returning to home page, switching subnavs, or when data loading completes after login
  useEffect(() => {
    if (isLoading) return;
    const isModalOpen = useAssetDetailStore.getState().isOpen;
    if (isModalOpen) return;
    const currentKey = getCurrentFocusKey();
    if (
      currentKey &&
      (currentKey.startsWith("nav-link") ||
       currentKey.startsWith("navbar-") ||
       currentKey.startsWith("nav-"))
    ) {
      return;
    }
    restorePageFocus();
  }, [pathname, subnavId, isLoading, data]);

  // Scroll-to-bottom pagination — listener is removed when there are no more pages
  useEffect(() => {
    if (!hasNextPage) return; // last page already loaded — don't attach listener

    const handleScroll = () => {
      const { hasNextPage: hasNext, isFetchingNextPage: isFetching, fetchNextPage: fetchNext } = statusRef.current;
      if (!hasNext || isFetching) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 400;
      if (isNearBottom) {
        logger.info("[ContentRailsView] Near bottom — fetching next page.");
        fetchNext();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasNextPage]); // re-evaluates when hasNextPage flips to false → cleans up listener

  // Trigger continue-watching fetch when the view loads. On packaged webOS, do
  // not refetch it for every navbar tab switch; that competes with rail rendering
  // and makes Home → Movies feel delayed. Socket updates still keep it fresh.
  const didFetchContinueWatchingRef = useRef(false);
  useEffect(() => {
    if (isGuest || !socketClient.isConnected) return;
    if (isTvFileRuntime && didFetchContinueWatchingRef.current) return;

    didFetchContinueWatchingRef.current = true;
    logger.info("[ContentRailsView] Fetching continue watching list");
    useContinueWatchingStore.getState().fetchItems();
  }, [subnavId, isGuest, isTvFileRuntime]);

  const openAssetDetail = useAssetDetailStore((s) => s.openAssetDetail);

  const [gatingAsset, setGatingAsset] = useState<any>(null);
  const { handleWatch, gateResult, clearGate, isSubscribed, isTvodPurchased } = useWatchGating({
    asset: gatingAsset,
    enabled: isAppReady,
  });

  const handleRailItemClick = (item: ContentRailItem) => {
    if (item?.redirectUrl) {
      router.push(item?.redirectUrl);
    } else if (item?.id) {
      openAssetDetail(item.id, item.assetTypeCode || item.assetType || "movies", item.title, item);
    }
  };

  const handleContinueWatchingClick = (item: ContentRailItem) => {
    logger.info("[ContentRailsView] Continue watching item clicked, running gating checks", { item_id: item.id, progressSeconds: item.progressSeconds });

    // Write resume metadata synchronously to sessionStorage BEFORE navigating.
    // Using setGatingAsset + setTimeout has a race condition — handleWatch closes
    // over the old null asset on first click, skipping the sessionStorage write.
    try {
      const resumeTime = item.progressSeconds || 0;
      sessionStorage.setItem(
        `play_metadata_${item.id}`,
        JSON.stringify({
          title: item.title,
          description: item.description || "",
          seriesInfo: null,
          certification: item.certification || null,
          classifications: null,
          assetCategoryCode: item.isSVOD ? 2 : item.isTVOD ? 3 : 1,
          isTvodPurchased,
          isSvodSubscribed: isSubscribed,
          resumeTime,
          bypassResumePrompt: resumeTime > 0,
        })
      );
      logger.info("[ContentRailsView] Wrote resumeTime to sessionStorage", { item_id: item.id, resumeTime });
    } catch (err) {
      logger.warn("[ContentRailsView] Failed to write play metadata to sessionStorage", err);
    }

    // Now run gating (auth / subscription checks). Set asset first so gating
    // has the correct assetCategoryCode for SVOD / TVOD gate checks.
    const gatingPayload = {
      assetId: item.id,
      title: item.title,
      description: item.description || "",
      assetCategoryCode: item.isSVOD ? 2 : item.isTVOD ? 3 : 1,
      assetTypeCode: item.assetTypeCode || 1,
    } as any;

    setGatingAsset(gatingPayload);

    // handleWatch still guards mobile / auth / subscription gates and navigates
    setTimeout(() => {
      handleWatch(item.id, item.progressSeconds || 0);
    }, 0);
  };

  // Retrieve Continue Watching items from store
  const cwItemsRaw = useContinueWatchingStore((s) => s.items);
  const [cwItems, setCwItems] = useState<ContentRailItem[]>([]);

  useEffect(() => {
    if (!cwItemsRaw || cwItemsRaw.length === 0 || isGuest) {
      setCwItems([]);
      return;
    }

    let isMounted = true;
    const filterTvodItems = async () => {
      const countryCode = localStorage.getItem("user_country_code") || "IN";
      const token = useAuthStore.getState().token;
      
      const filtered = [];
      for (const item of cwItemsRaw) {
        if (item.isTVOD) {
          try {
            const pricing = await getAssetPricing(item.id, countryCode, token ?? undefined);
            if (pricing?.data?.bIsUserPurchased === true || (pricing?.data as any)?.isUserPurchased === true) {
              filtered.push(item);
            }
          } catch (e) {
            filtered.push(item);
          }
        } else {
          filtered.push(item);
        }
      }
      
      if (isMounted) {
        setCwItems(filtered);
      }
    };

    filterTvodItems();
    return () => {
      isMounted = false;
    };
  }, [cwItemsRaw, isGuest]);

  const responsePages = data?.pages || [];

  const isHomePage = pathname === ROUTES.HOME || pathname === ROUTES.HOMEPAGE || pathname === "/" || subnavId === 1;

  const mappedRails = useMemo(() => {
    const rawRails = responsePages.flatMap((page) => {
      const responseData = (page as { data?: { content_rail_items?: unknown[] } })?.data;
      return responseData?.content_rail_items || [];
    });

    const rails = rawRails
      .map((rawRail, idx) => mapApiRail(rawRail as Record<string, unknown>, idx))
      .filter((rail) => (rail?.items && rail?.items?.length > 0) || rail.type === ContentRailType.CONTINUE_WATCHING)
      .filter((rail) => {
        const isGenreRail =
          rail.type === ContentRailType.GENRE ||
          rail.title?.toLowerCase()?.trim() === "genre";
        return !(isGenreRail && isHomePage);
      })
      .map((rail) => {
        if (!isHomePage) {
          const isTop10Rail = rail.type === ContentRailType.TOP_10;
          return {
            ...rail,
            type: isTop10Rail ? ContentRailType.PORTRAIT : rail.type,
            items: rail.items?.map((item) => ({
              ...item,
              isTop10: false,
              numberintop10: undefined,
              rank: undefined,
            })),
          };
        }
        return rail;
      });

    const cwRailIndex = rails.findIndex((rail) => rail.type === ContentRailType.CONTINUE_WATCHING);
    if (cwRailIndex !== -1) {
      if (cwItems && cwItems.length > 0 && !isGuest) {
        rails[cwRailIndex] = {
          ...rails[cwRailIndex],
          id: rails[cwRailIndex].id || "continue-watching-rail",
          title: rails[cwRailIndex].title || "Continue Watching",
          items: cwItems,
        };
      } else {
        rails.splice(cwRailIndex, 1);
      }
    }

    return rails;
  }, [responsePages, isHomePage, cwItems, isGuest]);

  const [activeRailIndex, setActiveRailIndex] = useState(0);
  const activeRailIndexRef = useRef(0);
  activeRailIndexRef.current = activeRailIndex;

  // Track subnavId to reset activeRailIndex synchronously during render (no extra effect round-trip)
  const prevSubnavIdRef = useRef(subnavId);
  if (prevSubnavIdRef.current !== subnavId) {
    prevSubnavIdRef.current = subnavId;
    if (activeRailIndex !== 0) {
      setActiveRailIndex(0);
    }
  }

  const isFirstHero = mappedRails.length > 0 ? mappedRails[0].type === ContentRailType.HERO_CAROUSEL : false;
  const heroRail = isFirstHero ? mappedRails[0] : null;
  const contentRails = useMemo(
    () => (isFirstHero ? mappedRails.slice(1) : mappedRails),
    [isFirstHero, mappedRails]
  );

  const returnAssetId = useAssetDetailStore((s) => s.returnAssetId);
  const isAssetDetailOpen = useAssetDetailStore((s) => s.isOpen);

  // When returning from AssetDetailModal, ensure the active rail is set to the rail containing returnAssetId
  useEffect(() => {
    if (isAssetDetailOpen || !returnAssetId || !contentRails?.length) return;
    const targetIdx = contentRails.findIndex((rail) =>
      rail.items?.some((it) => String(it.id) === String(returnAssetId) || String(it.assetId) === String(returnAssetId))
    );
    if (targetIdx !== -1 && targetIdx !== activeRailIndexRef.current) {
      setActiveRailIndex(targetIdx);
    }
  }, [isAssetDetailOpen, returnAssetId, contentRails]);

  const safeActiveRailIndex = Math.min(
    Math.max(0, activeRailIndex),
    Math.max(0, contentRails.length - 1)
  );
  const activeRail = contentRails[safeActiveRailIndex];
  const upcomingRails = useMemo(
    () => contentRails.slice(safeActiveRailIndex + 1, safeActiveRailIndex + (isTvFileRuntime ? 2 : 4)),
    [contentRails, safeActiveRailIndex, isTvFileRuntime]
  );
  const showPreviewRails = true;

  // TV remote vertical navigation: ArrowDown / ArrowUp updates the active rail in place instantly
  const handleArrowUpDown = useCallback((direction: "up" | "down") => {
    if (direction === "down") {
      setActiveRailIndex((prev) => {
        if (prev < contentRails.length - 1) {
          return prev + 1;
        }
        return prev;
      });
      try { setFocus("spotlight-lead-fixed"); } catch {}
      return true;
    }
    if (direction === "up") {
      if (activeRailIndexRef.current > 0) {
        setActiveRailIndex((prev) => Math.max(0, prev - 1));
        try { setFocus("spotlight-lead-fixed"); } catch {}
        return true;
      }
      if (isFirstHero) {
        window.scrollTo({ top: 0, behavior: "auto" });
        const hero = document.getElementById("hero-carousel-container");
        hero?.focus({ preventScroll: true });
        try { setFocus("hero-carousel"); } catch {}
        useActiveRailStore.getState().setActiveSectionIndex(0);
        return true;
      }
      // If there is no hero carousel on this tab, UP from the top rail returns to active nav tab
      const activeNavLink = (
        document.querySelector('header [data-active="true"][data-focuskey]') ||
        document.querySelector('header [data-focuskey].active')
      ) as HTMLElement | null;
      const targetEl = activeNavLink || (document.querySelector('header [data-focuskey^="nav-link-"]') as HTMLElement | null);
      if (targetEl) {
        targetEl.focus();
        const key = targetEl.getAttribute('data-focuskey');
        if (key) {
          try { setFocus(key); } catch {}
        }
      }
      return true;
    }
    return true;
  }, [contentRails.length, isFirstHero]);

  // Prefetch the next page of rails well before the user can reach the end, so a fast/held-down
  // ArrowDown never outruns the network request and shows the loading spinner. A TV remote can
  // repeat-fire every ~100-150ms, but a rails page fetch (20 rails' worth of items) can easily take
  // 1-2s+ on TV hardware/network — a 3-rail buffer gives far less lead time than that requires, so
  // trigger with a much larger margin (half a page) instead of waiting until the user is nearly there.
  const RAIL_PAGINATION_LOOKAHEAD = isTvFileRuntime ? 4 : 10;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && safeActiveRailIndex >= contentRails.length - RAIL_PAGINATION_LOOKAHEAD) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, safeActiveRailIndex, contentRails.length, fetchNextPage, RAIL_PAGINATION_LOOKAHEAD]);

  // Covers the fastest-possible case (rapid ArrowDown from the very start of a small rail set):
  // kick off page 2 the moment page 1 finishes loading, without waiting on scroll position at all.
  // Only fires once — subsequent pages are handled by the lookahead effect above.
  useEffect(() => {
    if (isTvFileRuntime) return;
    if (hasNextPage && !isFetchingNextPage && !isFetching && responsePages.length === 1) {
      fetchNextPage();
    }
  }, [responsePages.length, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, isTvFileRuntime]);

  // Ahead-of-time preloading of upcoming rails' lead card images, logos, and side portrait cards
  // Ensures 0ms latency and instant data filling with zero delay on ArrowDown
  // Dep: safeActiveRailIndex (not upcomingRails which is a new .slice() every render)
  useEffect(() => {
    if (isTvFileRuntime) return;

    const upcoming = contentRails.slice(safeActiveRailIndex + 1, safeActiveRailIndex + 4);
    if (!upcoming.length) return;
    const timer = setTimeout(() => {
      upcoming.forEach((rail) => {
        preloadRailItems(rail?.items, 6);
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [safeActiveRailIndex, contentRails, isTvFileRuntime]);

  // ── Initial load: TV Hero Slider skeleton matching 75vh layout ──
  const showSkeleton = isLoading || (isFetching && !data);
  if (showSkeleton) {
    return (
      <div className="min-h-screen overflow-x-hidden pt-0" style={{ background: "var(--theme_12)" }}>
        <HeroSliderSkeleton />
        <div className="mt-8 px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="w-48 h-6 rounded-md bg-white/10" />
          <div className="flex gap-4 overflow-hidden">
            <div className="w-[462px] h-[270px] rounded-lg bg-white/5 shrink-0" />
            <div className="w-[180px] h-[270px] rounded-lg bg-white/5 shrink-0" />
            <div className="w-[180px] h-[270px] rounded-lg bg-white/5 shrink-0" />
            <div className="w-[180px] h-[270px] rounded-lg bg-white/5 shrink-0" />
            <div className="w-[180px] h-[270px] rounded-lg bg-white/5 shrink-0" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32 text-red-500 font-medium">
        {t("error_load")}
      </div>
    );
  }

  if (mappedRails.length === 0) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className={`overflow-x-hidden ${isFirstHero ? "pt-0" : "pt-4 sm:pt-6"}`}>
      {/* Hero Carousel (Section index 0) */}
      {heroRail && (
        <ContentRailSection
          key={heroRail.id}
          index={0}
          isFirstContentRail={false}
          cr_title={heroRail.title}
          type={heroRail.type}
          items={heroRail.items}
          onItemClick={handleRailItemClick}
          railId={heroRail.id}
          totalPages={heroRail.totalPages}
          limit={heroRail.limit}
          subnavId={subnavId}
          button_name={heroRail?.button_name}
          more_enabled={heroRail?.more_enabled}
        />
      )}

      {/* Active Spotlight Rail (Section index 1) - ONLY this has the fixed Landscape Card at Slot 0 */}
      {activeRail && (
        <ContentRailSection
          key="active-spotlight-rail"
          index={1}
          isFirstContentRail={true}
          cr_title={activeRail.title}
          type={activeRail.type}
          items={activeRail.items}
          onItemClick={
            activeRail.type === ContentRailType.CONTINUE_WATCHING
              ? handleContinueWatchingClick
              : handleRailItemClick
          }
          railId={activeRail.id}
          totalPages={activeRail.totalPages}
          limit={activeRail.limit}
          subnavId={subnavId}
          button_name={activeRail?.button_name}
          more_enabled={activeRail?.more_enabled}
          onArrowUpDown={handleArrowUpDown}
        />
      )}

      {/* Upcoming Preview Rails (Section index 2+) - 100% standard portrait cards only */}
      {showPreviewRails && upcomingRails.map((rail, idx) => (
        <PreviewRail
          key={rail.id}
          index={2 + idx}
          isFirstContentRail={false}
          disableHover={true}
          cr_title={rail.title}
          type={rail.type}
          items={rail.items}
          onItemClick={handleRailItemClick}
          railId={rail.id}
          totalPages={rail.totalPages}
          limit={rail.limit}
          subnavId={subnavId}
          button_name={rail?.button_name}
          more_enabled={rail?.more_enabled}
        />
      ))}

      {/* Gating Dialog Popup Overlay */}
      {gateResult && gateResult.gate !== "none" && (
        <GatePopup
          gate={gateResult.gate}
          message={gateResult.message}
          onClose={() => {
            clearGate();
            setGatingAsset(null);
          }}
        />
      )}

      {/*
        - Still fetching more pages → small spinner only. This used to mount the
          entire ~5-rail skeleton (with dozens of placeholder cards) underneath
          content that's already loaded and visible, on every single page fetch
          while scrolling — needless paint/DOM cost for a "more is coming" cue.
        - All pages loaded (hasNextPage = false) → fixed empty spacer, no skeleton/spinner.
          This spacer must be tall enough that the page can still be scrolled all
          the way to BaseContentCard's onFocus anchor (active section's top at
          y=105) once the active rail becomes the very last one and upcomingRails
          is empty — otherwise the document is too short, window.scrollTo() clamps
          to the max scrollable position, the active rail lands lower on screen
          than intended, and the hero carousel (sitting above it) stays visible
          at the top of the viewport at the same time as the last rail.
      */}
      {isFetchingNextPage ? (
        <div className="h-16 w-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent border-white/40 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-[70vh]" />
      )}
    </div>
  );
}
