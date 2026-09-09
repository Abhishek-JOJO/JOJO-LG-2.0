"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useTranslations } from "next-intl";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { ContentRailItem, RailCardVariant } from "../config/contentRail.types";
import { RailCardDesignConfig, RailCardWidth } from "../config/contentRail.config";
import { LOGOS } from "@/lib/constants/assets";
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
import { InlineHoverTrailer } from "./InlineHoverTrailer";

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
  const [isDomFocused, setIsDomFocused] = useState(false);
  const [isFocusExpanded, setIsFocusExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
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
          if (currentSection && currentSection.parentElement) {
            const allSections = Array.from(currentSection.parentElement.querySelectorAll('section'));
            const currentIndex = allSections.indexOf(currentSection);

            if (direction === 'up') {
              if (currentIndex <= 1) {
                const hero = document.getElementById('hero-carousel-container');
                if (hero) {
                  hero.focus();
                  try { setFocus('hero-carousel'); } catch {}
                  hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  return false;
                }
              } else {
                const prevSection = allSections[currentIndex - 1];
                const targetCard = prevSection?.querySelector('[data-focuskey*="spotlight-lead"], a[data-focuskey]') as HTMLElement | null;
                if (targetCard) {
                  const targetKey = targetCard.getAttribute('data-focuskey');
                  targetCard.focus();
                  if (targetKey) {
                    try { setFocus(targetKey); } catch {}
                  }
                  targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return false;
                }
              }
            } else if (direction === 'down') {
              if (currentIndex < allSections.length - 1) {
                const nextSection = allSections[currentIndex + 1];
                const targetCard = nextSection?.querySelector('[data-focuskey*="spotlight-lead"], a[data-focuskey]') as HTMLElement | null;
                if (targetCard) {
                  const targetKey = targetCard.getAttribute('data-focuskey');
                  targetCard.focus();
                  if (targetKey) {
                    try { setFocus(targetKey); } catch {}
                  }
                  targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return false;
                }
              }
            }
          }
        }
      }
      return true;
    },
    onFocus: () => {
      if (cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "start" });
      }
      onFocusChange?.(index);
    },
    onEnterPress: () => {
      onClick?.(item);
    }
  });
  const isAssetDetailOpen = useAssetDetailStore((s) => s.isOpen);

  // Debounce expansion on focus so fast remote navigation doesn't expand intermediate cards
  useEffect(() => {
    if (focused) {
      const timer = setTimeout(() => setIsFocusExpanded(true), 350);
      return () => clearTimeout(timer);
    } else {
      setIsFocusExpanded(false);
    }
  }, [focused]);

  // When card expands to landscape, smoothly center it in view
  useEffect(() => {
    if (isFocusExpanded && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [isFocusExpanded]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoaded(false);
  }, [imageUrl]);

  const handleMouseEnter = () => {
    if (isDragging || isAssetDetailOpen) return;
    setIsHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHoverChange?.(false);
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

  const isMixedSeries = Boolean((config as any)?.isMixedSeries);
  const isExpanded = !isMixedSeries && !!config?.hover?.enabled && (isHovered || isFocusExpanded) && !isAssetDetailOpen;

  // Accordion Inline Expansion logic for portrait cards (only when not a spotlight rail)
  if (isExpanded && (config.variant === RailCardVariant.PORTRAIT || config.variant === RailCardVariant.TOP_TEN)) {
    desktopWidth = Math.round(desktopHeight * (16 / 9));
    mobileWidth = `${Math.round(parseInt(mobileHeight) * (16 / 9))}px`;
  }

  if (
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

  const showFocusRing = focused || forceFocusRing || isDomFocused;

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
      onFocus={() => {
        setIsDomFocused(true);
        if (focusKeyProp) {
          try { setFocus(focusKeyProp); } catch {}
        }
      }}
      onBlur={() => {
        setIsDomFocused(false);
      }}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick(item);
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative overflow-hidden shrink-0 text-left cursor-pointer transition-all duration-300 ease-out w-[var(--desktop-width)] h-[var(--desktop-height)] max-sm:w-[var(--mobile-width)] max-sm:h-[var(--mobile-height)] ${className} ${showFocusRing ? "ring-[4px] ring-white z-30 shadow-2xl" : "scale-100"}`}
      style={{
        ...cardStyle,
        zIndex: showFocusRing ? 30 : undefined,
      }}
    >
      {cardInner}

      {/* Accordion Trailer Overlay (only for non-spotlight rails) */}
      {!isMixedSeries && config?.hover?.enabled && (config.variant === RailCardVariant.PORTRAIT || config.variant === RailCardVariant.TOP_TEN) && (
        <InlineHoverTrailer item={item} isExpanded={isExpanded} />
      )}

      {/* TV Focus Ring Overlay: 4px solid white with glow, sits on top of all images/video/badges */}
      {showFocusRing && (
        <div
          className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-200"
          style={{
            borderRadius: config.borderRadius,
            border: "4px solid #ffffff",
            boxShadow: "0 0 25px rgba(255, 255, 255, 1), inset 0 0 10px rgba(255, 255, 255, 0.6)",
          }}
        />
      )}
    </a>
  );
});
