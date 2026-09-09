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
import { useEffect, useRef, useState } from "react";
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

// Global module-level cache to track route-to-subnav_id mapping for instant frame 1 loads on popstate / routing
const routeSubnavMap: Record<string, number> = {};

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
  const isNavReady = !!propSubnavId || !!routeSubnavMap[pathname] || !!apiNavItems || !!cachedNavItems;

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

  // Trigger continue-watching fetch when the view loads or when subnav changes
  useEffect(() => {
    if (socketClient.isConnected && !isGuest) {
      logger.info("[ContentRailsView] Fetching continue watching list");
      useContinueWatchingStore.getState().fetchItems();
    }
  }, [subnavId, isGuest]);

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
      openAssetDetail(item.id, item.assetTypeCode || item.assetType || "movies", item.title);
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

  const responsePages = data?.pages || [];

  const rawRails = responsePages.flatMap((page) => {
    const responseData = (page as { data?: { content_rail_items?: unknown[] } })?.data;
    return responseData?.content_rail_items || [];
  });

  // Map API rails and filter out empty ones, but keep CONTINUE_WATCHING rail even if its items are empty
  let mappedRails = rawRails
    .map((rawRail, idx) => mapApiRail(rawRail as Record<string, unknown>, idx))
    .filter((rail) => (rail?.items && rail?.items?.length > 0) || rail.type === ContentRailType.CONTINUE_WATCHING);

  // Check if backend returned a CONTINUE_WATCHING rail position
  const cwRailIndex = mappedRails.findIndex((rail) => rail.type === ContentRailType.CONTINUE_WATCHING);

  if (cwRailIndex !== -1) {
    // Backend returned a position for continue watching
    if (cwItems && cwItems.length > 0 && !isGuest) {
      // Replace with our dynamic items, keeping the position and other fields if available
      mappedRails[cwRailIndex] = {
        ...mappedRails[cwRailIndex],
        id: mappedRails[cwRailIndex].id || "continue-watching-rail",
        title: mappedRails[cwRailIndex].title || "Continue Watching",
        items: cwItems,
      };
    } else {
      // No continue watching items, or user is a guest, so remove the rail
      mappedRails.splice(cwRailIndex, 1);
    }
  }

  if (mappedRails.length === 0) {
    return <div className="min-h-screen" />;
  }

  const isFirstHero = mappedRails.length > 0 ? mappedRails[0].type === ContentRailType.HERO_CAROUSEL : false;

  return (
    <div className={`overflow-x-hidden ${isFirstHero ? "pt-0" : "pt-4 sm:pt-6"}`}>
      {mappedRails.map((rail,index) => {
        return (
          <ContentRailSection
            key={rail.id}
            index={index}
            cr_title={rail.title}
            type={rail.type}
            items={rail.items}
            onItemClick={
              rail.type === ContentRailType.CONTINUE_WATCHING
                ? handleContinueWatchingClick
                : handleRailItemClick
            }
            railId={rail.id}
            totalPages={rail.totalPages}
            limit={rail.limit}
            subnavId={subnavId}
            button_name={rail?.button_name}
            more_enabled={rail?.more_enabled}
          />
        );
      })}

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
        - All pages loaded (hasNextPage = false) → fixed empty spacer, no skeleton/spinner
      */}
      {isFetchingNextPage ? (
        <div className="h-16 w-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent border-white/40 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-16" />
      )}
    </div>
  );
}
