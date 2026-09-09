"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import JOJOCommonVideo from "@/components/ui/JOJOCommonVideo";
import { LikeLovePartHerocarousel } from "@/enums/ui.enum";
import { useWatchGating } from "@/features/asset/hooks/useWatchGating";
import { getAssetButtonConfig } from "@/features/asset/model/assetButtonModel";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { useAsset } from "@/features/content/hooks/useAsset";
import { ASSET_CATEGORY_CODE, type ContentAsset } from "@/features/content/model/types";
import { appConfig } from "@/lib/config/app.config";
import { LOGOS } from "@/lib/constants/assets";
import { deepLinkManager } from "@/lib/deeplink/deepLinkManager";
import { cn } from "@/lib/utils";
import { TvodIcon } from "@/public/svg/TVODIcon";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useSessionExpiredStore } from "@/store/useSessionExpiredStore";
import { motion, useScroll, useTransform } from "framer-motion";
import { Check, Play, Plus, Share2, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { RailCardDesignConfig } from "../config/contentRail.config";
import { ContentRailItem } from "../config/contentRail.types";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { buildPlanDetailAnalytics } from "@/features/asset/utils/buildPlanDetailAnalytics";

interface Props {
  item: ContentRailItem;
  config: RailCardDesignConfig;
  index: number;
  isActive: boolean;
  onClick?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  onVideoPlayChange?: (isPlaying: boolean) => void;
  batchPricing?: any;
}

export function HeroCarouselCard({ item, config, index, isActive, onClick, onHoverChange, onVideoPlayChange, batchPricing }: Props) {
  const t = useTranslations("contentRails");
  const heroImageUrl = item?.heroImage || item?.landscapeImage || item?.posterImage || item?.image;
  const hasImage = !!heroImageUrl;
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [tvodAnimate, setTvodAnimate] = useState(false);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setMuted = usePlayerStore((s) => s.setMuted);
  const toggleMuted = usePlayerStore((s) => s.toggleMuted);
  const isAnyCardHovered = usePlayerStore((s) => s.isAnyCardHovered);
  const isSearchOpen = usePlayerStore((s) => s.isSearchOpen);
  const isAssetDetailOpen = useAssetDetailStore((s) => s.isOpen);
  const isSessionExpiredVisible = useSessionExpiredStore((s) => s.isVisible);
  const [activeLikeState, setActiveLikeState] = useState<"none" | LikeLovePartHerocarousel.LIKE | LikeLovePartHerocarousel.LOVE | LikeLovePartHerocarousel.DISLIKE>("none");
  const [showLikeTooltip, setShowLikeTooltip] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<"none" | LikeLovePartHerocarousel.LIKE | LikeLovePartHerocarousel.LOVE | LikeLovePartHerocarousel.DISLIKE>("none");
  const [appreciationState, setAppreciationState] = useState<"none" | LikeLovePartHerocarousel.LIKE | LikeLovePartHerocarousel.LOVE | LikeLovePartHerocarousel.DISLIKE>("none");
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const user = useAuthStore((s) => s.user);

  // ── Share state ───────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ── Asset details (for accurate certification & duration) ─────────────────
  const { data: assetDetails } = useAsset(item.id, isActive);

  const isShow = item.assetType === "SHOW" || assetDetails?.assetType === "SHOW";
  const displayCertification = assetDetails?.certification || item?.certification || item?.ageRating;
  const displayDuration = isShow
    ? (assetDetails?.seasons?.length
      ? `${assetDetails.seasons.length} Season${assetDetails.seasons.length > 1 ? "s" : ""}`
      : item.duration)
    : (assetDetails?.durationSeconds && assetDetails.durationSeconds > 0
      ? `${Math.floor(assetDetails.durationSeconds / 3600)}h ${Math.floor((assetDetails.durationSeconds % 3600) / 60)}m`
      : item.duration);

  const handleLikeMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setShowLikeTooltip(true);
  };

  const handleLikeMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setShowLikeTooltip(false);
      setHoveredOption("none");
    }, 150);
  };

  const selectLikeOption = (state: "none" | LikeLovePartHerocarousel.LIKE | LikeLovePartHerocarousel.LOVE | LikeLovePartHerocarousel.DISLIKE) => {
    setActiveLikeState(state);
    setShowLikeTooltip(false);
    setHoveredOption("none");
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (state !== "none") {
      setAppreciationState(state);
    }
  };

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  // Reset then re-trigger TVOD animation every time slide becomes active
  useEffect(() => {
    if (isActive) {
      setTvodAnimate(false);
      const raf = requestAnimationFrame(() => {
        setTvodAnimate(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setTvodAnimate(false);
    }
  }, [isActive]);

  const isTvodCategory = Boolean(
    item.isTVOD ||
    (batchPricing && (batchPricing.oPricing || batchPricing.price !== undefined || batchPricing.nPrice !== undefined))
  );

  const gatingAsset = useMemo(() => ({
    assetId: item.id,
    assetCategoryCode: item.isSVOD ? ASSET_CATEGORY_CODE.SVOD : isTvodCategory ? ASSET_CATEGORY_CODE.TVOD : undefined
  }), [item, isTvodCategory]);

  const { handleWatch, isSubscribed, isOverseas, isTvodPurchased, pricing, isPricingLoading, isVerifyLoading } = useWatchGating({
    asset: gatingAsset as unknown as ContentAsset,
    enabled: isActive,
    batchPricing,
    disableIndividualPricing: true,
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const wasActiveRef = useRef(false);

  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, (value) => {
    if (!isActive) return 0;
    return Math.max(0, value);
  });
  const bgOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pause video when user has scrolled past 30% of the hero card
    // i.e. when less than 70% of the card is still visible in the viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting && entry.intersectionRatio >= 0.7);
      },
      { threshold: [0.7] }
    );

    observer.observe(container);
    return () => {
      observer.unobserve(container);
    };
  }, []);

  const shouldPlay = isActive && isIntersecting && !isAnyCardHovered && !isSearchOpen && !isAssetDetailOpen && !isSessionExpiredVisible;

  // Unmute hero carousel by default when mounting
  useEffect(() => {
    setMuted(false);
  }, [setMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay) {
      // Sync the muted property on the DOM element
      video.muted = isMuted;

      // If slide just became active, reset time and loading state
      if (!wasActiveRef.current) {
        video.currentTime = 0;
        setIsVideoLoaded(false);
      }
      wasActiveRef.current = true;

      // Play the video
      video.play().catch(() => {
        // Fallback to DOM muted playback if autoplay unmuted is blocked by browser
        if (!isMuted) {
          video.muted = true;
          setMuted(true);
          video.play().catch(() => { });
        }
      });
    } else {
      setIsVideoLoaded(false);
      video.muted = true;
      video.pause();
      if (!isActive) {
        wasActiveRef.current = false;
      }
    }
  }, [shouldPlay, isMuted, item.previewUrl, setMuted, isActive]);

  useEffect(() => {
    if (isActive && isVideoLoaded) {
      onVideoPlayChange?.(true);
    } else {
      onVideoPlayChange?.(false);
    }
    return () => {
      onVideoPlayChange?.(false);
    };
  }, [isActive, isVideoLoaded, onVideoPlayChange]);

  const handleShare = () => {
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
          source:        "hero_carousel",
        });
      });
    }
  };

  useEffect(() => {
    if (activeLikeState === "none") {
      setShowLikeTooltip(false);
    }
  }, [activeLikeState]);

  return (
    <div
      ref={(node) => {
        if (containerRef) {
          containerRef.current = node;
        }
      }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onClick={onClick}
      className={`relative shrink-0 w-full h-full overflow-hidden bg-neutral-950`}
    >
      {/* Sticky background wrapper */}
      <motion.div
        style={{ y: bgY, opacity: bgOpacity }}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      >
        {/* Background preview video — right-aligned, 80% visible, never cropped at any breakpoint */}
        {item?.previewUrl && (
          <div className="absolute inset-0 w-full h-full z-0">
            <JOJOCommonVideo
              ref={videoRef}
              src={isActive ? item.previewUrl : undefined}
              autoPlay={isActive && isIntersecting && !isAnyCardHovered && !isAssetDetailOpen && !isSessionExpiredVisible}
              muted={!(isActive && isIntersecting && !isAnyCardHovered && !isAssetDetailOpen && !isSessionExpiredVisible) || isMuted}
              loop
              playsInline
              onPlaying={() => setIsVideoLoaded(true)}
              onTimeUpdate={(e) => {
                if (e.currentTarget.currentTime > 0 && !isVideoLoaded) {
                  setIsVideoLoaded(true);
                }
              }}
              fill
              className={`transition-opacity duration-1000 ${isVideoLoaded ? "opacity-100" : "opacity-0"}`}
              style={{ objectFit: "cover", objectPosition: "right center" }}
              wrapperClassName="absolute inset-0 w-full h-full"
            />
          </div>
        )}

        {/* Background poster image */}
        <div className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-1000 ${isVideoLoaded ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {hasImage ? (
            <JOJOCommonImage
              src={heroImageUrl}
              alt={item?.title}
              fill
              priority={true}
              sizes="100vw"
              quality={90}
              className="object-cover"
              wrapperClassName="w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-neutral-900" />
          )}
        </div>
        {/* We keep a subtle left shadow just for text readability if needed, but Hotstar relies more on bottom shadow */}
        <div className={`absolute inset-y-0 left-0 w-full sm:w-[50%] md:w-[45%] lg:w-[40%] xl:w-[35%] bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10 pointer-events-none transition-opacity duration-700 ${isActive ? "opacity-100" : "opacity-0"}`} />
      </motion.div>
      
      {/* Hotstar Bottom Gradient */}
      <div className={`absolute inset-x-0 bottom-0 h-[60%] sm:h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none transition-opacity duration-700 ${isActive ? "opacity-100" : "opacity-0"}`} />



      <div
        className={`absolute bottom-12 sm:bottom-16 lg:bottom-20 left-6 sm:left-8 lg:left-12 right-[120px] max-w-4xl text-left z-20 transition-all duration-700 ease-out ${isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
      >
        {/* Title/Logo */}
        {config?.showTitle && (
          <div className={`mb-4 transition-all duration-700 transform ease-out ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} delay-100`}>
            {item?.title_image ? (
              <div className="relative w-full max-w-[260px] sm:max-w-[340px] md:max-w-[400px] h-[55px] sm:h-[75px] md:h-[90px]">
                <JOJOCommonImage
                  src={item.title_image}
                  alt={item.title}
                  fill
                  contentMode="contain"
                  position="left"
                  wrapperClassName="h-full w-full drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                />
              </div>
            ) : (
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-wide leading-tight drop-shadow-md">
                {item?.title}
              </h1>
            )}
          </div>
        )}

        {/* Top Left Badge moved below title */}
        {item?.asset_tags_badgeText && item.asset_tags_badgeText.toLowerCase().includes("new") && (
          <div className={`mb-3 inline-flex items-center bg-[#251307] px-3 py-1 rounded-full transition-all duration-700 transform ease-out ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} delay-150`}>
            <span className="text-[#FF6A00] font-bold text-[10px] sm:text-[11px] tracking-wider uppercase">{item.asset_tags_badgeText}</span>
          </div>
        )}

        {/* Certificate, Year, Duration */}
        <div className={`mb-3 flex flex-wrap items-center gap-2 transition-all duration-700 transform ease-out ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} delay-200`}>
          {displayCertification && (
            <span className="bg-white/20 text-neutral-300 font-semibold text-[11px] px-2.5 py-0.5 rounded-full drop-shadow-md backdrop-blur-sm">
              {displayCertification}
            </span>
          )}
          {item?.year && (
            <span className="bg-white/20 text-neutral-300 font-semibold text-[11px] px-2.5 py-0.5 rounded-full drop-shadow-md backdrop-blur-sm">
              {item.year}
            </span>
          )}
          {displayDuration && (
            <span className="bg-white/20 text-neutral-300 font-semibold text-[11px] px-2.5 py-0.5 rounded-full drop-shadow-md backdrop-blur-sm">
              {displayDuration}
            </span>
          )}
        </div>

        {/* Metadata String: Genre 1 • Genre 2 */}
        <div className={`flex flex-wrap items-center font-bold text-white text-sm sm:text-base md:text-lg transition-all duration-700 transform ease-out ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} delay-300`}>
          {item?.genres?.map((genre, i) => (
            <span key={i} className="flex items-center drop-shadow-md">
              {i > 0 && <span className="mx-2 text-white">•</span>}
              {genre}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
