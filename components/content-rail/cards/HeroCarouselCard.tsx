"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
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

// The hero's autoplaying background preview video renders as a solid white
// rectangle on this TV, and it survived every distinct technique tried:
//   1. opacity:0 on the <video> — no effect.
//   2. visibility:hidden on the <video> — no effect.
//   3. the native `poster` attribute — no effect once playback actually starts.
//   4. translating the video fully outside the hero's clipped, rounded,
//      overflow:hidden container (not just invisible — geometrically outside
//      its clip region) — no effect.
//   5. waiting for the precise `loadeddata` event instead of a guessed delay
//      before revealing it — confirmed readyState 4 / correct dimensions /
//      currentTime advancing / genuinely on screen at the moment of reveal —
//      still white.
//   6. forcing a low HLS quality level (640x360) instead of 1080p, in case it
//      was resolution-specific — same result at low res as at full res.
//   7. forcing native HLS playback (this device's canPlayType reports "maybe")
//      instead of hls.js + MediaSource, in case it was an MSE-specific decode
//      issue — same result either way.
// Every one of those confirms the video is genuinely decoding and playing
// (correct readyState/dimensions/currentTime throughout) — it simply never
// paints anything but white to the physical screen in this context, on this
// device. That's a hardware/display-pipeline limitation below the DOM, not
// something any CSS/JS/HLS-path change from here can reach. Left disabled;
// the static poster crossfade (unaffected, glitch-free) carries the feature.
const ENABLE_HERO_BACKGROUND_VIDEO = false;

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
  // Delay revealing the video past onPlaying by a short buffer: on this TV's
  // hardware video decode path, onPlaying can fire before a real frame has
  // actually been composited to screen, so crossfading in immediately exposed
  // a blank/white decoder surface for a few frames. Giving it a moment first
  // means we only ever reveal it once real picture is almost certainly there.
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearRevealTimeout = () => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  };

  // Don't even attach the video (start hardware decode) until the slide's own
  // crossfade-in has finished. This card sits inside a parent wrapper whose
  // opacity animates during a slide change — on this TV, animating opacity
  // over an element with a live decoding <video> forces the browser to
  // capture the hardware video plane into a blendable texture every frame,
  // and that capture briefly produces a blank/white frame. Keeping the video
  // out of the DOM until the crossfade is fully settled means the crossfade
  // itself only ever has to blend a plain image — safe — and the video only
  // starts decoding once nothing is animating around it anymore.
  const [isSlideSettled, setIsSlideSettled] = useState(isActive);
  const settleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }
    if (isActive) {
      settleTimeoutRef.current = setTimeout(() => setIsSlideSettled(true), 950);
    } else {
      setIsSlideSettled(false);
    }
    return () => {
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
    };
  }, [isActive]);


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

  const shouldPlay = ENABLE_HERO_BACKGROUND_VIDEO && isActive && isSlideSettled && isIntersecting && !isAnyCardHovered && !isSearchOpen && !isAssetDetailOpen && !isSessionExpiredVisible;

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
        clearRevealTimeout();
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
      clearRevealTimeout();
      setIsVideoLoaded(false);
      video.muted = true;
      video.pause();
      if (!isActive) {
        wasActiveRef.current = false;
      }
    }

    return () => {
      clearRevealTimeout();
    };
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
      {/* Background wrapper */}
      <div
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      >
        {/* Background preview video — right-aligned, 80% visible, never cropped at any breakpoint */}
        {ENABLE_HERO_BACKGROUND_VIDEO && item?.previewUrl && (
          <div
            className={`absolute inset-0 w-full h-full z-0 transition-none ${isVideoLoaded ? "translate-x-0" : "translate-x-[200%]"}`}
          >
            <JOJOCommonVideo
              ref={videoRef}
              src={isActive && isSlideSettled ? item.previewUrl : undefined}
              // `poster` is the video element's own content before playback
              // begins — standard image rendering, not decoder output — so it's
              // always correct even during the window the wrapper above has it
              // translated out of the clipped hero area.
              poster={heroImageUrl}
              // Even with the video's own state fully healthy (readyState 4,
              // correct dimensions at both 1080p AND a stepped-down 360p,
              // genuinely playing, wrapper on screen), the display still
              // rendered solid white either way — ruling out resolution and
              // pointing at the hls.js + MediaSource decode path itself on
              // this TV. This device's canPlayType reports "maybe" for native
              // HLS, so route through that instead — a completely different,
              // often TV-vendor-tuned decode pipeline that never gets tried
              // while MediaSource is available, which it always is here.
              preferNativeHls
              preferConservativeQuality
              autoPlay={isActive && isIntersecting && !isAnyCardHovered && !isAssetDetailOpen && !isSessionExpiredVisible}
              muted={!(isActive && isIntersecting && !isAnyCardHovered && !isAssetDetailOpen && !isSessionExpiredVisible) || isMuted}
              loop
              playsInline
              // onPlaying only means "not paused" — it fires whether or not any
              // frame has actually decoded yet, and on this TV's HLS/MediaSource
              // path over a slow CPU, that can genuinely take well over a
              // second. A live diagnostic caught readyState still at 0 (no data
              // at all) 1.2s into "playing". onLoadedData is the browser's own
              // "a frame for the current position is actually available" signal
              // — only reveal (translate the wrapper back into the clipped
              // area) once that's genuinely true, instead of guessing a fixed
              // delay that can fire before the frame exists.
              onLoadedData={() => {
                clearRevealTimeout();
                revealTimeoutRef.current = setTimeout(() => {
                  setIsVideoLoaded(true);
                }, 100);
              }}
              fill
              // No opacity/visibility here — the wrapper's off-screen translate
              // is what hides this while not ready. The poster (a separate,
              // ordinary <img> layer on top) fading out over it is what makes
              // the reveal read as a crossfade once the wrapper snaps into place.
              style={{ objectFit: "cover", objectPosition: "right center" }}
              wrapperClassName="absolute inset-0 w-full h-full"
            />
          </div>
        )}

        {/* Background poster image — bg-neutral-900 behind it always, so the browser's
            default white canvas never flashes through while the image is still
            downloading (it also swallows the focus border's contrast otherwise). */}
        <div className={`absolute inset-0 w-full h-full z-0 bg-neutral-900 transition-opacity duration-1000 ${isVideoLoaded ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {hasImage ? (
            <JOJOCommonImage
              src={heroImageUrl}
              alt={item?.title}
              width={1600}
              height={900}
              preset={JOJOImagePreset.Banner}
              fill
              priority={true}
              sizes="100vw"
              quality={80}
              className="object-cover"
              wrapperClassName="w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-neutral-900" />
          )}
        </div>
        {/* We keep a subtle left shadow just for text readability if needed, but Hotstar relies more on bottom shadow */}
        <div className={`absolute inset-y-0 left-0 w-full sm:w-[50%] md:w-[45%] lg:w-[40%] xl:w-[35%] bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10 pointer-events-none transition-opacity duration-700 ${isActive ? "opacity-100" : "opacity-0"}`} />
      </div>
      
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
                  optimizeRequestURL={false}
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
