"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check, Play, Plus, Share2, ThumbsUp, Volume2, VolumeX, Trash2 } from "lucide-react";

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
  className?: string;
  focusKey?: string;
  /** Shows the focus ring on this card even when spatial-nav focus is on a sibling (spotlight rails). */
  forceFocusRing?: boolean;
  /** True while spatial-nav focus is anywhere within this rail — drives the poster-\>preview-video transition. */
  railActive?: boolean;
  /** Spotlight rails: Left/Right presses cycle which item occupies each slot in the row instead of moving focus off this card. */
  onArrowLeftRight?: (direction: "left" | "right") => void;
}

const SPOTLIGHT_VIDEO_DELAY_MS = 1500;

export const LandscapeCard = React.memo(function LandscapeCard({ item, config, index, itemsLength, onClick, onFocusChange, className, focusKey, forceFocusRing, railActive, onArrowLeftRight }: Props) {
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

  // Spotlight rails: card 0 shows the current lead item's poster first,
  // then — once the rail has held spatial-nav focus for a beat — cross-fades
  // into its autoplaying muted preview trailer, mirroring the Hero
  // Carousel's poster-\>video pattern. Cycling to a different item (via
  // Left/Right) resets the delay so the new poster gets its own beat first.
  const isMixedSeries = (config as any).isMixedSeries;
  const [spotlightVideoReady, setSpotlightVideoReady] = useState(false);
  const [spotlightVideoDelayPassed, setSpotlightVideoDelayPassed] = useState(false);

  useEffect(() => {
    if (!isMixedSeries) return;
    setSpotlightVideoDelayPassed(false);
    setSpotlightVideoReady(false);
    if (!railActive) return;
    const timer = setTimeout(() => setSpotlightVideoDelayPassed(true), SPOTLIGHT_VIDEO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isMixedSeries, railActive, item?.id]);

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

  const spotlightVideoUrl = isMixedSeries ? item?.previewUrl : undefined;
  const shouldPlaySpotlightVideo = isMixedSeries && railActive && spotlightVideoDelayPassed && !!spotlightVideoUrl;

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
      focusKey={focusKey}
      forceFocusRing={forceFocusRing}
      onArrowLeftRight={onArrowLeftRight}
    >
      {/* Persistent title/genre overlay for spotlight rails — the lead slot
          always identifies whichever item currently occupies it. */}
      {isMixedSeries && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {item?.title && (
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-base font-bold text-theme_1 drop-shadow-md truncate">
                {item.title}
              </h3>
            </div>
          )}
        </div>
      )}

      {/* Spotlight preview video — fades in above the poster once the rail has held focus for a beat */}
      {isMixedSeries && spotlightVideoUrl && (
        <div className={`absolute inset-0 z-[15] transition-opacity duration-700 ease-out ${spotlightVideoReady && shouldPlaySpotlightVideo ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <JOJOCommonVideo
            src={shouldPlaySpotlightVideo ? spotlightVideoUrl : undefined}
            autoPlay={shouldPlaySpotlightVideo}
            muted
            loop
            playsInline
            onPlaying={() => setSpotlightVideoReady(true)}
            fill
            className="object-cover pointer-events-none select-none"
            wrapperClassName="w-full h-full pointer-events-none select-none"
          />
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
