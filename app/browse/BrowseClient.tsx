"use client";

import { GenreCard } from "@/components/content-rail/cards/GenreCard";
import { LandscapeCard } from "@/components/content-rail/cards/LandscapeCard";
import { PortraitCard } from "@/components/content-rail/cards/PortraitCard";
import { CONTENT_RAIL_DESIGN_CONFIG } from "@/components/content-rail/config/contentRail.config";
import { ContentRailItem, ContentRailType, RailCardVariant } from "@/components/content-rail/config/contentRail.types";
import { mapApiRail, mapApiRailItem } from "@/components/content-rail/utils/contentRail.mapper";
import { JOJOCustomButton } from "@/components/ui/JOJOButton";
import { BrowseError } from "@/components/errors/BrowseError";
import { useAssetDetailStore, slugify } from "@/features/asset/store/useAssetDetailStore";
import { useRailDetails } from "@/features/content-rail/hooks/useRailDetails";
import { useContentRails } from "@/features/content-rail/hooks/useContentRails";
import { ROUTES } from "@/lib/constants/routes";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@store/useAuthStore";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useRef, Suspense } from "react";
import { analyticsService, buildContentClickedProperties } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { useBrowseHiddenStore } from "@/store/useBrowseHiddenStore";

const unslugify = (slug: string) => {
  if (!slug) return "";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

function BrowseClientContent() {
  const params = useParams();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const router = useRouter();
  const t = useTranslations("contentRails");
  const tBootstrap = useTranslations("bootstrap");
  const { isAppReady } = useBootstrap();
  const sessionId = useAuthStore((s) => s.token);
  const openAssetDetail = useAssetDetailStore((s) => s.openAssetDetail);
  const isOpen = useAssetDetailStore((s) => s.isOpen);

  const slugAndId = params?.slugAndId as string[] | undefined;
  const routeId = slugAndId && slugAndId.length > 0 ? slugAndId[slugAndId.length - 1] : "";
  const hasGenreSlug = slugAndId?.includes("genre");

  const lastActiveIdRef = useRef<string>("");
  const lastQuerySlugRef = useRef<string>("");
  const lastIsGenreRef = useRef<boolean>(false);
  const lastSubnavIdRef = useRef<number>(1);

  // Extract params from hidden store, history state, query search params or fallback to dynamic params
  const storeId = useBrowseHiddenStore((s) => s.hiddenId);
  const storeSubnavId = useBrowseHiddenStore((s) => s.hiddenSubnavId);

  const historyStateId = typeof window !== "undefined" ? window.history.state?.hiddenId : null;
  const historyStateSubnavId = typeof window !== "undefined" ? window.history.state?.hiddenSubnavId : null;

  const idFromParams = routeId || storeId || historyStateId || searchParams?.get("id") || "";
  const isPlaceholder = idFromParams === "placeholder";
  const querySlugFromParams = searchParams?.get("slug") || (slugAndId && slugAndId.length > 1 ? slugAndId[slugAndId.length - 2] : "");
  const isGenreFromParams = hasGenreSlug || querySlugFromParams === "genre" || searchParams?.get("genre") === "true";
  const subnavIdParam = searchParams?.get("subnavId");
  const subnavIdFromParams = storeSubnavId || historyStateSubnavId || (subnavIdParam ? Number(subnavIdParam) : 1);

  if (idFromParams && idFromParams !== "placeholder") {
    lastActiveIdRef.current = idFromParams;
    lastQuerySlugRef.current = typeof querySlugFromParams === "string" ? querySlugFromParams : "";
    lastIsGenreRef.current = isGenreFromParams;
    lastSubnavIdRef.current = subnavIdFromParams;
  }

  const id = isOpen ? (lastActiveIdRef.current || idFromParams) : idFromParams;
  const querySlug = isOpen ? lastQuerySlugRef.current : querySlugFromParams;
  const isGenre = isOpen ? lastIsGenreRef.current : isGenreFromParams;
  const subnavId = isOpen ? lastSubnavIdRef.current : subnavIdFromParams;

  // Sync store, history state, and clean URL params if they exist
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    let urlChanged = false;

    // Clean empty search params
    const keysToClean = ["slug", "id", "subnavId"];
    keysToClean.forEach((key) => {
      if (url.searchParams.has(key) && !url.searchParams.get(key)) {
        url.searchParams.delete(key);
        urlChanged = true;
      }
    });

    const urlId = searchParams?.get("id");
    const urlSubnavId = searchParams?.get("subnavId");

    if (urlId) {
      const numericSubnavId = urlSubnavId ? Number(urlSubnavId) : 1;

      // Update Zustand store
      useBrowseHiddenStore.getState().setHiddenParams(urlId, numericSubnavId);

      // Clean the URL by replacing browser history state and deleting search params
      url.searchParams.delete("id");
      url.searchParams.delete("subnavId");

      const newState = {
        ...window.history.state,
        hiddenId: urlId,
        hiddenSubnavId: numericSubnavId,
      };

      window.history.replaceState(newState, "", url.pathname + url.search);
    } else {
      if (urlChanged) {
        window.history.replaceState(window.history.state, "", url.pathname + url.search);
      }

      // Rehydrate store from history state on refresh if store is empty
      const currentStoreId = useBrowseHiddenStore.getState().hiddenId;
      const currentStoreSubnavId = useBrowseHiddenStore.getState().hiddenSubnavId;
      const historyId = window.history.state?.hiddenId;
      const historySubnavId = window.history.state?.hiddenSubnavId;

      if (!currentStoreId && historyId) {
        useBrowseHiddenStore.getState().setHiddenParams(historyId, historySubnavId || 1);
      } else if (currentStoreId && (!historyId || historySubnavId !== currentStoreSubnavId)) {
        // Ensure history state is updated if we have it in store but not in history state
        const newState = {
          ...window.history.state,
          hiddenId: currentStoreId,
          hiddenSubnavId: currentStoreSubnavId || 1,
        };
        window.history.replaceState(newState, "");
      }
    }
  }, [searchParams]);

  // Redirect to home if ID is not available (ignore during placeholder/loading phases or when asset detail modal is open)
  useEffect(() => {
    if (isAppReady && !id && !isPlaceholder && !isOpen) {
      router.push("/");
    }
  }, [id, isPlaceholder, isAppReady, router, isOpen]);

  // Fetch all rails to obtain the localized rail name (cr_name) matching the id
  const { data: allRailsData } = useContentRails(subnavId, isAppReady && !!sessionId && !isPlaceholder, 20);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useRailDetails(id, isAppReady && !!sessionId && !isPlaceholder, 30);

  const responsePages = data?.pages || [];
  const firstPageData = responsePages[0]?.data;
  const railData = firstPageData ? mapApiRail(firstPageData, 0) : null;

  // Extract the rail matching our ID from all rails to get the cr_name/title
  const allRailsPages = allRailsData?.pages || [];
  let matchedRailFromAll: any = null;
  for (const page of allRailsPages) {
    const rails = page?.data?.content_rail_items || [];
    const found = rails.find((r: any) => String(r.cr_id) === String(id));
    if (found) {
      matchedRailFromAll = found;
      break;
    }
  }

  const apiCrName = matchedRailFromAll?.cr_name || matchedRailFromAll?.title || railData?.title;
  const railTitle = apiCrName || (querySlug ? unslugify(querySlug) : t("assets"));

  const config = isGenre
    ? (CONTENT_RAIL_DESIGN_CONFIG[ContentRailType.GENRE] || CONTENT_RAIL_DESIGN_CONFIG[ContentRailType.PORTRAIT])
    : (CONTENT_RAIL_DESIGN_CONFIG[railData?.type || ContentRailType.PORTRAIT] || CONTENT_RAIL_DESIGN_CONFIG[ContentRailType.PORTRAIT]);

  const isLandscape = !isGenre && (
    config?.variant === RailCardVariant.LANDSCAPE ||
    config?.variant === RailCardVariant.CONTINUE_WATCHING ||
    config?.variant === RailCardVariant.GENRE
  );
  const desktopCardWidth = config.width;
  const mobileCardWidth = isGenre
    ? 130
    : (isLandscape ? 280 : (config.width === 270 ? 145 : 135));

  const gridStyle = {
    "--card-width-desktop": `${desktopCardWidth}px`,
    "--card-width-mobile": `${mobileCardWidth}px`,
    "--grid-gap": `${config.gap}px`,
  } as React.CSSProperties;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Handle card click
  const handleItemClick = (item: ContentRailItem, index: number) => {
    try {
      const clickProps = buildContentClickedProperties(
        item,
        railTitle,
        id ?? undefined,
        undefined,
        index
      );
      analyticsService.track(EVENT_NAMES.CONTENT_CLICKED, clickProps);
    } catch (e) { }

    if (isGenre) {
      if (item?.redirectUrl) {
        router.push(item.redirectUrl);
      } else if (item?.name_analytics || item?.title) {
        const slug = slugify(item.name_analytics || item.title);
        router.push(`${ROUTES.GENRE}?genre=${slug}`);
      } else if (item?.id) {
        openAssetDetail(item.id, item.assetTypeCode || item.assetType || "movies", item.title);
      }
    } else {
      if (item?.redirectUrl) {
        router.push(item?.redirectUrl);
      } else if (item?.id) {
        openAssetDetail(item.id, item.assetTypeCode || item.assetType || "movies", item.title);
      }
    }
  };

  // Check if manually modified ID is invalid for the genre page
  const isInvalidGenreId = isGenre && !!allRailsData && !matchedRailFromAll;
  if (isInvalidGenreId) {
    return (
      <main className="min-h-screen pb-16 bg-theme_12">
        <div className="w-full px-4 sm:px-6 lg:px-14 pt-28">
          <div className="flex items-center gap-4 mt-4 sm:mt-6 lg:mt-8 mb-8">
            <div className="w-10 h-10 rounded-full bg-theme_1/5 animate-pulse" />
            <div className="w-48 h-8 bg-theme_1/5 rounded-md animate-pulse" />
          </div>
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(var(--card-width-mobile),1fr))] sm:grid-cols-[repeat(auto-fill,minmax(var(--card-width-desktop),1fr))] gap-y-8 gap-x-[var(--grid-gap)] w-full"
            style={gridStyle}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={`${isGenre ? "aspect-[20/9]" : isLandscape ? "aspect-video" : "aspect-[2/3]"} rounded-lg bg-theme_1/5 animate-pulse`}
              />
            ))}
          </div>
        </div>
        <BrowseError />
      </main>
    );
  }

  // Base loader/bootstrap screen
  if (!isAppReady || !sessionId || isPlaceholder || (isLoading && !data)) {
    return (
      <main className="min-h-screen pb-16 bg-theme_12">
        <div className="w-full px-4 sm:px-6 lg:px-14 pt-28">
          <div className="flex items-center gap-4 mt-4 sm:mt-6 lg:mt-8 mb-8">
            <div className="w-10 h-10 rounded-full bg-theme_1/5 animate-pulse" />
            <div className="w-48 h-8 bg-theme_1/5 rounded-md animate-pulse" />
          </div>
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(var(--card-width-mobile),1fr))] sm:grid-cols-[repeat(auto-fill,minmax(var(--card-width-desktop),1fr))] gap-y-8 gap-x-[var(--grid-gap)] w-full"
            style={gridStyle}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={`${isGenre ? "aspect-[20/9]" : isLandscape ? "aspect-video" : "aspect-[2/3]"} rounded-lg bg-theme_1/5 animate-pulse`}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Handle error state
  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-theme_12">
        <div className="text-center flex flex-col items-center gap-4">
          <p className="text-theme_14_samecolour font-medium select-none">
            {t("error_load")}
          </p>
          <JOJOCustomButton
            onClick={() => refetch()}
            className="px-6 py-2.5 rounded-full text-sm font-semibold text-theme_1 transition-all cursor-pointer border-none outline-none bg-theme_13_samecolour"
          >
            {tBootstrap("retry")}
          </JOJOCustomButton>
        </div>
      </main>
    );
  }

  // Consolidate all items across paginated pages
  const items: ContentRailItem[] = [];
  const seenIds = new Set<string>();

  responsePages.forEach((page) => {
    const pageData = (page as { data?: { content_rail_items?: unknown[]; cr_items?: unknown[]; cr_display_type?: number | string; display_type?: number | string } })?.data;
    const rawItems = pageData?.content_rail_items ?? pageData?.cr_items ?? [];
    const displayType = pageData?.cr_display_type ?? pageData?.display_type ?? (isGenre ? 4 : undefined);

    if (Array.isArray(rawItems)) {
      rawItems.forEach((rawItem, idx) => {
        const mapped = mapApiRailItem(rawItem as Record<string, unknown>, idx, displayType, isGenre);
        if (mapped?.id && !seenIds.has(mapped.id)) {
          seenIds.add(mapped.id);
          items.push(mapped);
        }
      });
    }
  });

  // Empty state handling
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-theme_12">
        <div className="w-full px-4 sm:px-6 lg:px-14 pt-28 pb-16">
          <div className="flex items-center gap-4 mt-4 sm:mt-6 lg:mt-8 mb-8">
            <JOJOCustomButton
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push(ROUTES.HOME);
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-theme_1/5 hover:bg-theme_1/10 active:scale-95 text-theme_1 transition-all cursor-pointer border-none outline-none"
              aria-label={t("back")}
            >
              <ChevronLeft size={24} />
            </JOJOCustomButton>
            <h1 className="text-2xl sm:text-3xl font-bold text-theme_1 tracking-wide">
              {railTitle}
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            {isGenre ? (
              <p className="text-theme_1/80 text-lg font-semibold">{t("no_assets_found")}</p>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2 bg-theme_9">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-theme_1/30">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-theme_1/80 text-lg font-semibold">
                  {t("no_assets_found")}
                </p>
                <p className="text-theme_1/40 text-sm text-center max-w-xs">
                  {t("no_assets_desc")}
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16 max-w-full overflow-x-hidden bg-theme_12">
      <div className="w-full px-4 sm:px-6 lg:px-14 pt-28">
        <div className="flex items-center gap-4 mt-4 sm:mt-6 lg:mt-8 mb-8">
          <JOJOCustomButton
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push(ROUTES.HOME);
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-theme_1/5 hover:bg-theme_1/10 active:scale-95 text-theme_1 transition-all cursor-pointer border-none outline-none"
            aria-label={t("back")}
          >
            <ChevronLeft size={24} />
          </JOJOCustomButton>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme_1 tracking-wide">
            {railTitle}
          </h1>
        </div>

        {isGenre ? (
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(var(--card-width-mobile),1fr))] sm:grid-cols-[repeat(auto-fill,minmax(var(--card-width-desktop),1fr))] gap-y-6 gap-x-[var(--grid-gap)] justify-items-stretch w-full"
            style={gridStyle}
          >
            {items.map((item, index) => (
              <div key={item.id} className="w-full">
                <GenreCard
                  item={item}
                  config={config}
                  onClick={() => handleItemClick(item, index)}
                  fullWidth={true}
                  gridHeight={180}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(var(--card-width-mobile),1fr))] sm:grid-cols-[repeat(auto-fill,minmax(var(--card-width-desktop),1fr))] gap-y-8 gap-x-[var(--grid-gap)] justify-items-start w-full"
            style={gridStyle}
          >
            {items?.map((item, index) => {
              const isLandscapeCard = isLandscape;
              const wrapperClass = `relative z-10 hover:z-50 w-full ${isLandscapeCard ? "aspect-video" : "aspect-[2/3]"}`;
              const cardClass = "block !w-full !h-full";

              const commonProps = {
                item,
                index,
                itemsLength: items?.length,
                config,
                onClick: () => handleItemClick(item, index),
                className: cardClass,
              };

              return (
                <div
                  key={item.id}
                  className={wrapperClass}
                >
                  {(() => {
                    switch (config.variant) {
                      case RailCardVariant.LANDSCAPE:
                      case RailCardVariant.CONTINUE_WATCHING:
                        return <LandscapeCard {...commonProps} />;

                      case RailCardVariant.GENRE:
                        return <GenreCard {...commonProps} />;

                      case RailCardVariant.SERIES_MIXED:
                        return <PortraitCard {...commonProps} />;

                      case RailCardVariant.TOP_TEN:
                      case RailCardVariant.ARTIST:
                      case RailCardVariant.UPCOMING:
                      case RailCardVariant.PORTRAIT:
                      default:
                        return <PortraitCard {...commonProps} />;
                    }
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {hasNextPage && (
          <div ref={sentinelRef} className="flex justify-center py-10 w-full mt-6">
            {isFetchingNextPage && (
              <div className="w-8 h-8 border-4 border-t-transparent border-theme_13_samecolour rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function BrowseClient() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pb-16 bg-theme_12">
          <div className="w-full px-4 sm:px-6 lg:px-14 pt-28">
            <div className="flex items-center gap-4 mt-4 sm:mt-6 lg:mt-8 mb-8">
              <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
              <div className="w-48 h-8 bg-white/5 rounded-md animate-pulse" />
            </div>
          </div>
        </main>
      }
    >
      <BrowseClientContent />
    </Suspense>
  );
}
