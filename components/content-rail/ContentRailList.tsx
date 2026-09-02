"use client";

import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { appConfig } from "@/lib/config/app.config";
import { minSwipeDistance, THUMB_CONFIG } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { memo, useEffect, useState, useCallback, useId } from "react";
import { FocusContext, useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { HeroCarouselCard } from "./cards/HeroCarouselCard";
import { LandscapeCard } from "./cards/LandscapeCard";
import { PortraitCard } from "./cards/PortraitCard";
import { ContinueWatchingCard } from "./cards/ContinueWatchingCard";
import { RailCardAspectRatio, RailCardDesignConfig, RailCardHeight, RailCardWidth } from "./config/contentRail.config";
import { ContentRailItem, ContentRailType, RailCardVariant } from "./config/contentRail.types";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { mapBatchAssetAccess, useBatchAssetAccess } from "@/features/content/hooks/useBatchAssetAccess";

interface ContentRailListProps {
  items: ContentRailItem[];
  config: RailCardDesignConfig;
  type?: ContentRailType;
  onItemClick?: (item: ContentRailItem) => void;
  listRef?: React.RefObject<HTMLDivElement | null>;
  isExpanded?: boolean;
  showAutoplayProgress?: boolean;
  isLoadingMore?: boolean;
}

interface SpotlightCommonProps {
  item: ContentRailItem;
  index: number;
  itemsLength?: number;
  config: RailCardDesignConfig;
  onClick: (item: ContentRailItem) => void;
}

/**
 * Renders one slot of a spotlight rail. Slot 0 is a sticky landscape frame
 * (CSS `sticky left-0`, pinned while the rest of the row scrolls behind it)
 * that's the *only* D-pad-focusable element in the rail; every other slot
 * is a small, non-focusable (mouse-clickable only) portrait card.
 *
 * The row doesn't scroll to browse — instead, each slot always shows
 * `items[(leadIndex + slotIdx) % items.length]` (see the caller), so
 * pressing Left/Right on the lead card *shifts what every slot displays*:
 * item 2 moves into the landscape slot, item 3 moves into what was item 2's
 * portrait slot, and so on — a true Hotstar-style shifting carousel, not a
 * fixed-position preview swap.
 */
function renderSpotlightRailItem(
  slotIdx: number,
  effectiveItem: ContentRailItem,
  keyId: string,
  commonProps: SpotlightCommonProps,
  config: RailCardDesignConfig,
  leadFocusKey: string,
  railActive: boolean,
  onCycle: (direction: "left" | "right") => void
) {
  if (slotIdx === 0) {
    const landscapeConfig: RailCardDesignConfig = {
      ...config,
      variant: RailCardVariant.LANDSCAPE,
      width: RailCardWidth.W_462,
      height: RailCardHeight.H_270,
      aspectRatio: RailCardAspectRatio.WIDESCREEN_16_9,
      hover: {
        ...config.hover,
        enabled: true,
        type: "card",
      },
      // @ts-ignore
      isMixedSeries: true,
    };
    return (
      <LandscapeCard
        key={keyId}
        {...commonProps}
        item={effectiveItem}
        config={landscapeConfig}
        className="sticky left-0 z-20"
        focusKey={leadFocusKey}
        forceFocusRing={railActive}
        railActive={railActive}
        onArrowLeftRight={onCycle}
      />
    );
  }

  const portraitConfig: RailCardDesignConfig = {
    ...config,
    variant: RailCardVariant.PORTRAIT,
    width: RailCardWidth.W_180,
    height: RailCardHeight.H_270,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    hover: {
      ...config.hover,
      enabled: false,
      type: "simple",
    },
    // @ts-ignore
    isMixedSeries: true,
  };
  return (
    <PortraitCard
      key={keyId}
      {...commonProps}
      item={effectiveItem}
      config={portraitConfig}
      focusable={false}
    />
  );
}




export function ContentRailList({
  items,
  config,
  type,
  onItemClick,
  listRef,
  isExpanded = false,
  showAutoplayProgress = appConfig.flags.isShowAutoProgressBarHeroBanner,
  isLoadingMore = false,
}: ContentRailListProps) {
  const [virtualIndex, setVirtualIndex] = useState(0);
  // Spotlight rails: index of whichever item currently occupies the lead
  // (landscape) slot. Every other slot displays items shifted forward from
  // this one — see `renderSpotlightRailItem`. Resets whenever the rail's
  // own lead item changes (new data, filter switch).
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const activeIndex = items?.length ? ((virtualIndex % items.length) + items.length) % items.length : 0;

  // Unique per-rail-instance id so the lead card's focus key never collides
  // with another rail's on the same page.
  const railInstanceId = useId();
  const isSpotlightRail = config.variant === RailCardVariant.SERIES_MIXED || config.variant === RailCardVariant.PORTRAIT;
  // Only the lead (landscape) slot is ever focusable in a spotlight rail, so
  // this key is stable regardless of which item currently occupies it.
  const leadFocusKey = `spotlight-lead-${railInstanceId}`;

  const handleCycle = useCallback((direction: "left" | "right") => {
    if (!items?.length) return;
    setSpotlightIndex((prev) => {
      const next = direction === "right" ? prev + 1 : prev - 1;
      return ((next % items.length) + items.length) % items.length;
    });
  }, [items]);

  // Focus boundary around the row: guarantees the lead card is what actually
  // receives spatial-nav focus whenever this rail is (re-)entered — via
  // `preferredChildFocusKey` — rather than leaving it to whichever card
  // nearest-neighbor resolution happens to pick.
  const { ref: railBoundaryRef, focusKey: railBoundaryFocusKey, hasFocusedChild: railActive } = useFocusable({
    focusable: false,
    trackChildren: true,
    saveLastFocusedChild: false,
    preferredChildFocusKey: leadFocusKey,
  });
  const { isDragging } = useDragScroll(listRef);
  const isAnyCardHovered = usePlayerStore((s) => s.isAnyCardHovered);
  const isSearchOpen = usePlayerStore((s) => s.isSearchOpen);
  const isAssetDetailOpen = useAssetDetailStore((s) => s.isOpen);

  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleItemClick = useCallback((item: ContentRailItem) => {
    onItemClick?.(item);
  }, [onItemClick]);

  // Reset video playing state when slide changes
  useEffect(() => {
    setIsVideoPlaying(false);
  }, [virtualIndex]);

  // Reset the spotlight preview when the rail's lead item changes (new data,
  // filter switch) so a stale index doesn't preview an unrelated item.
  useEffect(() => {
    setSpotlightIndex(0);
  }, [items?.[0]?.id]);

  useEffect(() => {
    if (config.variant !== RailCardVariant.HERO || !items?.length || isAutoplayPaused || isAnyCardHovered || isSearchOpen || isAssetDetailOpen || isVideoPlaying) return;
    const interval = setInterval(() => {
      setVirtualIndex((prev) => prev + 1);
    }, appConfig.AUTOSCROLL_TIME);
    return () => clearInterval(interval);
  }, [virtualIndex, items?.length, config?.variant, isAutoplayPaused, isAnyCardHovered, isSearchOpen, isAssetDetailOpen, isVideoPlaying]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setVirtualIndex((prev) => prev + 1);
    } else if (isRightSwipe) {
      setVirtualIndex((prev) => prev - 1);
    }
  };

  const isHeroVariant = config?.variant === RailCardVariant.HERO || type === ContentRailType.HERO_CAROUSEL;
  const heroAssetIds = isHeroVariant && items?.length
    ? items
      .filter((i) => i?.isTVOD || String(i?.assetCategory).toLowerCase() === "tvod" || String(i?.assetCategory) === "3")
      .map((i) => String(i.assetId || i.id))
    : [];
  const { data: batchAccessData } = useBatchAssetAccess(heroAssetIds, isHeroVariant && heroAssetIds.length > 0);

  const extendedItems = items?.length > 1 ? [items[items.length - 1], ...items, items[0]] : (items || []);

  const { ref: focusKeyRef, focusKey, focused } = useFocusable({
    focusKey: isHeroVariant ? "hero-carousel" : undefined,
    focusable: isHeroVariant,
    onArrowPress: (direction) => {
      if (!isHeroVariant) return true;
      if (direction === 'left') {
        if (items?.length > 1) {
          setIsAutoplayPaused(true);
          setVirtualIndex((prev) => (prev - 1 + items.length) % items.length);
        }
        return false;
      }
      if (direction === 'right') {
        if (items?.length > 1) {
          setIsAutoplayPaused(true);
          setVirtualIndex((prev) => (prev + 1) % items.length);
        }
        return false;
      }
      if (direction === 'up') {
        setFocus('nav-link-0');
        return false;
      }
      if (direction === 'down') {
        // Always focus the 1st card in the content section directly below hero carousel, regardless of active hero slider index
        const firstCardBelowHero = document.querySelector(
          'section:not(:first-child) [data-focuskey]:not([data-focuskey="hero-carousel"])'
        );
        if (firstCardBelowHero) {
          const targetFocusKey = firstCardBelowHero.getAttribute('data-focuskey');
          if (targetFocusKey) {
            setFocus(targetFocusKey);
            return false;
          }
        }
      }
      return true;
    },
    onEnterPress: () => {
      if (isHeroVariant && items?.length) {
        onItemClick?.(extendedItems[items.length > 1 ? activeIndex + 1 : activeIndex]);
      }
    },
    onFocus: () => {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  });

  if (isHeroVariant) {
    if (!items?.length) return null;

    return (
      <div
        id="hero-carousel-container"
        ref={focusKeyRef}
        data-focuskey={focusKey}
        className={`relative overflow-hidden w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)] mx-auto select-none h-[75vh] mt-2 sm:mt-3 rounded-[32px] border-[1.5px] shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-300 ${focused ? "ring-[4px] ring-white z-[99] border-white scale-[1.01]" : "border-white/10"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{ transform: `translateX(calc(-${(items?.length > 1 ? activeIndex + 1 : activeIndex) * 100}%))` }}
        >
          {extendedItems.map((item, index) => {
            const isActive = items?.length > 1 ? index === activeIndex + 1 : index === activeIndex;
            const targetAssetId = item.assetId || item.id;
            const batchPricing = mapBatchAssetAccess(batchAccessData, targetAssetId);

            return (
              <div
                key={`${item.id}-${index}`}
                className="w-full shrink-0 h-full relative"
              >
                <div
                  className={`relative w-full h-full transition-all duration-700 ease-out ${isActive ? "" : "pointer-events-none"}`}
                >
                  <HeroCarouselCard
                    item={item}
                    index={index}
                    isActive={isActive}
                    config={config}
                    onClick={() => onItemClick?.(item)}
                    onHoverChange={setIsAutoplayPaused}
                    onVideoPlayChange={setIsVideoPlaying}
                    batchPricing={batchPricing}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Dots */}
        {items?.length > 1 && (
          <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-12 lg:bottom-12 lg:right-16 flex gap-2 z-[100]">
            {items.map((_, dotIndex) => (
              <div
                key={dotIndex}
                onClick={() => {
                  setVirtualIndex(dotIndex);
                  setIsAutoplayPaused(true);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${dotIndex === activeIndex ? "w-6 bg-theme_1" : "w-2 bg-theme_1/50 hover:bg-theme_1/80"
                  }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isExpanded) {
    const isLandscape = config.variant === RailCardVariant.LANDSCAPE || config.variant === RailCardVariant.CONTINUE_WATCHING;
    const isLargeLandscape = isLandscape && config.width === 580;

    let gridCols = "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8";
    if (isLargeLandscape) {
      gridCols = "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
    } else if (isLandscape) {
      gridCols = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
    }

    return (
      <div
        className={`grid ${gridCols} gap-y-8 gap-x-4 sm:gap-x-6 lg:gap-x-14 px-4 sm:px-6 lg:px-14 pt-4 pb-6`}
      >
        {items?.map((item, index) => {
          const commonProps = {
            item,
            index,
            itemsLength: items?.length,
            config,
            onClick: handleItemClick,
          };

          switch (config.variant) {
            case RailCardVariant.LANDSCAPE:
            case RailCardVariant.GENRE:
              return <LandscapeCard key={item?.id} {...commonProps} />;

            case RailCardVariant.CONTINUE_WATCHING:
              return <ContinueWatchingCard key={item?.id} {...commonProps} />;

            case RailCardVariant.SERIES_MIXED:
              return <PortraitCard key={item.id} {...commonProps} />;

            case RailCardVariant.TOP_TEN:
            case RailCardVariant.ARTIST:
            case RailCardVariant.UPCOMING:
            case RailCardVariant.PORTRAIT:
            default:
              return <PortraitCard key={item.id} {...commonProps} />;
          }
        })}
      </div>
    );
  }

  const cardElements = items?.map((originalItem, index) => {
    // Spotlight rails don't scroll to browse — each slot always displays
    // whichever item currently sits `index` steps past the lead, wrapping
    // around the end of the list. Left/Right on the lead card advances
    // `spotlightIndex`, which shifts every slot's content at once.
    const effectiveItem = isSpotlightRail
      ? items[(spotlightIndex + index) % items.length]
      : originalItem;

    const commonProps = {
      item: effectiveItem,
      index,
      itemsLength: items?.length,
      config,
      onClick: handleItemClick,
    };

    switch (config.variant) {
      case RailCardVariant.LANDSCAPE:
      case RailCardVariant.GENRE:
        return <LandscapeCard key={originalItem?.id} {...commonProps} />;

      case RailCardVariant.CONTINUE_WATCHING:
        return <ContinueWatchingCard key={originalItem?.id} {...commonProps} />;

      // Hotstar-style spotlight rail: slot 0 is a sticky landscape frame that
      // stays pinned while the rest of the row scrolls behind it. It's the
      // only D-pad-focusable slot — Left/Right shifts which item every slot
      // displays instead of moving focus onto the small cards.
      case RailCardVariant.SERIES_MIXED:
      case RailCardVariant.PORTRAIT:
      default:
        return renderSpotlightRailItem(
          index,
          effectiveItem,
          originalItem?.id,
          commonProps,
          config,
          leadFocusKey,
          railActive,
          handleCycle
        );

      case RailCardVariant.TOP_TEN:
      case RailCardVariant.ARTIST:
      case RailCardVariant.UPCOMING:
        return <PortraitCard key={originalItem.id} {...commonProps} />;
    }
  });

  let skeletonElement: React.ReactNode = null;
  if (isLoadingMore && !isExpanded) {
    let skeletonMobileWidth = "135px";
    let skeletonMobileHeight = "203px";

    if (config.variant === RailCardVariant.SERIES_MIXED) {
      skeletonMobileWidth = "105px";
      skeletonMobileHeight = "158px";
    } else if (
      config.width >= RailCardWidth.W_580 ||
      config.variant === RailCardVariant.LANDSCAPE ||
      config.variant === RailCardVariant.CONTINUE_WATCHING
    ) {
      skeletonMobileWidth = "280px";
      skeletonMobileHeight = "158px";
    } else if (config.variant === RailCardVariant.GENRE) {
      skeletonMobileWidth = "160px";
      skeletonMobileHeight = "90px";
    } else if (config.width === RailCardWidth.W_270) {
      skeletonMobileWidth = "145px";
      skeletonMobileHeight = "193px";
    }

    skeletonElement = (
      <div
        className="shrink-0 rounded-lg skeleton bg-white/5 flex items-center justify-center text-white/20 select-none animate-pulse w-[var(--desktop-width)] h-[var(--desktop-height)] max-sm:w-[var(--mobile-width)] max-sm:h-[var(--mobile-height)]"
        style={{
          "--desktop-width": `${config.width}px`,
          "--desktop-height": `${config.height}px`,
          "--mobile-width": skeletonMobileWidth,
          "--mobile-height": skeletonMobileHeight,
          borderRadius: config.borderRadius,
        } as React.CSSProperties}
      >
        <div className="w-6 h-6 border-2 border-t-transparent border-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <FocusContext.Provider value={railBoundaryFocusKey}>
      <div
        ref={(node) => {
          if (railBoundaryRef) {
            if (typeof (railBoundaryRef as any) === "function") (railBoundaryRef as any)(node);
            else (railBoundaryRef as any).current = node;
          }
          if (isHeroVariant && focusKeyRef) {
            if (typeof (focusKeyRef as any) === "function") (focusKeyRef as any)(node);
            else (focusKeyRef as any).current = node;
          }
          if (listRef) {
            (listRef as any).current = node;
          }
        }}
        className={`flex flex-nowrap overflow-x-auto overflow-y-hidden scrollbar-hide pb-6 pt-2 mt-0 ${isSpotlightRail ? "pl-0 pr-4 sm:pr-6 lg:pr-8" : "px-4 sm:px-6 lg:px-8"} ${isDragging ? "scroll-auto cursor-grabbing select-none" : "scroll-smooth cursor-grab"}`}
        style={{ gap: `${config?.gap}px` }}
      >
        {isSpotlightRail && (
          <div
            className="w-4 sm:w-6 lg:w-8 shrink-0"
            style={{ marginRight: `-${config?.gap ?? 0}px` }}
            aria-hidden="true"
          />
        )}
        {cardElements}
        {skeletonElement}
      </div>
    </FocusContext.Provider>
  );
}