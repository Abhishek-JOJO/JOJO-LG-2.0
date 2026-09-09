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
import { useActiveRailStore } from "@/store/useActiveRailStore";

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

  const sectionRef = useRef<HTMLDivElement>(null);
  const isHeroSection = type === ContentRailType.HERO_CAROUSEL;
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
        if (isNearRightEnd) {
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
  }, [items, isExpanded, loadNextPage, railId, cr_title]);


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

  const activeSectionIndex = useActiveRailStore((s) => s.activeSectionIndex);
  const isSectionActive = activeSectionIndex === index;
  const hasAnyRailActive = activeSectionIndex !== null && activeSectionIndex > 0;

  const isPortraitRail = !isHero && (
    config.variant === RailCardVariant.SERIES_MIXED ||
    config.variant === RailCardVariant.PORTRAIT ||
    config.variant === RailCardVariant.TOP_TEN
  );
  const railCardDesktopHeight = isPortraitRail ? "490px" : `${config.height}px`;

  return (
    <section
      ref={sectionRef}
      data-section-index={index}
      className={`${isHero ? "mb-10 w-full" : "mb-10 w-full"} relative transition-opacity duration-300 ease-out ${
        !isHero && hasAnyRailActive
          ? isSectionActive
            ? "opacity-100 z-20"
            : "opacity-35 z-10"
          : "opacity-100"
      }`}
      style={{
        scrollMarginTop: "95px",
      }}
    >
      {!isHero && (
        <div className="relative z-50 flex items-center justify-between w-full px-6 sm:px-12 lg:px-16 mb-3">
          <h2
            className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
              hasAnyRailActive && !isSectionActive ? "text-white/40" : "text-white"
            }`}
          >
            {cr_title}
          </h2>

          {/* More button removed for TV UI */}
        </div>
      )}

      <div
        className={`relative group/rail-container w-full ${isHero ? "mt-0" : "mt-2"}`}
        style={{
          "--rail-card-desktop-height": railCardDesktopHeight,
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