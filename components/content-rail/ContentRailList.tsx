"use client";

import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { appConfig } from "@/lib/config/app.config";
import { minSwipeDistance, THUMB_CONFIG } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { memo, useEffect, useState, useCallback, useId, useRef } from "react";
import { FocusContext, useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { HeroCarouselCard } from "./cards/HeroCarouselCard";
import { LandscapeCard } from "./cards/LandscapeCard";
import { PortraitCard } from "./cards/PortraitCard";
import { ContinueWatchingCard } from "./cards/ContinueWatchingCard";
import { GenreCard } from "./cards/GenreCard";
import { RailCardAspectRatio, RailCardDesignConfig, RailCardHeight, RailCardWidth } from "./config/contentRail.config";
import { ContentRailItem, ContentRailType, RailCardVariant } from "./config/contentRail.types";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { mapBatchAssetAccess, useBatchAssetAccess } from "@/features/content/hooks/useBatchAssetAccess";
import { useActiveRailStore } from "@/store/useActiveRailStore";
import { extractDominantAmbientColor } from "@/lib/utils/colorExtractor";
import { useAmbientTintStore } from "@/store/useAmbientTintStore";
import { preloadImageUrl, preloadRailItems } from "./utils/imagePreloader";

interface ContentRailListProps {
  items: ContentRailItem[];
  config: RailCardDesignConfig;
  type?: ContentRailType;
  onItemClick?: (item: ContentRailItem) => void;
  listRef?: React.RefObject<HTMLDivElement | null>;
  isExpanded?: boolean;
  showAutoplayProgress?: boolean;
  isLoadingMore?: boolean;
  isFirstContentRail?: boolean;
  onArrowUpDown?: (direction: "up" | "down") => boolean | void;
  /** Makes standard (non-spotlight) cards D-pad focusable — used for rails rendered inside a modal (e.g. search) that aren't the home page's disabled preview rows. Defaults to false, preserving existing behavior everywhere else. */
  forceFocusable?: boolean;
  /** Whether this rail has more pages left to fetch from the API — used to prefetch page N+1 ahead of the user reaching the end via remote navigation. */
  hasMore?: boolean;
  /** Fetches the next page of this rail's items; safe to call repeatedly (no-ops while a fetch is already in flight). */
  loadNextPage?: () => void;
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
 * `items[(leadIndex + slotIdx) % items.length]`, so pressing Left/Right on
 * the lead card *shifts what every slot displays*: item 2 moves into the
 * landscape slot, item 3 moves into what was item 2's portrait slot, etc.
 */
function renderSpotlightRailItem(
  slotIdx: number,
  effectiveItem: ContentRailItem,
  keyId: string,
  commonProps: SpotlightCommonProps,
  config: RailCardDesignConfig,
  leadFocusKey: string,
  railActive: boolean,
  onCycle: (direction: "left" | "right") => void,
  onArrowUpDown?: (direction: "up" | "down") => boolean | void
) {
  const isContinueWatching =
    config.variant === RailCardVariant.CONTINUE_WATCHING ||
    Boolean((config as any)?.showProgress);
  const isTopTen = config.variant === RailCardVariant.TOP_TEN;

  if (slotIdx === 0) {
    const slot0Config: RailCardDesignConfig = {
      ...config,
      variant: isContinueWatching
        ? RailCardVariant.CONTINUE_WATCHING
        : RailCardVariant.LANDSCAPE,
      width: 870.89 as any,
      height: 490 as any,
      borderRadius: 16,
      aspectRatio: RailCardAspectRatio.WIDESCREEN_16_9,
      hover: {
        ...config.hover,
        enabled: railActive,
        type: railActive ? "card" : "simple",
      },
      // @ts-ignore
      isMixedSeries: !isContinueWatching,
    };

    const leadCard = isContinueWatching ? (
      <ContinueWatchingCard
        key={keyId}
        {...commonProps}
        item={effectiveItem}
        config={slot0Config}
        className="relative shrink-0 z-20"
        focusKey={leadFocusKey}
        forceFocusRing={railActive}
        railActive={railActive}
        onArrowLeftRight={onCycle}
        onArrowUpDown={onArrowUpDown}
      />
    ) : (
      <LandscapeCard
        key={keyId}
        {...commonProps}
        item={effectiveItem}
        config={slot0Config}
        className="relative shrink-0 z-20"
        focusKey={leadFocusKey}
        forceFocusRing={railActive}
        railActive={railActive}
        onArrowLeftRight={onCycle}
        onArrowUpDown={onArrowUpDown}
      />
    );

    if (isTopTen) {
      const rank = effectiveItem.rank ?? slotIdx + 1;
      return (
        <div key={keyId} className="relative flex shrink-0 items-end pl-8 sm:pl-10 md:pl-12">
          <span
            className="absolute left-0 -bottom-4 z-20 text-[80px] sm:text-[95px] md:text-[125px] font-black leading-none text-neutral-950 [-webkit-text-stroke:2px_var(--theme_1)] sm:[-webkit-text-stroke:3px_var(--theme_1)] drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
          >
            {rank}
          </span>
          {leadCard}
        </div>
      );
    }

    return leadCard;
  }

  const portraitConfig: RailCardDesignConfig = {
    ...config,
    variant: isContinueWatching
      ? RailCardVariant.CONTINUE_WATCHING
      : isTopTen
        ? RailCardVariant.TOP_TEN
        : RailCardVariant.PORTRAIT,
    width: 325.77 as any,
    height: 490 as any,
    borderRadius: 16,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    hover: {
      ...config.hover,
      enabled: false,
      type: "simple",
    },
    // @ts-ignore
    isMixedSeries: !isContinueWatching,
  };

  if (isContinueWatching) {
    return (
      <ContinueWatchingCard
        key={keyId}
        {...commonProps}
        item={effectiveItem}
        config={portraitConfig}
        focusable={false}
      />
    );
  }

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
  isFirstContentRail = false,
  onArrowUpDown,
  hasMore = false,
  loadNextPage,
  forceFocusable = false,
}: ContentRailListProps) {
  const [virtualIndex, setVirtualIndex] = useState(0);
  const activeIndex = items?.length ? ((virtualIndex % items.length) + items.length) % items.length : 0;
  const { isDragging } = useDragScroll(listRef);
  const isAnyCardHovered = usePlayerStore((s) => s.isAnyCardHovered);
  const isSearchOpen = usePlayerStore((s) => s.isSearchOpen);
  const isAssetDetailOpen = useAssetDetailStore((s) => s.isOpen);

  const isHeroVariant = config?.variant === RailCardVariant.HERO || type === ContentRailType.HERO_CAROUSEL;

  // Only the active hero slide and, briefly while crossfading, the previously
  // active one are ever mounted — not every slide at once. All slides sit at
  // the exact same on-screen position (only opacity tells them apart), so the
  // browser can't spatially cull the off-screen ones the way it could when
  // they were physically laid out side by side for the old translateX slide —
  // keeping every slide as a live, full-screen composited layer the whole
  // time was the actual source of the jank on this TV's GPU, not the
  // crossfade itself. Capping it at the two genuinely transitioning removes
  // that cost while looking identical.
  const HERO_CROSSFADE_MS = 900;
  const [renderedHeroIndices, setRenderedHeroIndices] = useState<Set<number>>(() => new Set([activeIndex]));
  // A CSS opacity transition only animates when a property changes on an
  // element the browser has already painted at least once — an element
  // mounted straight into "opacity-100" has no prior frame to transition
  // from, so it just pops in instantly instead of fading in. Since the
  // incoming slide only gets mounted the moment it becomes active, it needs
  // to be painted once at opacity-0 first; revealedHeroIndex is what's
  // actually used for the opacity class, and only catches up to activeIndex
  // a frame later (after that opacity-0 frame has genuinely been painted),
  // so the fade-in is a real transition instead of a snap.
  const [revealedHeroIndex, setRevealedHeroIndex] = useState(activeIndex);
  const prevHeroIndexRef = useRef(activeIndex);
  useEffect(() => {
    if (!isHeroVariant) return;
    if (prevHeroIndexRef.current === activeIndex) return;
    const prev = prevHeroIndexRef.current;
    prevHeroIndexRef.current = activeIndex;
    setRenderedHeroIndices(new Set([prev, activeIndex]));
    const raf = requestAnimationFrame(() => {
      setRevealedHeroIndex(activeIndex);
    });
    // A little past the CSS transition's own duration — unmounting the
    // outgoing slide exactly when the transition is nominally "done" risks a
    // race against the browser's own paint timing that can yank it out a
    // frame before the fade has actually finished, reading as a hard cut
    // instead of a smooth finish.
    const timer = setTimeout(() => {
      setRenderedHeroIndices(new Set([activeIndex]));
    }, HERO_CROSSFADE_MS + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [activeIndex, isHeroVariant]);

  useEffect(() => {
    if (!isHeroVariant || !items?.length) return;
    const activeItem = items[activeIndex];
    const heroImageUrl =
      activeItem?.heroImage ||
      activeItem?.landscapeImage ||
      activeItem?.posterImage ||
      activeItem?.image;

    if (heroImageUrl) {
      extractDominantAmbientColor(heroImageUrl).then((color) => {
        useAmbientTintStore.getState().setAmbientColor(color);
      });
    }
  }, [isHeroVariant, items, activeIndex]);

  // Spotlight rail config (sticky card 0 + fixed focus cycling)
  // ONLY enabled for the single active spotlight rail (isFirstContentRail, never for Genre)
  const isSpotlightRail = !isHeroVariant && !isExpanded && Boolean(isFirstContentRail) && config?.variant !== RailCardVariant.GENRE && type !== ContentRailType.GENRE;
  const leadFocusKey = "spotlight-lead-fixed";
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const handleCycle = useCallback((direction: "left" | "right") => {
    if (!items?.length) return;
    setSpotlightIndex((prev) => {
      const next = direction === "right" ? prev + 1 : prev - 1;
      return ((next % items.length) + items.length) % items.length;
    });
  }, [items]);

  // Reset spotlightIndex synchronously when the rail's items change (e.g. switching
  // rails on ArrowUp/Down). Using React's documented "adjust state during render"
  // pattern here — not an effect — so the very first paint after the switch already
  // shows card 0 instead of flashing the previous rail's stale index for one frame.
  const [prevLeadItemId, setPrevLeadItemId] = useState(items?.[0]?.id);
  if (items?.[0]?.id !== prevLeadItemId) {
    setPrevLeadItemId(items?.[0]?.id);
    setSpotlightIndex(0);
  }

  useEffect(() => {
    if (isSpotlightRail && listRef?.current) {
      listRef.current.scrollLeft = 0;
    }
  }, [isSpotlightRail, spotlightIndex, listRef]);

  // Eagerly preload all rail items on mount so navigating left/right is instant (0ms delay)
  useEffect(() => {
    if (!isSpotlightRail || !items?.length) return;
    preloadRailItems(items, 12);
  }, [isSpotlightRail, items]);

  // When cycling cards in spotlight rail, ensure adjacent items are preloaded immediately
  useEffect(() => {
    if (!isSpotlightRail || !items?.length) return;
    const si = spotlightIndex;
    const nextIdx = (si + 1) % items.length;
    const nextIdx2 = (si + 2) % items.length;
    const prevIdx = (si - 1 + items.length) % items.length;
    [nextIdx, nextIdx2, prevIdx].forEach((idx) => {
      const it = items[idx];
      if (it) {
        preloadImageUrl(it.posterImage || it.heroImage || it.landscapeImage || it.image || it.portraitImage, { width: 871, height: 490 });
        preloadImageUrl(it.title_image);
        preloadImageUrl(it.portraitImage || it.image, { width: 326, height: 490 });
      }
    });
  }, [isSpotlightRail, items, spotlightIndex]);

  // Fetch the next page of this rail's items well before the user reaches the end of what's
  // already loaded, so cycling Right (even held down, repeat-firing every ~100-150ms on a TV
  // remote) never outruns a pagination request — mirrors the rail (row) pagination lookahead.
  useEffect(() => {
    if (!isSpotlightRail || !hasMore || !loadNextPage || !items?.length) return;
    if (spotlightIndex >= items.length - 10) {
      loadNextPage();
    }
  }, [isSpotlightRail, hasMore, loadNextPage, items?.length, spotlightIndex]);


  const { ref: railBoundaryRef, focusKey: railBoundaryFocusKey, hasFocusedChild: railActive } = useFocusable({
    focusable: false,
    trackChildren: true,
    saveLastFocusedChild: false,
    preferredChildFocusKey: leadFocusKey,
  });

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

  const heroAssetIds = isHeroVariant && items?.length
    ? items
      .filter((i) => i?.isTVOD || String(i?.assetCategory).toLowerCase() === "tvod" || String(i?.assetCategory) === "3")
      .map((i) => String(i.assetId || i.id))
    : [];
  const { data: batchAccessData } = useBatchAssetAccess(heroAssetIds, isHeroVariant && heroAssetIds.length > 0);

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
        const navLink = document.querySelector('header nav a[data-focuskey], header [data-focuskey]') as HTMLElement | null;
        if (navLink) {
          navLink.focus();
          const targetKey = navLink.getAttribute('data-focuskey');
          if (targetKey) {
            try { setFocus(targetKey); } catch { }
          }
        } else {
          try { setFocus('nav-link-0'); } catch { }
        }
        return false;
      }
      if (direction === 'down') {
        // Always focus the 1st card in the content section directly below hero carousel (Section 1)
        const firstCardBelowHero = (
          document.querySelector('section[data-section-index="1"] [data-focuskey*="spotlight-lead"]') ||
          document.querySelector('section[data-section-index="1"] [data-focuskey]') ||
          document.querySelector('section:not(:first-child) [data-focuskey]')
        ) as HTMLElement | null;
        if (firstCardBelowHero) {
          const targetFocusKey = firstCardBelowHero.getAttribute('data-focuskey');
          const currentSection = firstCardBelowHero.closest('section');
          if (currentSection) {
            const sIndex = currentSection.getAttribute('data-section-index');
            useActiveRailStore.getState().setActiveSectionIndex(sIndex !== null ? Number(sIndex) : 1);
            const rect = currentSection.getBoundingClientRect();
            const targetTop = Math.max(0, (window.scrollY || window.pageYOffset) + rect.top - 105);
            window.scrollTo({
              top: targetTop,
              behavior: 'auto'
            });
          }
          firstCardBelowHero.focus({ preventScroll: true });
          if (targetFocusKey) {
            try { setFocus(targetFocusKey); } catch { }
          }
          return false;
        }
      }
      return true;
    },
    onEnterPress: () => {
      if (isHeroVariant && items?.length) {
        onItemClick?.(items[activeIndex]);
      }
    },
    onFocus: () => {
      // D-pad focus should stop autoplay just like mouse hover does
      setIsAutoplayPaused(true);
      useActiveRailStore.getState().setActiveSectionIndex(0);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
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
        tabIndex={0}
        className={`relative overflow-hidden w-[calc(100%-3rem)] sm:w-[calc(100%-6rem)] lg:w-[calc(100%-8rem)] mx-auto select-none h-[75vh] mt-2 sm:mt-3 rounded-[32px] bg-neutral-950 transition-all duration-300 ${focused ? "z-[99]" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Slides are stacked and crossfaded (opacity only) rather than physically
            slid sideways — the OTT-style transition the hero should have. Each
            HeroCarouselCard already stages its own title/badges/genres in with a
            slight rise + stagger once it's active; crossfading the whole card in
            underneath that gives the same layered "background dissolves, content
            cascades in" feel Netflix/Hotstar-style heroes use, instead of the
            whole banner sliding across like a generic carousel. */}
        <div className="relative h-full w-full">
          {items.map((item, index) => {
            if (!renderedHeroIndices.has(index)) return null;
            const isActive = index === revealedHeroIndex;
            const targetAssetId = item.assetId || item.id;
            const batchPricing = mapBatchAssetAccess(batchAccessData, targetAssetId);

            return (
              <div
                key={`${item.id}-${index}`}
                className={`absolute inset-0 h-full w-full transition-opacity duration-[900ms] ease-in-out ${isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
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

        {/* TV Focus Ring Overlay for Hero Slider: clean solid white border, no glow/bloom */}
        {focused && (
          <div
            className="absolute inset-0 z-[110] pointer-events-none rounded-[32px]"
            style={{
              border: "3px solid #ffffff",
            }}
          />
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

  const standardCardConfig: RailCardDesignConfig = {
    ...config,
    variant: config.variant === RailCardVariant.TOP_TEN ? RailCardVariant.TOP_TEN : RailCardVariant.PORTRAIT,
    width: 325.77 as any,
    height: 490 as any,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    borderRadius: 16,
    hover: {
      ...config.hover,
      enabled: false,
      type: "simple",
    },
  };

  // For spotlight rail, only render the 6 visible slots that fit on a 1920px TV screen.
  // Offscreen slots (items 6+) never scroll into view and re-rendering 20 cards on every keypress causes TV CPU lag.
  const visibleItems = isSpotlightRail && items?.length > 6 ? items.slice(0, 6) : (items || []);

  const cardElements = visibleItems.map((originalItem, index) => {
    const effectiveItem = isSpotlightRail && items?.length
      ? items[(spotlightIndex + index) % items.length]
      : originalItem;

    const commonProps = {
      item: effectiveItem,
      index,
      itemsLength: items?.length,
      config: isSpotlightRail ? config : standardCardConfig,
      onClick: handleItemClick,
    };

    switch (config.variant) {
      case RailCardVariant.LANDSCAPE:
        if (isSpotlightRail) {
          return renderSpotlightRailItem(
            index,
            effectiveItem,
            `spotlight-slot-${index}`,
            commonProps,
            config,
            leadFocusKey,
            railActive,
            handleCycle,
            onArrowUpDown
          );
        }
        return (
          <PortraitCard
            key={originalItem?.id || index}
            {...commonProps}
            config={standardCardConfig}
            focusable={forceFocusable}
          />
        );

      case RailCardVariant.GENRE:
        return (
          <GenreCard
            key={originalItem?.id || index}
            item={originalItem}
            config={config}
            index={index}
            focusKey={`genre-${originalItem?.id || (originalItem as any)?.slug || index}`}
            focusable={true}
            onClick={() => handleItemClick(originalItem)}
          />
        );

      case RailCardVariant.CONTINUE_WATCHING:
        if (isSpotlightRail) {
          return renderSpotlightRailItem(
            index,
            effectiveItem,
            `spotlight-slot-${index}`,
            commonProps,
            config,
            leadFocusKey,
            railActive,
            handleCycle,
            onArrowUpDown
          );
        }
        return (
          <PortraitCard
            key={originalItem?.id || index}
            {...commonProps}
            config={standardCardConfig}
            focusable={forceFocusable}
          />
        );

      case RailCardVariant.TOP_TEN:
      case RailCardVariant.SERIES_MIXED:
      case RailCardVariant.PORTRAIT:
      default:
        if (isSpotlightRail) {
          return renderSpotlightRailItem(
            index,
            effectiveItem,
            `spotlight-slot-${index}`,
            commonProps,
            config,
            leadFocusKey,
            railActive,
            handleCycle,
            onArrowUpDown
          );
        }
        return (
          <PortraitCard
            key={originalItem?.id || index}
            {...commonProps}
            config={standardCardConfig}
            focusable={forceFocusable}
          />
        );

      case RailCardVariant.ARTIST:
      case RailCardVariant.UPCOMING:
        return (
          <PortraitCard
            key={originalItem?.id || index}
            {...commonProps}
            config={standardCardConfig}
            focusable={forceFocusable}
          />
        );
    }
  });

  let skeletonElement: React.ReactNode = null;
  if (isLoadingMore && !isExpanded) {
    skeletonElement = (
      <div className="shrink-0 flex items-center justify-center w-16 h-full text-white/40">
        <div className="w-6 h-6 border-2 border-t-transparent border-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={(node) => {
        if (isHeroVariant && focusKeyRef) {
          if (typeof (focusKeyRef as any) === "function") (focusKeyRef as any)(node);
          else (focusKeyRef as any).current = node;
        }
        if (listRef) {
          (listRef as any).current = node;
        }
      }}
      className={`flex flex-nowrap overflow-x-auto overflow-y-hidden scrollbar-hide pb-6 pt-2 mt-0 px-6 sm:px-12 lg:px-16 ${isDragging ? "scroll-auto cursor-grabbing select-none" : "scroll-smooth cursor-grab"}`}
      style={{ gap: `${config?.gap ?? 16}px` }}
    >
      {isSpotlightRail ? (
        <FocusContext.Provider value={railBoundaryFocusKey}>
          <div
            ref={railBoundaryRef as any}
            className="flex flex-nowrap shrink-0 items-center"
            style={{ gap: `${config?.gap ?? 16}px` }}
          >
            {cardElements}
          </div>
        </FocusContext.Provider>
      ) : (
        // railBoundaryRef's useFocusable() call above runs unconditionally, registering
        // itself in norigin's focus tree regardless of isSpotlightRail — but without a DOM
        // node to attach the ref to here, that registration is a "ghost" entry with no
        // measurable layout. That went unnoticed while these rails had no focusable cards
        // of their own to navigate between, but now that forceFocusable rails do, a sibling
        // with no bounding rect can break coordinate-based navigation for the real cards
        // next to it. display:contents keeps this invisible to layout (children still
        // participate in the parent flex row exactly as before) while giving the ref a
        // real node to attach to.
        <div ref={railBoundaryRef as any} style={{ display: "contents" }}>
          {cardElements}
        </div>
      )}
      {skeletonElement}
    </div>
  );
}