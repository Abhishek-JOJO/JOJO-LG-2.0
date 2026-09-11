"use client";

import React from "react";
import { CONTENT_RAIL_DESIGN_CONFIG } from "./config/contentRail.config";
import { ContentRailType, RailCardVariant } from "./config/contentRail.types";

interface ContentRailsSkeletonProps {
  hasHero?: boolean;
}

interface SkeletonCardProps {
  config: {
    width: number;
    height: number;
    variant: string;
    borderRadius?: number;
  };
  className?: string;
}

function SkeletonCard({ config, className = "" }: SkeletonCardProps) {
  const desktopWidth = config.width;
  const desktopHeight = config.height;
  const borderRadius = config.borderRadius ?? 8;

  let mobileWidth = "135px";
  let mobileHeight = "203px"; // Perfect 2:3 ratio

  const isMixedSeries = (config as any).isMixedSeries;

  if (isMixedSeries) {
    if (config.variant === "landscape" || config.variant === RailCardVariant.LANDSCAPE) {
      mobileWidth = "280px";
      mobileHeight = "158px";
    } else {
      mobileWidth = "105px";
      mobileHeight = "158px"; // Same height, 2:3 ratio width
    }
  } else if (
    desktopWidth >= 580 || // RailCardWidth.W_580
    config.variant === "landscape" || config.variant === RailCardVariant.LANDSCAPE ||
    config.variant === "continueWatching" || config.variant === RailCardVariant.CONTINUE_WATCHING
  ) {
    mobileWidth = "280px";
    mobileHeight = "158px"; // Perfect 16:9 ratio
  } else if (config.variant === "genre" || config.variant === RailCardVariant.GENRE) {
    mobileWidth = "160px";
    mobileHeight = "90px"; // Perfect 16:9 ratio
  } else if (desktopWidth === 270) { // RailCardWidth.W_270
    mobileWidth = "145px";
    mobileHeight = "193px"; // Perfect 3:4 ratio
  }

  const cardStyle = {
    "--desktop-width": `${desktopWidth}px`,
    "--desktop-height": `${desktopHeight}px`,
    "--mobile-width": mobileWidth,
    "--mobile-height": mobileHeight,
    borderRadius: `${borderRadius}px`,
  } as React.CSSProperties;

  return (
    <div
      className={`shrink-0 skeleton rounded-lg w-[var(--desktop-width)] h-[var(--desktop-height)] max-sm:w-[var(--mobile-width)] max-sm:h-[var(--mobile-height)] ${className}`}
      style={cardStyle}
    />
  );
}

interface RailSectionSkeletonProps {
  type: ContentRailType;
  titleWidth?: string;
}

function RailSectionSkeleton({ type, titleWidth = "w-40 sm:w-48" }: RailSectionSkeletonProps) {
  const config = CONTENT_RAIL_DESIGN_CONFIG[type];
  if (!config) return null;

  const gap = config.gap;
  // Only enough cards to fill one TV screen width plus a small buffer — the
  // rest would be off-screen and never seen before real data replaces them,
  // so rendering more than this is pure wasted DOM/paint on a low-power SoC.
  let cardCount = 7;
  if (type === ContentRailType.LANDSCAPE || type === ContentRailType.CONTINUE_WATCHING) {
    cardCount = 5;
  } else if (type === ContentRailType.RED_CARPET) {
    cardCount = 5;
  } else if (type === ContentRailType.GENRE) {
    cardCount = 6;
  } else if (type === ContentRailType.SERIES_MIXED) {
    cardCount = 5;
  }

  const isTop10 = type === ContentRailType.TOP_10;
  const isArtist = type === ContentRailType.ARTIST;

  const renderCards = () => {
    if (type === ContentRailType.SERIES_MIXED) {
      const landscapeConfig = {
        ...config,
        variant: RailCardVariant.LANDSCAPE,
        width: 462,
        height: 270,
        isMixedSeries: true,
      };
      const portraitConfig = {
        ...config,
        variant: RailCardVariant.PORTRAIT,
        width: 180,
        height: 270,
        isMixedSeries: true,
      };

      return (
        <>
          <SkeletonCard config={landscapeConfig} />
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} config={portraitConfig} />
          ))}
        </>
      );
    }

    return [...Array(cardCount)].map((_, i) => {
      if (isTop10) {
        return (
          <div key={i} className="relative flex shrink-0 items-end pl-6 sm:pl-8 md:pl-10">
            <SkeletonCard config={config} />
          </div>
        );
      }

      if (isArtist) {
        return (
          <div
            key={i}
            className="shrink-0 flex flex-col gap-2 w-[var(--desktop-width)] max-sm:w-[var(--mobile-width)] text-center"
            style={{
              "--desktop-width": `${config.width}px`,
              "--mobile-width": "135px",
            } as React.CSSProperties}
          >
            <SkeletonCard config={config} />
            <div className="h-3.5 bg-theme_1/8 rounded w-4/5 mx-auto animate-pulse mt-1" />
            <div className="h-3 bg-theme_1/6 rounded w-3/5 mx-auto animate-pulse" />
          </div>
        );
      }

      return <SkeletonCard key={i} config={config} />;
    });
  };

  return (
    <div className="w-full px-6 sm:px-12 lg:px-16">
      <div className={`h-6 sm:h-7 bg-theme_1/8 rounded ${titleWidth} mb-4 animate-pulse`} />
      <div
        className={`flex overflow-x-hidden pb-4 ${isTop10 ? "pb-14 sm:pb-16 pt-4" : ""}`}
        style={{ gap: `${gap}px` }}
      >
        {renderCards()}
      </div>
    </div>
  );
}

