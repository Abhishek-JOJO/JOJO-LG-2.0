"use client";

import { analyticsService, buildContentClickedProperties } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
// removed norigin imports from this line
import { JOJOCustomButton } from "../ui/JOJOButton";
import { CONTENT_RAIL_DESIGN_CONFIG } from "./config/contentRail.config";
import { mapAnalyticsAssetCategory } from "@/shared/analytics/utils/mapAnalyticsAssetCategory";
import { ContentRailItem, ContentRailType, RailCardVariant } from "./config/contentRail.types";
import { ContentRailList } from "./ContentRailList";
import { useRailItems } from "@/features/content-rail/hooks/useRailItems";
import { ROUTES } from "@/lib/constants/routes";
import { slugify } from "@/features/asset/store/useAssetDetailStore";
import { logger } from "@/lib/logger/logger";
import { useTranslations } from "next-intl";
import { useBrowseHiddenStore } from "@/store/useBrowseHiddenStore";

interface ContentRailSectionProps {
  cr_title: string;
  type: ContentRailType;
  items: ContentRailItem[];
  onItemClick?: (item: ContentRailItem) => void;
  onViewAllClick?: () => void;
  onGenreClick?: (genreName: string) => void;
  railId?: string;
  totalPages?: number;
  disableHover?: boolean;
  limit?: number;
  subnavId?: number;
  button_name?: string;
  more_enabled?: boolean;
  index: number;
}

