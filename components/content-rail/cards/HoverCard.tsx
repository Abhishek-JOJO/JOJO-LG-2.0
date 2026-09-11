"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { ROUTES } from "@/lib/constants/routes";
import { VIDEO_CONSTANTS, isHlsUrl } from "@/lib/constants/video";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/store/usePlayerStore";
import { Play, Plus, Check, Share2, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { RailCardDesignConfig } from "../config/contentRail.config";
import { ContentRailItem, RailCardVariant } from "../config/contentRail.types";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { deepLinkManager } from "@/lib/deeplink/deepLinkManager";
import { useAsset } from "@/features/content/hooks/useAsset";
import { useAuthStore } from "@/store/useAuthStore";
import { useWatchGating } from "@/features/asset/hooks/useWatchGating";
import { getAssetButtonConfig } from "@/features/asset/model/assetButtonModel";
import { ASSET_CATEGORY_CODE, type ContentAsset } from "@/features/content/model/types";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { GatePopup } from "@/features/asset/ui/GatePopup";
import { useGuestPopupStore } from "@/store/useGuestPopupStore";
import { TvodIcon } from "@/public/svg/TVODIcon";

export type HoverCardAlignment = "left" | "center" | "right";

export interface HoverCardProps {
  item: ContentRailItem;
  alignment?: HoverCardAlignment;
  visible: boolean;
  onPlay?: () => void;
  onAdd?: () => void;
  onShare?: () => void;
  onLike?: () => void;
  className?: string;
  variant?: RailCardVariant;
  config?: RailCardDesignConfig;
  parentRef?: React.RefObject<HTMLDivElement | null>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function HoverCard({
  item,
  visible,
  alignment: props_alignment = "center",
  onShare,
  className,
  variant = RailCardVariant.PORTRAIT,
  parentRef,
  onMouseEnter,
  onMouseLeave,
}: HoverCardProps) {
  const router = useRouter();
  const tButton = useTranslations("contentRails");
  // ── Sizing & Positioning logic ─────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  // `isAnimatingOut` stays true during the exit transition so the card
  // remains visible (and positioned) until the animation fully completes.
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [coords, setCoords] = useState({
    left: 0,
    top: 0,
    width: 0,
    transformOrigin: "center bottom",
  });

  const [isTitleShrunk, setIsTitleShrunk] = useState(false);
  const [tvodAnimate, setTvodAnimate] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsTitleShrunk(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsTitleShrunk(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [visible]);

  const gatingAsset = useMemo(() => ({
    assetId: item.id,
    title: item.title,
    description: item.description || "",
    certification: item.certification || item.ageRating,
    classifications: item.classifications,
    assetCategoryCode: item.isSVOD ? ASSET_CATEGORY_CODE.SVOD : item.isTVOD ? ASSET_CATEGORY_CODE.TVOD : undefined
  }), [item]);

  const { handleWatch, gateResult, clearGate, isSubscribed, isOverseas, isTvodPurchased, pricing, isPricingLoading, isVerifyLoading } = useWatchGating({
    asset: gatingAsset as unknown as ContentAsset,
    enabled: visible
  });

  const buttonConfig = getAssetButtonConfig({
    asset: gatingAsset as unknown as ContentAsset,
    isOverseas,
    isSubscribed,
    isTvodPurchased,
    pricing,
    isPricingLoading,
    isVerifyLoading,
  });

  useIsomorphicLayoutEffect(() => {
    if (!visible) {
      // Start exit animation — keep card positioned so CSS transition can play
      setIsAnimatingOut(true);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      // Match this duration to the CSS exit transition length (320ms)
      exitTimerRef.current = setTimeout(() => {
        setIsPositioned(false);
        setIsAnimatingOut(false);
      }, 840);
      return () => {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      };
    }
    // Card is becoming visible — cancel any in-flight exit
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setIsAnimatingOut(false);

    const calculatePosition = () => {
      const container = containerRef.current;
      if (!container) return;
      const parentEl = parentRef?.current;
      if (!parentEl) return;

      const parentRect = parentEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Set all hover card widths to be identical to the standard landscape hover card size (increased by 10px)
      const isDesktop = viewportWidth >= 640;
      let targetWidth = isDesktop ? 412 : 330;

      // Keep inside screen limits
      const maxAllowedWidth = viewportWidth - 32;
      if (targetWidth > maxAllowedWidth) {
        targetWidth = maxAllowedWidth;
      }

      // Temporarily apply width to container so scrollHeight is computed correctly
      container.style.width = `${targetWidth}px`;
      const hoverHeight = container.getBoundingClientRect().height;

      const leftLimit = 16;
      const rightLimit = viewportWidth - 16;
      const topLimit = 16;
      const bottomLimit = viewportHeight - 16;

      // Center of the source card — animation always originates from here
      const parentCenterX = parentRect.left + parentRect.width / 2;

      // Determine horizontal position based on alignment:
      // - "left"   → card's left edge aligns with the source card's left edge (first card)
      // - "right"  → card's right edge aligns with the source card's right edge (last card)
      // - "center" → card centered over the source card (default)
      let targetLeft: number;
      const alignment = props_alignment; // alias for clarity

      if (alignment === "left") {
        targetLeft = parentRect.left;
      } else if (alignment === "right") {
        targetLeft = parentRect.right - targetWidth;
      } else {
        targetLeft = parentCenterX - targetWidth / 2;
      }

      // Final safety clamp to viewport edges (handles extreme edge cases)
      if (targetLeft < leftLimit) {
        targetLeft = leftLimit;
      } else if (targetLeft + targetWidth > rightLimit) {
        targetLeft = rightLimit - targetWidth;
      }

      // ── Scale-aware clamp ────────────────────────────────────────────────
      // The hover card renders at scale(1.10). CSS transform expands the card
      // outward from its transformOrigin, so the *visual* bounding box is
      // larger than the positioned box. We compute the visual edges after the
      // scale and shift targetLeft so the animated card stays fully on-screen.
      //
      // With transformOrigin at Ox (= parentCenterX - targetLeft):
      //   visual right = 1.10*targetLeft + 1.10*targetWidth - 0.10*parentCenterX
      //   visual left  = 1.10*targetLeft - 0.10*parentCenterX
      const HOVER_SCALE = 1.10;
      const visualRight = HOVER_SCALE * targetLeft + HOVER_SCALE * targetWidth - (HOVER_SCALE - 1) * parentCenterX;
      if (visualRight > rightLimit) {
        // Shift left so the scaled right edge meets the limit
        targetLeft -= (visualRight - rightLimit) / HOVER_SCALE;
        if (targetLeft < leftLimit) targetLeft = leftLimit;
      }
      const visualLeft = HOVER_SCALE * targetLeft - (HOVER_SCALE - 1) * parentCenterX;
      if (visualLeft < leftLimit) {
        // Shift right so the scaled left edge meets the limit
        targetLeft += (leftLimit - visualLeft) / HOVER_SCALE;
      }

      // transformOrigin X: always points at the SOURCE card's center so the
      // scale animation visually "grows from" the hovered card — even when the
      // hover card is left/right-aligned instead of centered.
      const transformOriginX = `${Math.round(parentCenterX - targetLeft)}px`;
      // Position: hover card sits directly above the source card
      // Bottom of hover card = top of source card
      const parentCenterY = parentRect.top + parentRect.height / 2;
      let targetTop = parentRect.top - hoverHeight;
      // transformOrigin Y always points at the center of the source card
      let transformOriginY = `${Math.round(parentCenterY - targetTop)}px`;

      // Collision checks - Vertical
      // If overflows top of viewport, push down — keep origin pointing at card center
      if (targetTop < topLimit) {
        targetTop = topLimit;
        transformOriginY = `${Math.round(parentCenterY - targetTop)}px`;
      }

      // If still overflows bottom (very tall card), clamp — keep origin pointing at card center
      if (targetTop + hoverHeight > bottomLimit) {
        targetTop = bottomLimit - hoverHeight;
        transformOriginY = `${Math.round(parentCenterY - targetTop)}px`;
      }

      // Compute absolute page values for Portal position
      const absoluteLeft = targetLeft + window.scrollX;
      const absoluteTop = targetTop + window.scrollY;

      // CSS transform-origin: <x> <y>  (X axis first, then Y axis)
      setCoords({
        left: absoluteLeft,
        top: absoluteTop,
        width: targetWidth,
        transformOrigin: `${transformOriginX} ${transformOriginY}`,
      });
      setIsPositioned(true);
    };

    calculatePosition();

    window.addEventListener("resize", calculatePosition);
    window.addEventListener("orientationchange", calculatePosition);

    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("orientationchange", calculatePosition);
    };
  }, [visible, variant, props_alignment]);

  // ── Global mute state (shared across all hover cards) ──────────────────────
  const isMuted = usePlayerStore((s) => s.isMuted);
  const toggleMuted = usePlayerStore((s) => s.toggleMuted);

  // ── Share state ───────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const user = useAuthStore((s) => s.user);

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      const shareUrl = await deepLinkManager.generateEncryptedShareUrl(
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
          content_id: item?.id,
          content_title: item?.title || "",
          content_type: String(item?.assetTypeCode || item?.assetType || "MOVIE"),
          share_url: clipText,
          source: "hover_card",
        });
      });
    }
  };
  // ── Auth state ─────────────────────────────────────────────────────────────
  const isGuest = useAuthStore((s) => s.user?.isGuest ?? false);

  // ── Watchlist state ──────────────────────────────────────────────────────
  const watchlistAssets = useWatchlistStore((s) => s.assets);
  const toggleWatchlist = useWatchlistStore((s) => s.toggleWatchlist);
  const inWatchlist = watchlistAssets.some(
    (a) => Number(a.asset_id ?? a.assetId) === Number(item?.id)
  );

  const isAssetDetailOpen = useAssetDetailStore((s) => s.isOpen);
  const isActuallyVisible = visible && !isAssetDetailOpen;

  // Reset then re-trigger TVOD animation every time card becomes visible
  useEffect(() => {
    if (isActuallyVisible) {
      setTvodAnimate(false);
      const raf = requestAnimationFrame(() => {
        setTvodAnimate(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setTvodAnimate(false);
    }
  }, [isActuallyVisible]);

  const { data: assetDetails, isLoading: isAssetLoading } = useAsset(item.id, isActuallyVisible);

  const isShow = item.assetType === "SHOW" || assetDetails?.assetType === "SHOW";
  const displayYear = assetDetails?.releaseDate ? assetDetails.releaseDate.split("-")[0] : item.year;
  const displayCertification = assetDetails?.certification || item?.certification || item?.ageRating;
  const displayDuration = isShow
    ? (assetDetails?.seasons?.length
      ? `${assetDetails.seasons.length} Season${assetDetails.seasons.length > 1 ? "s" : ""}`
      : item.duration)
    : (assetDetails?.durationSeconds && assetDetails.durationSeconds > 0
      ? `${Math.floor(assetDetails.durationSeconds / 3600)}h ${Math.floor((assetDetails.durationSeconds % 3600) / 60)}m`
      : item.duration);

  const isShowAsset = useMemo(() => {
    if (!assetDetails) return false;
    return assetDetails.assetType === "SHOW" || (assetDetails.seasons && assetDetails.seasons.length > 0);
  }, [assetDetails]);

  const firstEpisodeId = useMemo(() => {
    if (!assetDetails?.seasons || assetDetails.seasons.length === 0) return null;
    for (const season of assetDetails.seasons) {
      if (season.episodes && season.episodes.length > 0) {
        const sorted = [...season.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
        return sorted[0]?.assetId;
      }
    }
    return null;
  }, [assetDetails]);

  const handleWatchNow = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();

    if ((item.isSVOD && !isSubscribed) || (item.isTVOD && !isTvodPurchased)) {
      useAssetDetailStore.getState().openAssetDetail(item.id, item.assetTypeCode || item.assetType || "movies", item.title);
      return;
    }

    const targetId = isShowAsset && firstEpisodeId ? firstEpisodeId : item.id;
    const progress = item?.progressSeconds || 0;

    // Save metadata if continue watching or resume is needed
    try {
      sessionStorage.setItem(`play_metadata_${targetId}`, JSON.stringify({
        title: item.title,
        description: item.description || "",
        seriesInfo: null,
        certification: item.certification || null,
        classifications: null,
        assetCategoryCode: item.isSVOD ? 2 : item.isTVOD ? 3 : 1,
        isTvodPurchased,
        isSvodSubscribed: isSubscribed,
        resumeTime: progress,
        bypassResumePrompt: progress > 0
      }));
    } catch {
      // ignore
    }

    handleWatch(String(targetId), progress);
  };

  const previewUrl = useMemo(() => {
    return item?.previewUrl || (item as any)?.preview_url || assetDetails?.previewUrl || null;
  }, [item, assetDetails]);

  // ── Local video state ──────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [shouldPassSrcNatively, setShouldPassSrcNatively] = useState(false);

  const hasPreview = !!previewUrl && !videoError;

  const t = useTranslations("hoverCard");

  // Reset video state whenever previewUrl changes
  useEffect(() => {
    setVideoReady(false);
    setVideoError(false);
  }, [previewUrl, item?.id]);

  useEffect(() => {
    if (!previewUrl) return;
    const video = videoRef.current;
    const isHls = isHlsUrl(previewUrl);
    const nativeHls = video ? video.canPlayType(VIDEO_CONSTANTS.HLS_MIME_TYPE) : false;
    setShouldPassSrcNatively(!isHls || !!nativeHls);
  }, [previewUrl]);

  // Play / pause when visibility changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewUrl) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hlsInstance: any = null;
    let playTimeout: NodeJS.Timeout | null = null;

    if (isActuallyVisible && previewUrl) {
      const isHls = isHlsUrl(previewUrl);
      const nativeHls = video.canPlayType(VIDEO_CONSTANTS.HLS_MIME_TYPE);

      if (isHls && !nativeHls) {
        import("hls.js").then(({ default: Hls }) => {
          if (!videoRef.current) return;
          if (!Hls.isSupported()) {
            setVideoError(true);
            return;
          }

          hlsInstance = new Hls({
            maxBufferLength: 5,
            maxMaxBufferLength: 10,
            enableWorker: true,
          });
          hlsInstance.loadSource(previewUrl);
          hlsInstance.attachMedia(video);

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            playTimeout = setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.play().then(() => {
                  setVideoReady(true);
                }).catch(() => {
                  // Autoplay blocked — silently ignore
                });
              }
            }, 300);
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hlsInstance.on(Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              setVideoError(true);
              hlsInstance?.destroy();
              hlsInstance = null;
            }
          });
        });
      } else {
        // Native playback (either non-HLS or Safari native HLS)
        playTimeout = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().then(() => {
              setVideoReady(true);
            }).catch(() => {
              // Autoplay blocked — silently ignore
            });
          }
        }, 300);
      }
    } else {
      video.pause();
      video.currentTime = 0;
      setVideoReady(false);
    }

    return () => {
      if (playTimeout) {
        clearTimeout(playTimeout);
      }
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
      }
    };
  }, [isActuallyVisible, previewUrl]);

  // Sync global mute state → video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <>
      <div
        ref={containerRef}
        className={cn(
          "absolute z-[100000]",
          "h-fit",
          "rounded-[12px] overflow-hidden",
          "bg-theme_10 cursor-pointer",
          className
        )}
        style={{
          left: `${coords.left}px`,
          top: `${coords.top}px`,
          width: isPositioned ? `${coords.width}px` : undefined,
          transformOrigin: coords.transformOrigin,
          opacity: !isPositioned ? 0 : (visible && !isAnimatingOut) ? 1 : 0,
          transform: !isPositioned
            ? "scale(0)"
            : (visible && !isAnimatingOut)
              ? "scale(1.10)"
              : "scale(0)",
          pointerEvents: visible && isPositioned && !isAnimatingOut ? "auto" : "none",
          transition: (visible && !isAnimatingOut)
            ? "opacity 200ms cubic-bezier(0.34, 1.12, 0.64, 1), transform 350ms cubic-bezier(0.34, 1.12, 0.64, 1)"
            : "opacity 200ms cubic-bezier(0.4, 0, 1, 1), transform 300ms cubic-bezier(0.4, 0, 1, 1)",
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={() => router.push(ROUTES.WATCH(item?.id))}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16 / 9" }}
        >
          {previewUrl && (
            <video
              ref={videoRef}
              src={shouldPassSrcNatively ? previewUrl : undefined}
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                videoReady ? "opacity-100" : "opacity-0"
              )}
              onCanPlay={() => setVideoReady(true)}
              onError={() => setVideoError(true)}
            />
          )}

          {(!videoReady || !hasPreview) && (
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                videoReady && hasPreview ? "opacity-0" : "opacity-100"
              )}
            >
              {item.posterImage || item.landscapeImage || item.image ? (
                <JOJOCommonImage
                  src={item.posterImage || item.landscapeImage || item.image}
                  alt={item.title}
                  fill
                  contentMode="cover"
                  className="object-cover"
                  wrapperClassName="w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800" />
              )}
            </div>
          )}

          {/* Bottom gradient for title legibility */}
          <div className="absolute inset-x-0 -bottom-px h-2/3 bg-gradient-to-t from-theme_10 via-theme_10/20 to-transparent pointer-events-none z-10" />

          {/* Title overlay at the bottom left of the video area (shrinks after 3s) */}
          <div
            className="absolute bottom-3 left-4 right-4 pointer-events-none transition-transform duration-700 ease-out origin-bottom-left z-20"
            style={{
              transform: isTitleShrunk ? "scale(0.60)" : "scale(1)",
            }}
          >
            {item?.title_image ? (
              <div className="relative w-[150px] h-[40px] sm:w-[210px] sm:h-[66px]">
                <JOJOCommonImage
                  src={item?.title_image}
                  alt={item?.title}
                  fill
                  contentMode="contain"
                  position="left"
                  optimizeRequestURL={false}
                  wrapperClassName="w-full h-full"
                />
              </div>
            ) : (
              <h3 className="text-sm sm:text-base font-bold text-theme_1 drop-shadow-md truncate">
                {item?.title}
              </h3>
            )}
          </div>
        </div>

        {/* ── Details & actions ────────────────────────────────────────────── */}
        <div className="relative z-10 -mt-px px-4 pt-3 pb-4 flex flex-col gap-2.5 bg-theme_10">
          {/* ── TVOD — Amazon Prime style: icon + text, left-to-right reveal ── */}
          {item?.isTVOD && isActuallyVisible && (
            <div className="flex items-center gap-2 px-1 overflow-hidden">
              {/* Icon slides in first */}
              <TvodIcon
                size={15}
                className="shrink-0"
                style={{
                  animation: tvodAnimate
                    ? "tvodSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both"
                    : "none",
                  opacity: tvodAnimate ? undefined : 0,
                }}
              />
              {/* Text wipes in left-to-right after icon */}
              <span
                className="text-[13px] font-semibold text-theme_1 leading-none whitespace-nowrap overflow-hidden"
                style={{
                  animation: tvodAnimate
                    ? "tvodTextReveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both"
                    : "none",
                  opacity: tvodAnimate ? undefined : 0,
                }}
              >
                {t("tvod_rental")}
              </span>
            </div>
          )}

          <div
            className="flex items-center gap-2 mt-2 flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <JOJOCustomButton
              state={JOJOButton.State.ACTIVE}
              size={JOJOButton.Size.S}
              appearance={buttonConfig.appearance}
              disabled={buttonConfig.disabled}
              leftIcon={buttonConfig.showIcon ? <Play size={15} fill="currentColor" /> : undefined}
              onClick={handleWatchNow}
              className="text-theme_1 gap-1.5 h-7.5 !font-semibold px-4 transition-all !rounded-full shrink-0"
            >
              {(() => {
                const text = buttonConfig.text;
                // Map button text to translation keys
                if (text === "Play") return tButton("play");
                if (text === "Watch Now") return tButton("watch_now");
                if (text === "Resume") return tButton("resume");
                if (text === "Subscribe to Watch") return tButton("subscribe_to_watch");
                if (text === "Loading...") return tButton("loading");
                // Handle dynamic Rent Now with price
                if (text.startsWith("Rent Now")) {
                  const priceMatch = text.match(/Rent Now (.+)/);
                  return priceMatch ? `${tButton("rent_now")} ${priceMatch[1]}` : tButton("rent_now");
                }
                // Fallback to original text if no translation
                return text;
              })()}
            </JOJOCustomButton>
            <JOJOCustomButton
              state={inWatchlist ? JOJOButton.State.ACTIVE : JOJOButton.State.DEFAULT}
              size={JOJOButton.Size.S}
              leftIcon={inWatchlist ? <Check size={15} /> : <Plus size={15} />}
              onClick={() => {
                if (isGuest) {
                  useGuestPopupStore.getState().openGuestPopup();
                  return;
                }
                const targetId = Number(item?.id);
                toggleWatchlist(targetId, !inWatchlist, {
                  title: item?.title,
                  asset_title: item?.title,
                  poster: item?.posterImage ? [{ url: item.posterImage, ratio_id: 3 }] : [],
                  landscape: item?.landscapeImage ? [{ url: item.landscapeImage, ratio_id: 1 }] : [],
                  image: item?.image,
                  landscapeImage: item?.landscapeImage,
                  portraitImage: item?.portraitImage,
                  posterImage: item?.posterImage,
                  assetTypeCode: item?.assetTypeCode,
                  description: item?.description,
                });
              }}
              aria-label={t("add_to_watchlist")}
              title={inWatchlist ? "In Watchlist" : t("add_to_watchlist")}
              className={inWatchlist ? "!bg-theme_13_18 !border-theme_13_samecolour !text-theme_13_samecolour" : "!bg-theme_9 hover:text-theme_1"}
              buttonConfig={{ width: "30px", height: "30px", padding: "0", gap: "0", borderRadius: "9999px", hoverTextColor: "var(--theme_1)" }}
            />
            <JOJOCustomButton
              state={copied ? JOJOButton.State.ACTIVE : JOJOButton.State.DEFAULT}
              size={JOJOButton.Size.S}
              leftIcon={copied ? <Check size={15} className="text-theme_13_samecolour" /> : <Share2 size={15} />}
              onClick={(e) => {
                e.stopPropagation();
                if (onShare) {
                  onShare();
                } else {
                  handleShare();
                }
              }}
              aria-label={copied ? "Copied!" : t("share")}
              title={copied ? "Copied!" : t("share")}
              className={copied ? "!bg-theme_13_18 !border-theme_13_samecolour !text-theme_13_samecolour" : "!bg-theme_9 hover:text-theme_1"}
              buttonConfig={{ width: "30px", height: "30px", padding: "0", gap: "0", borderRadius: "9999px", hoverTextColor: "var(--theme_1)" }}
            />
            {/* Mute / unmute — only shown when preview is available AND video is actually playing */}
            {hasPreview && videoReady && (
              <JOJOCustomButton
                state={JOJOButton.State.DEFAULT}
                size={JOJOButton.Size.S}
                leftIcon={isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                onClick={(e) => { e?.stopPropagation?.(); toggleMuted(); }}
                aria-label={isMuted ? t("unmute") : t("mute")}
                title={isMuted ? t("unmute") : t("mute")}
                className="!bg-theme_9 hover:text-theme_1"
                buttonConfig={{ width: "30px", height: "30px", padding: "0", gap: "0", borderRadius: "9999px", hoverTextColor: "var(--theme_1)" }}
              />
            )}
          </div>
          {isAssetLoading && !assetDetails ? (
            <div className="flex flex-col gap-2.5 mt-1 animate-pulse">
              {/* Badges capsules placeholder */}
              <div className="flex items-center gap-1.5">
                <div className="h-[22px] w-12 bg-theme_1/8 rounded-md" />
                <div className="h-[22px] w-14 bg-theme_1/8 rounded-md" />
                <div className="h-[22px] w-16 bg-theme_1/8 rounded-md" />
              </div>
              {/* Genres placeholder */}
              <div className="h-[16px] w-[140px] bg-theme_1/8 rounded mt-0.5" />
            </div>
          ) : (
            <>
              {(displayDuration || displayYear || displayCertification || item?.isTop10 || assetDetails?.isInTop10 || (item?.asset_tags_badgeText && item.asset_tags_badgeText.toLowerCase().includes("new"))) && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {/* here show newly added tag */}
                    {item?.asset_tags_badgeText && item.asset_tags_badgeText.toLowerCase().includes("new") && (
                      <span className="px-2 py-0.5 rounded-md bg-theme_9 text-theme_01 font-bold caption-sm-semibold uppercase">
                        {item.asset_tags_badgeText}
                      </span>
                    )}
                    {(item?.isTop10 || assetDetails?.isInTop10 || item?.numberintop10 || assetDetails?.numberintop10) && (
                      <span className="px-2 py-0.5 rounded-md bg-theme_9 text-theme_01 font-bold caption-sm-semibold uppercase">
                        {`TOP ${item?.numberintop10 || assetDetails?.numberintop10 || item?.rank || 10}`}
                      </span>
                    )}
                    {displayCertification && (
                      <span className="px-2 py-0.5 rounded-md bg-theme_9 caption-sm-semibold text-theme_5 uppercase">
                        {displayCertification}
                      </span>
                    )}
                    {displayDuration && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-md bg-theme_9 caption-sm-semibold text-theme_5 uppercase"
                      )}>
                        {displayDuration}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {item?.genres && item?.genres?.length > 0 && (
                <div className="flex flex-wrap items-center caption-sm-semibold text-theme_4 line-clamp-1 mt-0.5">
                  {item?.genres.map((genre, i) => (
                    <span key={i} className="flex items-center">
                      {i > 0 && <span className="mx-1.5 text-theme_4">•</span>}
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {gateResult && "none" !== gateResult.gate && (
        <GatePopup
          gate={gateResult.gate}
          message={gateResult.message}
          onClose={() => {
            clearGate();
          }}
        />
      )}
    </>,
    document.body
  );
}
