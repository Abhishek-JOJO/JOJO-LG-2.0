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
  let cardCount = 15;
  if (type === ContentRailType.LANDSCAPE || type === ContentRailType.CONTINUE_WATCHING) {
    cardCount = 10;
  } else if (type === ContentRailType.RED_CARPET) {
    cardCount = 10;
  } else if (type === ContentRailType.GENRE) {
    cardCount = 10;
  } else if (type === ContentRailType.SERIES_MIXED) {
    cardCount = 10;
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
          {[...Array(10)].map((_, i) => (
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
    <div className="w-full px-4 sm:px-6 lg:px-14">
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

const SKELETON_RAILS = [
  { type: ContentRailType.PORTRAIT, titleWidth: "w-36 sm:w-40" }, // portrait
  { type: ContentRailType.PORTRAIT, titleWidth: "w-32 sm:w-36" }, // portrait
  { type: ContentRailType.LANDSCAPE, titleWidth: "w-48 sm:w-56" }, // landscape
  { type: ContentRailType.PORTRAIT, titleWidth: "w-36 sm:w-40" }, // portrait
  { type: ContentRailType.SERIES_MIXED, titleWidth: "w-40 sm:w-48" }, // mix series
  { type: ContentRailType.PORTRAIT, titleWidth: "w-32 sm:w-36" }, // portrait
  { type: ContentRailType.SERIES_MIXED, titleWidth: "w-40 sm:w-48" }, // mix series
  { type: ContentRailType.PORTRAIT, titleWidth: "w-36 sm:w-40" }, // portrait
  { type: ContentRailType.PORTRAIT, titleWidth: "w-32 sm:w-36" }, // portrait
  { type: ContentRailType.PORTRAIT, titleWidth: "w-40 sm:w-44" }, // portrait
  { type: ContentRailType.LANDSCAPE, titleWidth: "w-44 sm:w-52" }, // landscape
  { type: ContentRailType.LANDSCAPE, titleWidth: "w-48 sm:w-56" }, // landscape
  { type: ContentRailType.LANDSCAPE, titleWidth: "w-36 sm:w-44" }, // landscape
  { type: ContentRailType.SERIES_MIXED, titleWidth: "w-40 sm:w-48" }, // mix series
  { type: ContentRailType.PORTRAIT, titleWidth: "w-32 sm:w-36" }, // portrait
  { type: ContentRailType.SERIES_MIXED, titleWidth: "w-44 sm:w-52" }, // mix series
  { type: ContentRailType.LANDSCAPE, titleWidth: "w-40 sm:w-48" }, // landscape
  { type: ContentRailType.GENRE, titleWidth: "w-28 sm:w-32" }, // genre
  { type: ContentRailType.PORTRAIT, titleWidth: "w-36 sm:w-40" }, // portrait
  { type: ContentRailType.SERIES_MIXED, titleWidth: "w-40 sm:w-48" }, // mix series
  { type: ContentRailType.PORTRAIT, titleWidth: "w-32 sm:w-36" }, // portrait
  { type: ContentRailType.SERIES_MIXED, titleWidth: "w-44 sm:w-52" }, // mix series
  { type: ContentRailType.PORTRAIT, titleWidth: "w-36 sm:w-44" }, // portrait
];

export function ContentRailsSkeleton({ hasHero = true }: ContentRailsSkeletonProps) {
  return (
    <div
      className={`space-y-10 pb-16 overflow-x-hidden w-full select-none ${hasHero ? "pt-0" : "mt-3 sm:pt-5"}`}
    >
      {/* ── Hero Banner Skeleton ─────────────────────────────────────────── */}
      {hasHero && (
        <div className="relative overflow-hidden w-full skeleton rounded-none h-[100vh] max-sm:h-[65dvh]">
          {/* Gradient overlays to match real hero */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/80 via-neutral-950/20 to-transparent z-10 pointer-events-none" />

          {/* Content placeholder */}
          <div className="absolute bottom-20 sm:bottom-24 md:bottom-28 lg:bottom-32 left-4 sm:left-6 lg:left-16 right-4 max-w-2xl z-20 space-y-4">
            <div className="h-10 sm:h-14 bg-theme_1/10 rounded-md w-3/4 animate-pulse" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-16 bg-theme_1/10 rounded animate-pulse" />
              <div className="h-6 w-16 bg-theme_1/10 rounded animate-pulse" />
              <div className="h-6 w-20 bg-theme_1/10 rounded animate-pulse" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-theme_1/10 rounded w-full animate-pulse" />
              <div className="h-4 bg-theme_1/10 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-theme_1/10 rounded w-2/3 animate-pulse" />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <div className="h-10 w-32 bg-theme_1/15 rounded-full animate-pulse" />
              <div className="h-10 w-10 bg-theme_1/10 rounded-full animate-pulse" />
              <div className="h-10 w-10 bg-theme_1/10 rounded-full animate-pulse" />
              <div className="h-10 w-10 bg-theme_1/10 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Thumbnail strip placeholder (bottom-right) */}
          <div className="absolute bottom-6 right-4 sm:right-6 lg:right-16 z-20 hidden lg:flex gap-2.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-20 md:w-24 lg:w-28 aspect-video rounded-md skeleton opacity-60" />
            ))}
          </div>
        </div>
      )}

      {/* ── Content Rail Skeletons ───────────────────────────────────────── */}
      {SKELETON_RAILS.map((rail, idx) => (
        <RailSectionSkeleton key={idx} type={rail.type} titleWidth={rail.titleWidth} />
      ))}
    </div>
  );
}
