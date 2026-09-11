"use client";

import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@store/useAuthStore";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { analyticsService, buildContentClickedProperties } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";

import { PortraitCard } from "@/components/content-rail/cards/PortraitCard";
import { CONTENT_RAIL_DESIGN_CONFIG } from "@/components/content-rail/config/contentRail.config";
import { ContentRailItem, ContentRailType, RailCardVariant } from "@/components/content-rail/config/contentRail.types";
import { mapApiRailItem } from "@/components/content-rail/utils/contentRail.mapper";
import { JOJOCustomButton } from "@/components/ui/JOJOButton";
import { useAssetDetailStore, slugify } from "@/features/asset/store/useAssetDetailStore";
import { useContentRails } from "@/features/content-rail/hooks/useContentRails";
import { useAppNavigation } from "@/features/navigation/hooks/useAppNavigation";
import { ROUTES } from "@/lib/constants/routes";
import { safeNavigate } from "@/lib/webos/safeNavigate";
import { restorePageFocus } from "@/src/navigation/focusUtils";

export function GenreListingSkeleton() {
  return (
    <main className="min-h-screen pb-16 bg-theme_12">
      <div className="w-full px-4 sm:px-6 lg:px-14 pt-28">
        <div className="flex items-center gap-4 mt-4 sm:mt-6 lg:mt-8 mb-8">
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
          <div className="w-48 h-8 bg-white/5 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-10 gap-y-8 gap-x-4 sm:gap-x-6 lg:gap-x-8 justify-items-center w-full">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-full rounded-lg bg-white/5 animate-pulse"
              style={{ aspectRatio: "173 / 260" }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function GenreListingClient() {
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  const t = useTranslations("contentRails");
  const tBootstrap = useTranslations("bootstrap");
  const { isAppReady } = useBootstrap();
  const sessionId = useAuthStore((s) => s.token);
  const openAssetDetail = useAssetDetailStore((s) => s.openAssetDetail);
  const isOpen = useAssetDetailStore((s) => s.isOpen);

  const lastSelectedGenreRef = useRef<string>("");
  const selectedGenreFromParams = searchParams?.get(RailCardVariant.GENRE) ?? "";

  if (selectedGenreFromParams) {
    lastSelectedGenreRef.current = selectedGenreFromParams;
  }

  const selectedGenre = isOpen ? (lastSelectedGenreRef.current || selectedGenreFromParams) : selectedGenreFromParams;

  // Give the D-pad something to land on the moment this page loads — a plain
  // full-page navigation (not a modal) doesn't get any automatic initial focus,
  // so without this the remote does nothing until the user happens to trigger
  // norigin's own fallback behavior.
  useEffect(() => {
    restorePageFocus();
  }, []);

  const { data: navItems } = useAppNavigation(isAppReady);
  const homeSubnavId = useMemo(
    () =>
      navItems?.find((i) => i.url === "/" || i.url === ROUTES.HOMEPAGE)
        ?.subnav_id ?? 1,
    [navItems]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContentRails(homeSubnavId, isAppReady, 20);

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const config = CONTENT_RAIL_DESIGN_CONFIG[ContentRailType.PORTRAIT];

  const filteredItems = useMemo<ContentRailItem[]>(() => {
    if (!data?.pages || !selectedGenre) return [];

    const seen = new Set<string>();
    const results: ContentRailItem[] = [];

    data.pages.forEach((page) => {
      const rails = (page as { data?: { content_rail_items?: unknown[] } })?.data?.content_rail_items ?? [];

      (rails as Record<string, unknown>[]).forEach((rawRail) => {
        const displayType = (rawRail?.cr_display_type ?? rawRail?.display_type) as number | string | undefined;
        const rawItems: Record<string, unknown>[] =
          (rawRail?.cr_items ?? rawRail?.content_rail_items ?? []) as Record<string, unknown>[];

        rawItems?.forEach((rawItem, idx) => {
          if (rawItem?.genre) return;

          const asset = (rawItem?.asset ?? rawItem) as Record<string, unknown>;
          const genres: string[] = (asset?.asset_genre as string[]) ?? [];

          const matches = genres.some(
            (g) => slugify(g) === slugify(selectedGenre)
          );
          if (!matches) return;

          const mapped = mapApiRailItem(rawItem, idx, displayType, false);
          if (mapped?.id && !seen.has(mapped.id)) {
            seen.add(mapped.id);
            results.push(mapped);
          }
        });
      });
    });

    return results;
  }, [data, selectedGenre]);

  const displayLabel = useMemo(() => {
    if (!selectedGenre) return "";

    // Attempt to find the original raw genre name from the loaded assets data
    if (data?.pages) {
      for (const page of data.pages) {
        const rails = (page as { data?: { content_rail_items?: unknown[] } })?.data?.content_rail_items ?? [];
        for (const rawRail of rails as Record<string, unknown>[]) {
          const rawItems = (rawRail?.cr_items ?? rawRail?.content_rail_items ?? []) as Record<string, unknown>[];
          for (const rawItem of rawItems) {
            if (rawItem?.genre) continue;
            const asset = (rawItem?.asset ?? rawItem) as Record<string, unknown>;
            const genres: string[] = (asset?.asset_genre as string[]) ?? [];
            const found = genres.find((g) => slugify(g) === slugify(selectedGenre));
            if (found) return found;
          }
        }
      }
    }

    // Fallback: replace hyphens with spaces and capitalize each word
    return selectedGenre
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, [data, selectedGenre]);

  const handleItemClick = useCallback((item: ContentRailItem, index: number) => {
    try {
      const clickProps = buildContentClickedProperties(
        item,
        displayLabel,
        selectedGenre,
        undefined,
        index
      );
      analyticsService.track(EVENT_NAMES.CONTENT_CLICKED, clickProps);
    } catch (e) {}

    if (item?.redirectUrl) {
      safeNavigate(router, item.redirectUrl);
    } else if (item?.id) {
      openAssetDetail(
        item.id,
        item.assetTypeCode ?? item.assetType ?? "movies",
        item.title
      );
    }
  }, [router, openAssetDetail, displayLabel, selectedGenre]);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      safeNavigate(router, ROUTES.HOME);
    }
  }, [router]);

  const { ref: backBtnRef, focused: backBtnFocused } = useFocusable({
    focusKey: "genre-back-btn",
    onEnterPress: handleBack,
  });

  if ((!isAppReady || !sessionId || isLoading) && !data) {
    return <GenreListingSkeleton />;
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-theme_12">
        <div className="text-center flex flex-col items-center gap-4">
          <p className="text-theme_14_samecolour font-medium select-none">{t("error_load")}</p>
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



  const gridCols =
    "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-10";

  return (
    <main className="min-h-screen pb-16 max-w-full overflow-x-hidden bg-theme_12">
      <div className="w-full px-4 sm:px-6 lg:px-14 pt-28">
        <div className="flex items-center gap-4 mt-4 sm:mt-6 lg:mt-8 mb-8">
          <JOJOCustomButton
            ref={backBtnRef as any}
            data-focuskey="genre-back-btn"
            onClick={handleBack}
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 text-theme_1 transition-all cursor-pointer outline-none ${
              backBtnFocused ? "scale-110" : "bg-white/5 hover:bg-white/10 border-none"
            }`}
            style={backBtnFocused ? { border: "3px solid #ffffff" } : undefined}
            aria-label={t("back")}
          >
            <ChevronLeft size={24} />
          </JOJOCustomButton>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme_1 tracking-wide">
            {displayLabel}
          </h1>
        </div>
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-theme_1/80 text-lg font-semibold">
              {t("no_assets_found")}
            </p>
          </div>
        ) : (
          <div
            className={`grid ${gridCols} gap-y-8 gap-x-4 sm:gap-x-6 lg:gap-x-8 justify-items-center w-full`}
          >
            {filteredItems.map((item, index) => (
              <PortraitCard
                key={item?.id}
                item={item}
                config={config}
                index={index}
                itemsLength={filteredItems.length}
                onClick={() => handleItemClick(item, index)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
