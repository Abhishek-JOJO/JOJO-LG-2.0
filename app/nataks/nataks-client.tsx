"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@store/useAuthStore";
import { useLocaleStore } from "@store/useLocaleStore";
import { getQueryClient } from "@/lib/react-query/queryClient";
import { useAppNavigation } from "@/features/navigation/hooks/useAppNavigation";
import { useContentRails } from "@/features/content-rail/hooks/useContentRails";
import { mapApiRail } from "@/components/content-rail/utils/contentRail.mapper";
import { LandscapeCard } from "@/components/content-rail/cards/LandscapeCard";
import { ContentRailSection } from "@/components/content-rail/ContentRailSection";
import { ContentRailsSkeleton } from "@/components/content-rail/ContentRailsSkeleton";
import { CONTENT_RAIL_DESIGN_CONFIG } from "@/components/content-rail/config/contentRail.config";
import { ContentRailType, ContentRailItem } from "@/components/content-rail/config/contentRail.types";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";
import { useTranslations } from "next-intl";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
// useActivePathname returns the original page path when the modal is open,
// preventing subnavId re-derivation and background content re-fetch on modal open.
import { useActivePathname } from "@/hooks/useActivePathname";

export default function NataksPage() {
  const t = useTranslations("contentRails");
  const { isAppReady } = useBootstrap();
  const sessionId = useAuthStore(state => state.token);
  const pathname = useActivePathname();
  const router = useRouter();

  // Resolve subnavId for current pathname
  const { data: apiNavItems } = useAppNavigation(isAppReady);

  // Synchronously check if navigation items are already in the TanStack cache
  const queryClient = getQueryClient();
  let cachedNavItems: any[] | undefined = undefined;
  try {
    cachedNavItems = queryClient.getQueryData<any[]>(["appNavigation", sessionId, useLocaleStore.getState().locale]);
  } catch {
    // Ignore cache query errors
  }

  const navItems = apiNavItems || cachedNavItems;
  const matchedItem = navItems?.find((item) => {
    const targetUrl = item.url === ROUTES.HOMEPAGE ? ROUTES.HOME : item.url;
    return pathname === targetUrl;
  });

  const subnavId = matchedItem?.subnav_id ?? 4;
  const isNavReady = !!apiNavItems || !!cachedNavItems;

  // Fetch paginated content rails data
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContentRails(subnavId, isAppReady && !!sessionId && isNavReady);

  const statusRef = useRef({ hasNextPage, isFetchingNextPage, fetchNextPage });

  useEffect(() => {
    statusRef.current = { hasNextPage, isFetchingNextPage, fetchNextPage };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const { hasNextPage: hasNext, isFetchingNextPage: isFetching, fetchNextPage: fetchNext } = statusRef.current;
      if (!hasNext || isFetching) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 400;

      if (isNearBottom) {
        logger.info("[NataksPage] User scrolled near bottom. Fetching next page.");
        fetchNext();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Auto-fetch next page if content fits on screen but there are more pages
  // IMPORTANT: this useEffect must stay ABOVE all early returns to follow Rules of Hooks
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && typeof window !== "undefined") {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      if (scrollHeight > 0 && scrollHeight <= clientHeight) {
        logger.info("[NataksPage] Content fits on screen but has more pages. Fetching next page automatically.");
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data]);

  const handleItemClick = (item: ContentRailItem) => {
    if (item?.redirectUrl) {
      router.push(item?.redirectUrl);
    } else if (item?.id) {
      // Open asset detail modal instead of direct navigation to watch page
      // This ensures proper authentication, subscription, and gating checks
      const contentType = item?.assetTypeCode || item?.assetType || "nataks";
      useAssetDetailStore.getState().openAssetDetail(item.id, contentType, item.title);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen" style={{ background: "var(--theme_12)" }}>
        <ContentRailsSkeleton hasHero={true} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--theme_12)" }}>
        <div className="text-center text-red-500 font-medium select-none">
          {t("error_load")}
        </div>
      </main>
    );
  }

  const responsePages = data?.pages || [];
  const rails = responsePages.flatMap((page: any) => {
    const responseData = page?.data;
    return responseData?.content_rail_items || [];
  });

  if (rails.length === 0) {
    return <main className="min-h-screen" style={{ background: "var(--theme_12)" }} />;
  }

  // Check if first rail is a Hero Carousel
  const firstRail = mapApiRail(rails[0], 0);
  const hasHero = firstRail?.type === ContentRailType.HERO_CAROUSEL;

  // Rails to be rendered in the grid
  const gridRails = hasHero ? rails.slice(1) : rails;

  // Flatten and deduplicate items across the grid rails
  const items: ContentRailItem[] = [];
  const seenIds = new Set<string>();

  gridRails.forEach((rawRail: any, railIdx: number) => {
    const rail = mapApiRail(rawRail, hasHero ? railIdx + 1 : railIdx);
    if (rail?.items) {
      rail.items.forEach((item) => {
        if (item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          items.push(item);
        }
      });
    }
  });

  const config = CONTENT_RAIL_DESIGN_CONFIG[ContentRailType.LANDSCAPE];
  const pageTitle = matchedItem?.title || "Nataks";

  return (
    <main className="min-h-screen pb-16" style={{ background: "var(--theme_12)" }}>
      {/* Render Hero Carousel banner at the top if present */}
      {hasHero && firstRail && (
        <ContentRailSection
          key={firstRail.id}
          index={0}
          cr_title={firstRail.title}
          type={firstRail.type}
          items={firstRail.items}
          onItemClick={handleItemClick}
          button_name={firstRail?.button_name}
          more_enabled={firstRail?.more_enabled}
        />
      )}

      <div className={`w-full px-4 sm:px-6 lg:px-14 ${hasHero ? "mt-12" : "mt-20 pt-8 sm:pt-12"}`}>
        {/* Dynamic localized title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-theme_1 mb-8 tracking-wide">
          {pageTitle}
        </h1>

        {/* Responsive Grid Layout */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 ${hasHero ? "lg:grid-cols-4 xl:grid-cols-5" : "lg:grid-cols-3 xl:grid-cols-4"} gap-y-5 gap-x-6 sm:gap-x-8 lg:gap-x-5 justify-items-center`}>
          {items?.map((item, idx) => (
            <div key={item.id} className="w-full flex justify-center">
              <LandscapeCard
                item={item}
                config={config}
                index={idx + 1}
                itemsLength={items.length + 2}
                onClick={() => handleItemClick(item)}
                className="!w-full !h-auto aspect-video"
              />
            </div>
          ))}
        </div>

        {/* Fetching Next Page Loader */}
        {isFetchingNextPage && (
          <div className={`mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 ${hasHero ? "lg:grid-cols-4 xl:grid-cols-5" : "lg:grid-cols-3 xl:grid-cols-4"} gap-y-8 gap-x-6 sm:gap-x-8 lg:gap-x-12 justify-items-center opacity-75`}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full flex justify-center">
                <div className="rounded-lg bg-neutral-900 w-full aspect-video max-w-[356px] animate-pulse" />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