export function ContentRailSection({
  cr_title,
  type,
  items: initialItems,
  onItemClick,
  onViewAllClick,
  onGenreClick,
  railId,
  totalPages,
  disableHover = false,
  limit,
  subnavId,
  button_name,
  more_enabled,
  index
}: ContentRailSectionProps) {
  const t = useTranslations("contentRails");
  const router = useRouter();

  const { items, isLoadingMore, loadNextPage } = useRailItems(
    railId,
    initialItems,
    totalPages,
    limit ?? 20,
    type === ContentRailType.CONTINUE_WATCHING
  );

  const [hasBeenVisible, setHasBeenVisible] = useState(() => {
    return index < 2 || type === ContentRailType.HERO_CAROUSEL;
  });
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "1500px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const baseConfig = CONTENT_RAIL_DESIGN_CONFIG[type];
  const config = baseConfig
    ? {
      ...baseConfig,
      hover: {
        ...baseConfig.hover,
        enabled: disableHover ? false : baseConfig.hover?.enabled,
      },
    }
    : undefined;

  const handleItemClick = (item: ContentRailItem) => {
    try {
      const itemPosition = items.findIndex((i) => i?.id === item?.id);
      const clickProps = buildContentClickedProperties(
        item,
        cr_title,
        railId ?? undefined,
        config?.variant || type,
        itemPosition >= 0 ? itemPosition : undefined
      );

      analyticsService.track(EVENT_NAMES.CONTENT_CLICKED, clickProps);

    } catch (e) {
      logger.error("[ContentRailSection] Failed to track content_clicked event:", e);
    }

    logger.info("name_analyticsname_analytics", item)
    if (type === ContentRailType.GENRE || config?.variant === RailCardVariant.GENRE) {
      const genreName = item.name_analytics || item.title;
      if (genreName) {
        const slug = slugify(genreName);
        if (onGenreClick) {
          onGenreClick(genreName.toLowerCase());
        }
        router.push(`${ROUTES.GENRE}?genre=${slug}`);
        return;
      }
    }
    // Non-genre — let the parent handle it
    onItemClick?.(item);
  };


  const listRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const listEl = listRef.current;
    const checkScroll = () => {
      if (listEl) {
        const { scrollLeft, scrollWidth, clientWidth } = listEl;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
        setShowArrows(scrollWidth > clientWidth);
        // Fetch the next page if the user scrolls near the right end of the loaded list (within 400px)
        const isNearRightEnd = scrollWidth - scrollLeft - clientWidth < 400;
        if (isNearRightEnd && hasBeenVisible) {
          loadNextPage();
        }
      }
    };

    checkScroll();
    window.addEventListener("resize", checkScroll);
    if (listEl) {
      listEl.addEventListener("scroll", checkScroll, { passive: true });
    }

    const timer = setTimeout(checkScroll, 150);

    return () => {
      window.removeEventListener("resize", checkScroll);
      if (listEl) {
        listEl.removeEventListener("scroll", checkScroll);
      }
      clearTimeout(timer);
    };
  }, [items, isExpanded, loadNextPage, railId, cr_title, hasBeenVisible]);


  if (!config || !items?.length) return null;

  const isHero = config.variant === RailCardVariant.HERO;

  const handleScroll = (direction: "left" | "right") => {
    if (listRef.current) {
      const scrollAmount = direction === "left"
        ? -listRef.current.clientWidth * 0.75
        : listRef.current.clientWidth * 0.75;
      listRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const isLandscape = config.variant === RailCardVariant.LANDSCAPE || config.variant === RailCardVariant.CONTINUE_WATCHING;
  const isGenre = config.variant === RailCardVariant.GENRE;
  const isW_270 = config.width === 270;
  const mobileHeight = isLandscape ? "170px" : isGenre ? "58px" : isW_270 ? "210px" : "200px";

  if (!hasBeenVisible && !isHero) {
    const gap = config.gap ?? 16;
    const cardCount = type === ContentRailType.LANDSCAPE || type === ContentRailType.CONTINUE_WATCHING ? 6 : 10;
    const desktopWidth = config.width;
    const desktopHeight = config.height;

    let mobileWidth = "135px";
    let mobileHeightVal = "200px";

    if (
      desktopWidth >= 580 ||
      config.variant === "landscape" ||
      config.variant === "continueWatching"
    ) {
      mobileWidth = "280px";
      mobileHeightVal = "170px";
    } else if (config.variant === RailCardVariant.GENRE) {
      mobileWidth = "130px";
      mobileHeightVal = "58px";
    } else if (desktopWidth === 270) {
      mobileWidth = "145px";
      mobileHeightVal = "210px";
    }

    return (
      <section
        ref={sectionRef}
        className="mb-5 w-full"
        style={{
          "--rail-card-desktop-height": `${config.height}px`,
          "--rail-card-mobile-height": mobileHeight,
        } as React.CSSProperties}
      >
        <div className="flex items-center justify-between w-full px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold sm:title-lg-semibold text-theme_1 mb-3">{cr_title}</h2>
        </div>
        <div
          className="flex overflow-x-hidden pb-4 px-4 sm:px-6 lg:px-14"
          style={{ gap: `${gap}px` }}
        >
          {[...Array(cardCount)].map((_, i) => (
            <div
              key={i}
              className="shrink-0 bg-theme_1/8 rounded-lg animate-pulse w-[var(--d-w)] h-[var(--d-h)] max-sm:w-[var(--m-w)] max-sm:h-[var(--m-h)]"
              style={{
                "--d-w": `${desktopWidth}px`,
                "--d-h": `${desktopHeight}px`,
                "--m-w": mobileWidth,
                "--m-h": mobileHeightVal,
                borderRadius: `${config.borderRadius ?? 8}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={`${isHero ? "mb-10 w-full" : "mb-2 w-full hover:z-[50]"} relative`}>
      {!isHero && (
        <div className="relative z-50 flex items-center justify-between w-full px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold sm:title-lg-semibold text-theme_1">
            {cr_title}
          </h2>

          {/* More button removed for TV UI */}
        </div>
      )}

      <div
        className={`relative group/rail-container w-full ${isHero ? "mt-0" : "mt-[15px]"}`}
        style={{
          "--rail-card-desktop-height": `${config.height}px`,
          "--rail-card-mobile-height": mobileHeight,
        } as React.CSSProperties}
      >


        <ContentRailList
          items={items}
          config={config}
          type={type}
          onItemClick={handleItemClick}
          listRef={listRef}
          isExpanded={isExpanded}
          isLoadingMore={isLoadingMore}
        />
      </div>
    </section>
  );
}