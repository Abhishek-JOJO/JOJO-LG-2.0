"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useTranslations } from "next-intl";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { ContentRailItem, RailCardVariant } from "../config/contentRail.types";
import { RailCardDesignConfig, RailCardWidth } from "../config/contentRail.config";
import { LOGOS } from "@/lib/constants/assets";
import { HoverCard, HoverCardAlignment } from "./HoverCard";
import { InlineHoverTrailer } from "./InlineHoverTrailer";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useAssetDetailStore, slugify } from "@/features/asset/store/useAssetDetailStore";

interface BaseContentCardProps {
  item: ContentRailItem;
  config: RailCardDesignConfig;
  imageUrl: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: (item: ContentRailItem) => void;
  onHoverChange?: (hovered: boolean) => void;
  onFocusChange?: (index: number) => void;
  index?: number;
  itemsLength?: number;
  isDragging?: boolean;
  /** Stable focus key override — lets an ancestor target this exact card via `preferredChildFocusKey`. */
  focusKey?: string;
  /** Shows the focus ring even when this card itself isn't the spatial-nav focus target — used by spotlight rails' card 0. */
  forceFocusRing?: boolean;
  /** When false, this card is excluded from D-pad/spatial-nav entirely (still clickable by mouse) — used by spotlight rails' non-lead slots. */
  focusable?: boolean;
  /** When provided, Left/Right presses call this instead of the default nearest-neighbor move — used by spotlight rails' lead card to cycle which item occupies each slot. */
  onArrowLeftRight?: (direction: "left" | "right") => void;
}

import Link from "next/link";
import { TvodIcon } from "@/public/svg/TVODIcon";

function getContentTypeSlug(assetType?: string, assetTypeCode?: number): string {
  const type = String(assetType || "").toUpperCase();
  if (type === "SHOW" || type === "SERIES" || type === "WEB SERIES" || type === "WEB_SERIES" || assetTypeCode === 2 || assetTypeCode === 3) return "shows";
  if (type === "NATAK" || type === "NATAKS" || type === "STAGE_PLAY" || type === "PLAY" || assetTypeCode === 4 || assetTypeCode === 6) return "nataks";
  if (type === "KIDS" || type === "KIDZ" || assetTypeCode === 7) return "kids";
  return "movies";
}

