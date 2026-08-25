import React, { useCallback } from "react";
import { BaseContentCard } from "./BaseContentCard";
import { useTranslations } from "next-intl";

import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { ContentRailItem, RailCardVariant } from "../config/contentRail.types";
import { RailCardDesignConfig } from "../config/contentRail.config";

interface Props {
  item: ContentRailItem;
  config: RailCardDesignConfig;
  index: number;
  itemsLength?: number;
  onClick?: (item: ContentRailItem) => void;
  onFocusChange?: (index: number) => void;
  className?: string;
}

export const PortraitCard = React.memo(function PortraitCard({ item, config, index, itemsLength, onClick, onFocusChange, className }: Props) {
  const t = useTranslations("contentRails");
  
  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  // 1. Handle Artist sub-variant
  if (config.variant === RailCardVariant.ARTIST) {
    const hasImage = !!item.image;
    const desktopWidth = config.width;
    const desktopHeight = config.height;

    const cardStyle = {
      "--desktop-width": `${desktopWidth}px`,
      "--desktop-height": `${desktopHeight}px`,
      "--mobile-width": "135px",
      "--mobile-height": "200px",
    } as React.CSSProperties;

    return (
      <div
        onClick={handleClick}
        className={`group shrink-0 text-center cursor-pointer select-none w-[var(--desktop-width)] max-sm:w-[var(--mobile-width)] ${className || ""}`}
        style={cardStyle}
      >
        <div
          className="relative overflow-hidden bg-neutral-900 border-2 border-transparent group-hover:border-theme_13_samecolour transition-all duration-300 w-full h-[var(--desktop-height)] max-sm:h-[var(--mobile-height)]"
          style={{
            borderRadius: config.borderRadius,
          }}
        >
          {hasImage ? (
            <JOJOCommonImage
              src={item.image}
              alt={item.title}
              fill
              contentMode="fill"
              className="object-fill pointer-events-none select-none"
              wrapperClassName="w-full h-full pointer-events-none select-none"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[10px] text-theme_1/40 font-bold uppercase">
              {item.title.substring(0, 2)}
            </div>
          )}
        </div>

        {config.showTitle && (
          <h3 className="mt-2 line-clamp-1 text-xs font-medium text-theme_1 group-hover:text-theme_13_samecolour transition-colors duration-200">
            {item.title}
          </h3>
        )}

        {config.showSubtitle && item.subtitle && (
          <p className="mt-1 line-clamp-1 text-[11px] text-theme_1/50">
            {item.subtitle}
          </p>
        )}
      </div>
    );
  }

  // 2. Handle Upcoming sub-variant (which has an expand-on-hover layout)
  if (config.variant === RailCardVariant.UPCOMING) {
    const baseImage = item.portraitImage || item.image;
    const hoverImage = item.landscapeImage || item.hoverImage || item.image;
    const hoverWidth = config.hover.width ?? config.width;
    const hoverHeight = config.hover.height ?? config.height;

    const hasBaseImage = !!baseImage;
    const hasHoverImage = !!hoverImage;

    const cardStyle = {
      "--desktop-width": `${config.width}px`,
      "--desktop-height": `${config.height}px`,
      "--mobile-width": "135px",
      "--mobile-height": "200px",
    } as React.CSSProperties;

    return (
      <div
        onClick={handleClick}
        className={`group relative shrink-0 text-left cursor-pointer w-[var(--desktop-width)] h-[var(--desktop-height)] max-sm:w-[var(--mobile-width)] max-sm:h-[var(--mobile-height)] ${className || ""}`}
        style={cardStyle}
      >
        {/* Base Card */}
        <div
          className="relative h-full w-full overflow-hidden bg-neutral-900 border-2 border-transparent group-hover:border-theme_13_samecolour transition-all duration-300"
          style={{ borderRadius: config.borderRadius }}
        >
          {hasBaseImage ? (
            <JOJOCommonImage
              src={baseImage}
              alt={item.title}
              fill
              contentMode="fill"
              className="object-fill pointer-events-none select-none"
              wrapperClassName="w-full h-full pointer-events-none select-none"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800 flex items-center justify-center p-3 text-center text-xs text-theme_1/40">
              {item.title}
            </div>
          )}
        </div>

        {/* Expanded Hover Card */}
        {config.hover.enabled && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-40 hidden overflow-hidden bg-neutral-950 border-2 border-theme_13_samecolour shadow-2xl sm:group-hover:block transition-all duration-300"
            style={{
              width: hoverWidth,
              height: hoverHeight,
              borderRadius: config.borderRadius,
            }}
          >
            {hasHoverImage ? (
              <JOJOCommonImage
                src={hoverImage}
                alt={item.title}
                fill
                contentMode="fill"
                className="object-fill pointer-events-none select-none"
                wrapperClassName="w-full h-full pointer-events-none select-none"
              />
            ) : (
              <div className="w-full h-full bg-neutral-900" />
            )}

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />

            {/* Hover card info */}
            <div className="absolute bottom-4 left-4 right-4">
              {config.hover.showTitle && (
                <h3 className="line-clamp-1 text-sm sm:text-base font-semibold text-theme_1">
                  {item.title}
                </h3>
              )}

              {config.hover.showMeta && (
                <p className="mt-1 line-clamp-1 text-xs text-theme_1/70">
                  {item.year} {item.duration ? `• ${item.duration}` : ""}
                </p>
              )}

              {config.hover.showPlayButton && (
                <div className="mt-3 inline-flex rounded-full bg-theme_13_samecolour px-4 py-1 text-xs font-semibold text-theme_1">
                  {t("watch_now")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Handle Top 10 and Standard Portrait sub-variants
  const isTopTen = config.variant === RailCardVariant.TOP_TEN;
  const imageUrl = item.portraitImage || item.image;

  const cardContent = (
    <BaseContentCard
      item={item}
      config={config}
      imageUrl={imageUrl}
      className={`${isTopTen ? "ml-2" : ""} ${className || ""}`}
      index={index}
      itemsLength={itemsLength}
      onClick={onClick}
      onFocusChange={onFocusChange}
    >
      {config.hover.type !== "card" && (
        <div className="absolute bottom-0 left-0 right-0 z-30 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {config?.hover?.showTitle && (
            <h3 className="line-clamp-1 text-sm font-semibold text-theme_1">
              {item?.title}
            </h3>
          )}

          {config.hover.showMeta && (
            <p className="mt-1 line-clamp-1 text-xs text-theme_1/70">
              {item?.year} {item?.ageRating ? `• ${item?.ageRating}` : ""}
            </p>
          )}

          {config?.hover?.showPlayButton && (
            <div className="mt-2 inline-flex rounded-full bg-theme_13_samecolour px-3 py-1 text-xs font-semibold text-theme_1">
              {t("watch_now")}
            </div>
          )}
        </div>
      )}
    </BaseContentCard>
  );

  if (isTopTen) {
    const rank = item?.rank ?? index + 1;
    return (
      <div className="relative flex shrink-0 items-end pl-8 sm:pl-10 md:pl-12">
        <span
          className="absolute left-0 -bottom-4 z-20 text-[80px] sm:text-[95px] md:text-[125px] font-black leading-none text-neutral-950 [-webkit-text-stroke:2px_var(--theme_1)] sm:[-webkit-text-stroke:3px_var(--theme_1)] drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
        >
          {rank}
        </span>
        {cardContent}
      </div>
    );
  }

  return cardContent;
});
