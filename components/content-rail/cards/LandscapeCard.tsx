"use client";

import React, { useCallback } from "react";
import { ContentRailItem, RailCardVariant } from "../config/contentRail.types";
import { RailCardDesignConfig } from "../config/contentRail.config";
import { BaseContentCard } from "./BaseContentCard";
import { GenreCard } from "./GenreCard";
import { InlineHoverTrailer } from "./InlineHoverTrailer";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";

interface Props {
  item: ContentRailItem;
  config: RailCardDesignConfig;
  index: number;
  itemsLength?: number;
  onClick?: (item: ContentRailItem) => void;
  onFocusChange?: (index: number) => void;
  className?: string;
  focusKey?: string;
  forceFocusRing?: boolean;
  railActive?: boolean;
  onArrowLeftRight?: (direction: "left" | "right") => void;
  onArrowUpDown?: (direction: "up" | "down") => boolean | void;
}

export const LandscapeCard = React.memo(function LandscapeCard({
  item,
  config,
  index,
  itemsLength,
  onClick,
  onFocusChange,
  className,
  focusKey,
  forceFocusRing,
  railActive,
  onArrowLeftRight,
  onArrowUpDown,
}: Props) {
  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  // 1. Handle Genre sub-variant
  if (config.variant === RailCardVariant.GENRE) {
    return (
      <GenreCard
        item={item}
        config={config}
        onClick={handleClick}
        className={className}
        focusKey={focusKey}
        index={index}
      />
    );
  }

  const isMixedSeries = Boolean((config as any)?.isMixedSeries);
  const landscapeFallbackList = React.useMemo(() => {
    if (item.landscapeFallbackImages && item.landscapeFallbackImages.length > 0) {
      return item.landscapeFallbackImages;
    }
    const candidates = [
      item.landscapeImage,
      item.posterImageRatio4,
      item.posterImage,
      item.heroImage,
      item.image,
      item.portraitImage,
    ];
    const seen = new Set<string>();
    return candidates.filter((u): u is string => {
      if (typeof u === "string" && u.trim().length > 0 && !seen.has(u)) {
        seen.add(u);
        return true;
      }
      return false;
    });
  }, [item]);

  // Lead spotlight card & landscape cards use the exact client landscape fallback cascade (Poster Ratio 4 -> Poster Ratio 1 -> Landscape -> etc.)
  const imageUrl =
    landscapeFallbackList[0] ||
    item.landscapeImage ||
    item.posterImage ||
    item.heroImage ||
    item.image ||
    item.portraitImage ||
    "";

  const isTrailerActive = Boolean(railActive || forceFocusRing);

  return (
    <BaseContentCard
      item={item}
      config={config}
      imageUrl={imageUrl}
      fallbackImages={landscapeFallbackList}
      index={index}
      itemsLength={itemsLength}
      onClick={handleClick}
      onFocusChange={onFocusChange}
      className={className}
      focusKey={focusKey}
      forceFocusRing={forceFocusRing}
      onArrowLeftRight={onArrowLeftRight}
      onArrowUpDown={onArrowUpDown}
    >
      {/* Title & Metadata overlay for landscape cards */}
      {(!isMixedSeries || !isTrailerActive) && (config?.hover?.showTitle || item?.title || item?.title_image) && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black/85 via-black/30 to-transparent text-left pointer-events-none">
          {item?.title_image ? (
            <div className="relative w-[180px] h-[50px] mb-1 flex justify-start items-end">
              <JOJOCommonImage
                src={item.title_image}
                alt={item.title}
                fill
                contentMode="contain"
                position="left"
                style={{ objectPosition: "left bottom" }}
                optimizeRequestURL={false}
                wrapperClassName="w-full h-full drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
              />
            </div>
          ) : item?.title && (
            <h3 className="line-clamp-1 text-sm font-semibold text-white drop-shadow-md">
              {item.title}
            </h3>
          )}
          {item?.genres && item.genres.length > 0 && (
            <p className="mt-0.5 line-clamp-1 text-xs text-white/70">
              {item.genres.join(" • ")}
            </p>
          )}
        </div>
      )}

      {/* Spotlight lead card: mounts InlineHoverTrailer */}
      {isMixedSeries && (
        <InlineHoverTrailer item={item} isExpanded={isTrailerActive} isLandscape />
      )}
    </BaseContentCard>
  );
});
