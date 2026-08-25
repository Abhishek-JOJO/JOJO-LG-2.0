"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, Play, Plus, Share2, ThumbsUp, Volume2, VolumeX, Trash2 } from "lucide-react";

import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import JOJOCommonVideo from "@/components/ui/JOJOCommonVideo";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { usePlayerStore } from "@/store/usePlayerStore";
import { ContentRailItem, RailCardVariant } from "../config/contentRail.types";
import { RailCardDesignConfig } from "../config/contentRail.config";
import { BaseContentCard } from "./BaseContentCard";
import { useAuthStore } from "@/store/useAuthStore";
import { deepLinkManager } from "@/lib/deeplink/deepLinkManager";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";

import { GenreCard } from "./GenreCard";

interface Props {
  item: ContentRailItem;
  config: RailCardDesignConfig;
  index: number;
  itemsLength?: number;
  onClick?: (item: ContentRailItem) => void;
  onFocusChange?: (index: number) => void;
  /**
   * When set to an item other than `item` itself, the card's artwork
   * cross-fades to preview that item instead — used by the SERIES_MIXED
   * rail so the fixed landscape frame mirrors whichever poster currently
   * has spatial-nav focus. Click/enter always still targets `item`.
   */
  previewItem?: ContentRailItem;
  className?: string;
}

