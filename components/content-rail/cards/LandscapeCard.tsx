"use client";

import React, { useCallback } from "react";
import { ContentRailItem, RailCardVariant } from "../config/contentRail.types";
import { RailCardDesignConfig } from "../config/contentRail.config";
import { BaseContentCard } from "./BaseContentCard";
import { GenreCard } from "./GenreCard";
import { InlineHoverTrailer } from "./InlineHoverTrailer";

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
      />
    );
  }

  const isMixedSeries = Boolean((config as any)?.isMixedSeries);
  const imageUrl = railActive
    ? (item.landscapeImage || item.posterImage || item.image)
    : (item.portraitImage || item.image);

  return (
    <BaseContentCard
      item={item}
      config={config}
      imageUrl={imageUrl}
      index={index}
      itemsLength={itemsLength}
      onClick={handleClick}
      onFocusChange={onFocusChange}
      className={className}
      focusKey={focusKey}
      forceFocusRing={forceFocusRing}
      onArrowLeftRight={onArrowLeftRight}
    >
      {/* Title & Metadata overlay for standard landscape cards */}
      {!isMixedSeries && (config?.hover?.showTitle || item?.title) && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black/85 via-black/30 to-transparent text-left pointer-events-none">
          {item?.title && (
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

      {/* Spotlight lead card: mounts InlineHoverTrailer only when rail is active */}
      {isMixedSeries && railActive && (
        <InlineHoverTrailer item={item} isExpanded={Boolean(railActive || forceFocusRing)} />
      )}
    </BaseContentCard>
  );
});