// Kept short on purpose: this is a loading placeholder, not real content — on
// a TV, the hero alone fills the first screen (100vh), so anything past the
// first few rails is off-screen the whole time it's shown and just adds
// paint/DOM cost for nothing. Enough rails to cover one extra scroll's worth.
const SKELETON_RAILS = [
  { type: ContentRailType.PORTRAIT, titleWidth: "w-36 sm:w-40" }, // portrait
  { type: ContentRailType.LANDSCAPE, titleWidth: "w-48 sm:w-56" }, // landscape
  { type: ContentRailType.SERIES_MIXED, titleWidth: "w-40 sm:w-48" }, // mix series
  { type: ContentRailType.PORTRAIT, titleWidth: "w-32 sm:w-36" }, // portrait
  { type: ContentRailType.LANDSCAPE, titleWidth: "w-44 sm:w-52" }, // landscape
];

export function HeroSliderSkeleton() {
  return (
    <div className="relative overflow-hidden w-[calc(100%-3rem)] sm:w-[calc(100%-6rem)] lg:w-[calc(100%-8rem)] mx-auto select-none h-[75vh] mt-2 sm:mt-3 rounded-[32px] border-[1.5px] border-white/10 bg-neutral-900">
      {/* Hotstar Left Gradient */}
      <div className="absolute inset-y-0 left-0 w-full sm:w-[50%] md:w-[45%] lg:w-[40%] xl:w-[35%] bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />

      {/* Hotstar Bottom Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] sm:h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />

      {/* Hero content placeholder matching real HeroCarouselCard layout */}
      <div className="absolute bottom-12 sm:bottom-16 lg:bottom-20 left-6 sm:left-8 lg:left-12 right-[120px] max-w-4xl text-left z-20 space-y-3 pointer-events-none">
        {/* Title placeholder */}
        <div className="w-64 sm:w-80 md:w-96 h-12 sm:h-16 rounded-xl bg-white/10" />

        {/* Badge placeholder */}
        <div className="w-24 h-5 rounded-full bg-white/5" />

        {/* Certification & Duration pills */}
        <div className="flex items-center gap-2 pt-1">
          <div className="w-12 h-5 rounded-full bg-white/10" />
          <div className="w-12 h-5 rounded-full bg-white/10" />
          <div className="w-16 h-5 rounded-full bg-white/10" />
        </div>

        {/* Genres */}
        <div className="w-44 h-5 rounded-md bg-white/10 mt-1" />
      </div>

      {/* Pagination Dots placeholder */}
      <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-12 lg:bottom-12 lg:right-16 flex gap-2 z-20 pointer-events-none">
        <div className="h-2 w-6 rounded-full bg-white/40" />
        <div className="h-2 w-2 rounded-full bg-white/20" />
        <div className="h-2 w-2 rounded-full bg-white/20" />
        <div className="h-2 w-2 rounded-full bg-white/20" />
      </div>
    </div>
  );
}

export function ContentRailsSkeleton({ hasHero = true }: ContentRailsSkeletonProps) {
  return (
    <div
      className={`space-y-10 pb-16 overflow-x-hidden w-full select-none ${hasHero ? "pt-0" : "mt-3 sm:pt-5"}`}
    >
      {/* ── Hero Banner Skeleton matching real 75vh carousel ──────────────── */}
      {hasHero && <HeroSliderSkeleton />}

      {/* ── Content Rail Skeletons ───────────────────────────────────────── */}
      {SKELETON_RAILS.map((rail, idx) => (
        <RailSectionSkeleton key={idx} type={rail.type} titleWidth={rail.titleWidth} />
      ))}
    </div>
  );
}