export const LandscapeCard = React.memo(function LandscapeCard({ item, config, index, itemsLength, onClick, onFocusChange, previewItem, className }: Props) {
  const tRails = useTranslations("contentRails");
  const tHover = useTranslations("hoverCard");

  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  const [isHovered, setIsHovered] = useState(false);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const toggleMuted = usePlayerStore((s) => s.toggleMuted);

  const [copied, setCopied] = useState(false);
  const user = useAuthStore((s) => s.user);

  const handleShare = useCallback(() => {
    if (typeof window !== "undefined") {
      const shareUrl = deepLinkManager.generateEncryptedShareUrl(
        item?.id,
        String(item?.assetTypeCode || item?.assetType || "MOVIE"),
        item?.title || "",
        user?.id || "",
        window.location.origin
      );
      const clipText = shareUrl || window.location.href;
      navigator.clipboard.writeText(clipText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        // Track content_shared event
        analyticsService.track(EVENT_NAMES.CONTENT_SHARED, {
          content_id:    item?.id,
          content_title: item?.title || "",
          content_type:  String(item?.assetTypeCode || item?.assetType || "MOVIE"),
          share_url:     clipText,
          source:        "landscape_card",
        });
      });
    }
  }, [item, user]);

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

  const imageUrl = item.landscapeImage || item.image;
  const showInternalHover = isHovered && config.hover.type !== "card";

  // Spotlight preview (SERIES_MIXED rails): when spatial-nav focus is on a
  // different poster in the row, that poster's art cross-fades in on top of
  // this card's own image instead of replacing it — the frame position and
  // its own click target never change, only what's currently displayed.
  const isPreviewingOther = !!previewItem && previewItem.id !== item.id;
  const previewImageUrl = previewItem ? (previewItem.landscapeImage || previewItem.image) : undefined;

  return (
    <BaseContentCard
      item={item}
      config={config}
      imageUrl={imageUrl}
      index={index}
      itemsLength={itemsLength}
      onClick={handleClick}
      onHoverChange={setIsHovered}
      onFocusChange={onFocusChange}
      className={className}
    >
      {/* Spotlight preview overlay — cross-fades in/out as focus moves through the rail */}
      {previewImageUrl && (
        <div
          className={`absolute inset-0 z-10 transition-opacity duration-300 ease-out ${isPreviewingOther ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        >
          <JOJOCommonImage
            src={previewImageUrl}
            alt={previewItem?.title ?? ""}
            fill
            contentMode="cover"
            className="object-cover pointer-events-none select-none"
            wrapperClassName="w-full h-full pointer-events-none select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {previewItem?.title && (
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-base font-bold text-theme_1 drop-shadow-md truncate">
                {previewItem.title}
              </h3>
            </div>
          )}
        </div>
      )}

      {/* Video Preview inside card on Hover */}
      {showInternalHover && item.previewUrl && (
        <JOJOCommonVideo
          src={item.previewUrl}
          autoPlay
          muted={isMuted}
          loop
          playsInline
          fill
          className="object-cover"
          wrapperClassName="absolute inset-0 w-full h-full z-10"
        />
      )}

      {showInternalHover ? (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/55 to-transparent p-4 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-bold text-theme_1 drop-shadow-md truncate mb-0.5">
            {item?.title}
          </h3>
          {item.genres && item.genres.length > 0 && (
            <div className="flex flex-wrap items-center text-xs font-semibold text-neutral-300 line-clamp-1 mb-3">
              {item.genres.map((genre, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-1.5 text-neutral-400">•</span>}
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-0.5 w-full">
            <JOJOCustomButton
              state={JOJOButton.State.ACTIVE}
              size={JOJOButton.Size.S}
              leftIcon={<Play size={16} fill="currentColor" />}
              onClick={handleClick}
              aria-label={tHover("play")}
              title={tHover("play")}
              buttonConfig={{ width: "32px", height: "32px", padding: "0", gap: "0", borderRadius: "9999px" }}
            />
            <JOJOCustomButton
              state={JOJOButton.State.DEFAULT}
              size={JOJOButton.Size.S}
              leftIcon={<Plus size={16} />}
              aria-label={tHover("add_to_watchlist")}
              title={tHover("add_to_watchlist")}
              className="!bg-theme_9"
              buttonConfig={{ width: "32px", height: "32px", padding: "0", gap: "0", borderRadius: "9999px" }}
            />
            <JOJOCustomButton
              state={copied ? JOJOButton.State.ACTIVE : JOJOButton.State.DEFAULT}
              size={JOJOButton.Size.S}
              leftIcon={copied ? <Check size={16} className="text-theme_13_samecolour" /> : <Share2 size={16} />}
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              aria-label={copied ? "Copied!" : tHover("share")}
              title={copied ? "Copied!" : tHover("share")}
              className={copied ? "!bg-theme_13_18 !border-theme_13_samecolour !text-theme_13_samecolour" : "!bg-theme_9"}
              buttonConfig={{ width: "32px", height: "32px", padding: "0", gap: "0", borderRadius: "9999px" }}
            />
            <JOJOCustomButton
              state={JOJOButton.State.DEFAULT}
              size={JOJOButton.Size.S}
              leftIcon={<ThumbsUp size={16} />}
              aria-label={tHover("like")}
              title={tHover("like")}
              className="!bg-theme_9"
              buttonConfig={{ width: "32px", height: "32px", padding: "0", gap: "0", borderRadius: "9999px" }}
            />

            <JOJOCustomButton
              state={JOJOButton.State.DEFAULT}
              size={JOJOButton.Size.S}
              leftIcon={isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              onClick={(e) => { e?.stopPropagation?.(); toggleMuted(); }}
              aria-label={isMuted ? tHover("unmute") : tHover("mute")}
              title={isMuted ? tHover("unmute") : tHover("mute")}
              className="!bg-theme_9 ml-auto"
              buttonConfig={{ width: "32px", height: "32px", padding: "0", gap: "0", borderRadius: "9999px" }}
            />
          </div>
        </div>
      ) : (
        config.hover.type !== "card" && (
          <div className="absolute bottom-0 left-0 right-0 z-30 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 text-left">
            {config?.hover?.showTitle && (
              <h3 className="line-clamp-1 text-sm font-semibold text-theme_1">
                {item?.title}
              </h3>
            )}

            {config?.hover?.showMeta && (
              <p className="mt-1 line-clamp-1 text-xs text-theme_1/70">
                {item?.duration} {item?.genres?.length ? `• ${item.genres.join(" • ")}` : ""}
              </p>
            )}
          </div>
        )
      )}
    </BaseContentCard>
  );
});