export const BaseContentCard = React.memo(function BaseContentCard({
  item,
  config,
  imageUrl,
  className = "",
  children,
  onClick,
  onHoverChange,
  onFocusChange,
  index = 0,
  itemsLength = 0,
  isDragging = false,
  focusKey: focusKeyProp,
  forceFocusRing = false,
  focusable = true,
  onArrowLeftRight,
}: BaseContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusExpanded, setIsFocusExpanded] = useState(false);
  const [hoverAlignment, setHoverAlignment] = useState<HoverCardAlignment>("center");
  const [imageLoaded, setImageLoaded] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const t = useTranslations("contentRails");
  const { ref: focusRef, focused, focusKey } = useFocusable({
    focusKey: focusKeyProp,
    focusable,
    onArrowPress: (direction) => {
      if ((direction === 'left' || direction === 'right') && onArrowLeftRight) {
        onArrowLeftRight(direction);
        return false;
      }
      if (direction === 'up' || direction === 'down') {
        if (cardRef.current) {
          const currentSection = cardRef.current.closest('section');
          if (!currentSection) return true;
          
          const parent = currentSection.parentElement;
          if (!parent) return true;
          
          // Get all sections in the container to avoid issues with non-section siblings (like Next.js injected scripts)
          const allSections = Array.from(parent.querySelectorAll('section'));
          const currentIndex = allSections.indexOf(currentSection);
          
          if (currentIndex !== -1) {
            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            const targetSection = allSections[targetIndex];
            
            if (targetSection) {
              const firstCard = targetSection.querySelector('[data-focuskey]');
              if (firstCard) {
                const targetFocusKey = firstCard.getAttribute('data-focuskey');
                if (targetFocusKey) {
                  setFocus(targetFocusKey);
                  return false;
                }
              }
            } else if (direction === 'up' && currentIndex === 0) {
              // If we are at the first section and press up, try to focus the hero carousel
              setFocus('hero-carousel');
              return false;
            }
          }
        }
      }
      return true;
    },
    onFocus: () => {
      if (cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
      handleMouseEnter();
      onFocusChange?.(index);
    },
    onBlur: () => {
      handleMouseLeave();
    },
    onEnterPress: () => {
      onClick?.(item);
    }
  });
  const setIsAnyCardHovered = usePlayerStore((s) => s.setIsAnyCardHovered);
  const isAssetDetailOpen = useAssetDetailStore((s) => s.isOpen);

  // Close hover card if detail modal is opened
  useEffect(() => {
    if (isAssetDetailOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsHovered(false);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    }
  }, [isAssetDetailOpen]);

  // Add delay for focus expansion to prevent all cards from expanding when scrolling fast
  useEffect(() => {
    if (focused) {
      const timer = setTimeout(() => setIsFocusExpanded(true), 400);
      return () => clearTimeout(timer);
    } else {
      setIsFocusExpanded(false);
    }
  }, [focused]);

  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoaded(false);
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (isDragging || isAssetDetailOpen) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      const containerEl = cardRef.current.closest(".overflow-x-auto");

      let containerLeft = 0;
      let containerRight = typeof window !== "undefined" ? window.innerWidth : 1920;

      if (containerEl) {
        const containerRect = containerEl.getBoundingClientRect();
        containerLeft = containerRect.left;
        containerRight = containerRect.right;

        // 8px threshold to detect if card is cut off at the boundary
        // Do not block hover for the first card on the left boundary
        // or the last card on the right boundary, since they align inside the viewport.
        const isCutLeft = index > 0 && cardRect.left < containerRect.left + 8;
        const isCutRight = index < itemsLength - 1 && cardRect.right > containerRect.right - 8;

        if (isCutLeft || isCutRight) {
          return;
        }
      }

      // Calculate dynamic alignment based on viewport space
      const hoverCardWidth = config.variant === RailCardVariant.LANDSCAPE || config.variant === RailCardVariant.CONTINUE_WATCHING
        ? (config.width === 580 ? 500 : 400) // landscape width on desktop
        : 300; // portrait width on desktop

      const spaceLeft = cardRect.left - containerLeft;
      const spaceRight = containerRight - cardRect.right;
      const cardWidth = cardRect.width;

      const isGrid = !containerEl;

      if (!isGrid && index === 0) {
        setHoverAlignment("left");
      } else if (!isGrid && index === itemsLength - 1) {
        setHoverAlignment("right");
      } else if (spaceLeft + cardWidth / 2 < hoverCardWidth / 2) {
        setHoverAlignment("left");
      } else if (spaceRight + cardWidth / 2 < hoverCardWidth / 2) {
        setHoverAlignment("right");
      } else {
        setHoverAlignment("center");
      }
    }

    setIsAnyCardHovered(true);

    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    // Delay only for card-type hover (popup card needs slight pause before showing)
    const delay = config.hover.type === "card" ? 350 : 0;
    if (delay > 0) {
      hoverTimerRef.current = setTimeout(() => {
        setIsHovered(true);
        onHoverChange?.(true);
      }, delay);
    } else {
      setIsHovered(true);
      onHoverChange?.(true);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    closeTimerRef.current = setTimeout(() => {
      setIsAnyCardHovered(false);
      setIsHovered(false);
      onHoverChange?.(false);
    }, 150); // 150ms buffer to transition mouse between card and portal
  };

  // true when hover type is "simple" — no overlay, no scale, no dim
  const isSimple = config.hover.type === "simple" || !config.hover.enabled;
  const showBorder = config.hover.enabled && isHovered;

  const cardInner = (
    <div
      className="relative h-full w-full overflow-hidden bg-neutral-900 transition-colors transform-gpu isolation-isolate"
      style={{
        WebkitMaskImage: "-webkit-radial-gradient(white, black)",
        borderRadius: item.isPremium
          ? Math.max(0, config.borderRadius - 3)
          : config.borderRadius,
        outline:
          !item.isPremium && showBorder
            ? "2px solid var(--theme_13_samecolour)"
            : "none",
        outlineOffset: "-2px",
      }}
    >
      {!((config as any)?.isMixedSeries && config.variant === RailCardVariant.LANDSCAPE) && (
        <JOJOCommonImage
          src={imageUrl}
          alt={item.title}
          fill
          contentMode="cover"
          sizes={
            config.width >= 1000
              ? "100vw"
              : config.width >= 500
                ? "(max-width: 768px) 100vw, 50vw"
                : config.width >= 300
                  ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  : "(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
          }
          className={`object-cover transition-all duration-300 pointer-events-none select-none`}
          wrapperClassName="w-full h-full pointer-events-none select-none"
          onLoad={() => setImageLoaded(true)}
        />
      )}

      {/* Title shown while image is loading */}
      {!((config as any)?.isMixedSeries && config.variant === RailCardVariant.LANDSCAPE) && !imageLoaded && !!imageUrl && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-900 px-2 pointer-events-none select-none">
          <span className="text-[11px] sm:text-xs text-theme_1/50 font-semibold text-center line-clamp-3 leading-snug px-1">
            {item.title}
          </span>
        </div>
      )}
      {/* Blur overlay — only for portrait cards with a badge/flag, never on landscape */}
      {config.hover.enabled &&
        !isSimple &&
        config.variant !== RailCardVariant.LANDSCAPE &&
        config.variant !== RailCardVariant.CONTINUE_WATCHING &&
        config.variant !== RailCardVariant.SERIES_MIXED &&
        config.showBadge &&
        !!item.asset_tags_badgeText &&
        isHovered && (
          <div className="absolute inset-0 backdrop-blur-sm bg-black/20 transition-opacity duration-300 pointer-events-none" />
        )}

      {/* Dark overlay — only for non-simple types that explicitly enable it */}
      {config.hover.showOverlay && !isSimple && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}

      {/* TOP 10 Badge */}
      {config?.variant !== RailCardVariant?.TOP_TEN && item?.isTop10 && (
        <div
          className="absolute top-0 left-0 z-30 flex font-bold flex-col items-center rounded-br-md px-1.5 pt-1 leading-none text-theme_1"
          style={{ background: "var(--theme_13_samecolour)" }}
        >
          <span className="text-xs sm:text-xs">{t("top")}</span>
          <span className="text-lg sm:text-lg -mt-1">{t("ten")}</span>
        </div>
      )}

      {config?.showBadge && item?.asset_tags_badgeText && (
        <div
          className={`absolute bottom-0 left-1/2 caption-sm-semibold -translate-x-1/2 text-center uppercase z-30 ${config.variant === RailCardVariant.LANDSCAPE ||
            config?.variant === RailCardVariant.CONTINUE_WATCHING ||
            config?.width >= RailCardWidth.W_580
            ? "w-[110px]"
            : "w-[110px]"
            } ${item?.isPremium
              ? "premium-badge-bg shadow-md shadow-amber-500/20 pt-0.5 pb-0 !text-black rounded-t-md"
              : "bg-theme_13_samecolour rounded-[6px] py-0.5"
            }`}
        >
          {item?.asset_tags_badgeText}
        </div>
      )}

      {/* Crown badge for premium items */}
      {item.isSVOD && (
        <div className="absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-theme_11_60 transition-transform duration-300 group-hover:scale-110">
          <div className="relative w-3 h-3">
            <JOJOCommonImage
              src={LOGOS.CROWN_LOGO}
              alt={t("premium_badge_alt")}
              fill
              className="object-contain"
              wrapperClassName="w-full h-full"
            />
          </div>
        </div>
      )}
      {item.isTVOD && (
        <div className="absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-theme_11_60 transition-transform duration-300 group-hover:scale-110">
          <TvodIcon
            size={15}
            className="shrink-0"
          />
        </div>
      )}
      {children}
    </div>
  );

  let desktopWidth = config.width;
  const desktopHeight = config.height;

  let mobileWidth = "135px";
  let mobileHeight = "203px"; // Perfect 2:3 ratio

  const isExpanded = !!config?.hover?.enabled && (isHovered || isFocusExpanded) && !isAssetDetailOpen;

  // Accordion Inline Expansion logic for portrait cards
  if (isExpanded && (config.variant === RailCardVariant.PORTRAIT || config.variant === RailCardVariant.TOP_TEN)) {
    desktopWidth = Math.round(desktopHeight * (16 / 9));
    mobileWidth = `${Math.round(parseInt(mobileHeight) * (16 / 9))}px`;
  }

  const isMixedSeries = (config as any).isMixedSeries;

  if (isMixedSeries) {
    // Force both landscape and portrait to the same height (158px) in a mixed rail
    if (config.variant === RailCardVariant.LANDSCAPE) {
      mobileWidth = "280px";
      mobileHeight = "158px";
    } else {
      mobileWidth = "105px";
      mobileHeight = "158px"; // Same height, 2:3 ratio width
    }
  } else if (
    desktopWidth >= RailCardWidth.W_580 ||
    config.variant === RailCardVariant.LANDSCAPE ||
    config.variant === RailCardVariant.CONTINUE_WATCHING
  ) {
    mobileWidth = "280px";
    mobileHeight = "158px"; // Perfect 16:9 ratio
  } else if (config.variant === RailCardVariant.GENRE) {
    mobileWidth = "160px";
    mobileHeight = "90px"; // Perfect 16:9 ratio
  } else if (desktopWidth === RailCardWidth.W_270) {
    mobileWidth = "145px";
    mobileHeight = "193px"; // Perfect 3:4 ratio
  }

  const cardStyle = {
    "--desktop-width": `${desktopWidth}px`,
    "--desktop-height": `${desktopHeight}px`,
    "--mobile-width": mobileWidth,
    "--mobile-height": mobileHeight,
    borderRadius: config.borderRadius,
  } as React.CSSProperties;

  // Spotlight rails (isMixedSeries): the visible focus ring always stays on
  // the fixed landscape card (0), not on whichever small portrait sibling is
  // being browsed — that sibling only drives what card 0 previews, it never
  // shows a ring of its own.
  const isSpotlightSibling = isMixedSeries && config.variant === RailCardVariant.PORTRAIT;
  const showFocusRing = isSpotlightSibling ? false : focused || forceFocusRing;

  const categorySlug = getContentTypeSlug(item.assetType, item.assetTypeCode);
  const slug = item.title ? slugify(item.title) : "watch";
  let itemUrl = `/${categorySlug}/${slug}/${item.id}`;

  if (item.redirectUrl) {
    try {
      if (item.redirectUrl.startsWith("http")) {
        const urlObj = new URL(item.redirectUrl);
        itemUrl = urlObj.pathname;
      } else {
        itemUrl = item.redirectUrl.startsWith("/") ? item.redirectUrl : `/${item.redirectUrl}`;
      }
    } catch {
      itemUrl = item.redirectUrl.startsWith("/") ? item.redirectUrl : `/${item.redirectUrl}`;
    }
  }

  return (
    <a
      ref={(node) => {
        if (focusRef) {
          if (typeof (focusRef as any) === "function") (focusRef as any)(node);
          else (focusRef as any).current = node;
        }
        if (cardRef) {
          (cardRef as any).current = node;
        }
      }}
      href={itemUrl}
      data-focuskey={focusKey}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick(item);
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative overflow-hidden shrink-0 text-left cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] w-[var(--desktop-width)] h-[var(--desktop-height)] max-sm:w-[var(--mobile-width)] max-sm:h-[var(--mobile-height)] ${className} ${showFocusRing ? "ring-[4px] ring-white z-[99]" : ""}`}
      style={{
        ...cardStyle,
        // Elevate z-index when hovered so HoverCard renders above siblings
        zIndex: isHovered && config.hover.enabled ? 50 : undefined,
      }}
    >
      {cardInner}

      {/* Accordion Trailer Overlay */}
      {config?.hover?.enabled && (config.variant === RailCardVariant.PORTRAIT || config.variant === RailCardVariant.TOP_TEN) && (
        <InlineHoverTrailer item={item} isExpanded={isExpanded} />
      )}
    </a>
  );
});
