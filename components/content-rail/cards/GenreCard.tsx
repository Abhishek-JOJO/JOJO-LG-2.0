"use client";

import React, { useRef } from "react";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { ContentRailItem } from "../config/contentRail.types";
import { RailCardDesignConfig } from "../config/contentRail.config";
import { getGenreBackground } from "@/lib/utils";

interface GenreCardProps {
  item: ContentRailItem;
  config: RailCardDesignConfig;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  gridHeight?: number;
}

export function GenreCard({
  item,
  config,
  onClick,
  className = "",
  fullWidth = false,
  gridHeight = 180,
}: GenreCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { ref: focusRef, focused } = useFocusable({
    onFocus: () => {
      if (cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    },
    onEnterPress: () => {
      onClick?.();
    }
  });
  const hasImage = !!item.image;
  const gradient = getGenreBackground(item?.title);

  const cardStyle = {
    "--desktop-width": fullWidth ? "100%" : `${config.width}px`,
    "--desktop-height": fullWidth ? "auto" : `${config.height}px`,
    "--mobile-width": fullWidth ? "100%" : "130px",
    "--mobile-height": fullWidth ? "auto" : "58px",
    aspectRatio: fullWidth ? `${config.width} / ${config.height}` : undefined,
    borderRadius: config.borderRadius,
    background: gradient,
  } as React.CSSProperties;

  return (
    <div
      ref={(node) => {
        if (focusRef) {
          if (typeof (focusRef as any) === "function") (focusRef as any)(node);
          else (focusRef as any).current = node;
        }
        if (cardRef) {
          (cardRef as any).current = node;
        }
      }}
      onClick={onClick}
      className={`group relative shrink-0 overflow-hidden text-left transition-all duration-300 cursor-pointer select-none w-[var(--desktop-width)] h-[var(--desktop-height)] max-sm:w-[var(--mobile-width)] max-sm:h-[var(--mobile-height)] ${className} ${focused ? "ring-[4px] ring-white z-[99]" : ""}`}
      style={cardStyle}
    >
      {hasImage && (
        <JOJOCommonImage
          src={item.image}
          alt={item.title}
          fill
          contentMode="fill"
          className="object-fill opacity-60 transition-transform duration-300  pointer-events-none select-none"
          wrapperClassName="w-full h-full pointer-events-none select-none"
        />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: gradient }}
      />

      {/* Subtle dark overlay for text readability on hover */}
      <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <h3 className={`absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 font-bold text-theme_4 group-hover:text-theme_13_samecolour transition-colors duration-200 ${fullWidth ? "text-base sm:text-2xl" : "text-xs sm:text-lg sm:text-xl"}`}>
        {item.title}
      </h3>
    </div>
  );
}
