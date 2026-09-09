"use client";

import { Loader } from "@/components/common/Loader";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { useAsset } from "@/features/content/hooks/useAsset";
import { useEpisodes } from "@/features/content/hooks/useEpisodes";
import { ASSET_CATEGORY_CODE, Professional } from "@/features/content/model/types";
import { isHlsUrl, VIDEO_CONSTANTS } from "@/lib/constants/video";
import { deepLinkManager } from "@/lib/deeplink/deepLinkManager";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestPopupStore } from "@/store/useGuestPopupStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useContinueWatchingStore } from "@/store/useContinueWatchingStore";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Plus,
  Share2,
  ThumbsUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { socketClient } from "@/lib/socket/socket.client";
import { decryptSocketData } from "@/lib/socket/decryptResponse";
import { logger } from "@/lib/logger/logger";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

import NotFound from "@/app/not-found";
import { useWatchGating } from "@/features/asset/hooks/useWatchGating";
import { getAssetButtonConfig } from "@/features/asset/model/assetButtonModel";
import { getAssetTypeSlug, slugify, useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { CastDetailsPopup } from "@/features/asset/ui/CastDetailsPopup";
import { GatePopup } from "@/features/asset/ui/GatePopup";
import { useContentRails } from "@/features/content-rail/hooks/useContentRails";
import { useAppNavigation } from "@/features/navigation/hooks/useAppNavigation";
import { useDragScroll } from "@/hooks/useDragScroll";
import { transformTVODToPaymentPlan } from "@/lib/utils/tvodPaymentTransformer";
import { TvodIcon } from "@/public/svg/TVODIcon";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { AnimatePresence } from "framer-motion";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { buildPlanDetailAnalytics } from "@/features/asset/utils/buildPlanDetailAnalytics";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";

const resolveImage = (asset: any): string => {
  const pick = (arr: any[]) => {
    if (!Array.isArray(arr) || !arr.length) return "";
    return (arr.find((x: any) => x.is_default) || arr[0])?.url || "";
  };
  return (
    pick(asset?.portrait) ||
    pick(asset?.poster) ||
    pick(asset?.landscape) ||
    asset?.image ||
    asset?.thumbnail ||
    ""
  );
};

const resolveTitle = (item: any): string => {
  if (item?.genre) return item.genre.name || "";
  const a = item?.asset || item;
  return a?.asset_title || a?.name_analytics || a?.title || a?.name || "";
};

const resolveId = (item: any): string => {
  const asset = item?.asset || item;
  return String(asset?.id || asset?.asset_id || item?.item_id || item?.id || "");
};

interface AssetDetailViewProps {
  assetId: string;
  onClose?: () => void;
  isStandalone?: boolean;
  initialAsset?: any;
}



export function AssetDetailView({ assetId, onClose, isStandalone = false, initialAsset }: AssetDetailViewProps) {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("hoverCard");
  const tButton = useTranslations("contentRails");
  const { isAppReady } = useBootstrap();
  const sessionId = useAuthStore((state) => state.token);
  const storeUser = useAuthStore((state) => state.user);
  const castListRef = useRef<HTMLDivElement>(null);
  const { isDragging: isCastDragging } = useDragScroll(castListRef);

  const [activeTab, setActiveTab] = useState<"episodes" | "trailers">("episodes");
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [canCastScrollLeft, setCanCastScrollLeft] = useState(false);
  const [canCastScrollRight, setCanCastScrollRight] = useState(false);

  const [isSocketConnected, setIsSocketConnected] = useState(socketClient.isConnected);

  useEffect(() => {
    if (socketClient.isConnected) {
      setIsSocketConnected(true);
      return;
    }

    const handleConnect = () => {
      logger.info("[Client AssetDetailView] Socket connected event detected");
      setIsSocketConnected(true);
    };

    socketClient.on("connect", handleConnect);

    const interval = setInterval(() => {
      if (socketClient.isConnected) {
        setIsSocketConnected(true);
        clearInterval(interval);
      }
    }, 150);

    return () => {
      socketClient.off("connect", handleConnect);
      clearInterval(interval);
    };
  }, []);

  let isGuest = !!storeUser?.isGuest;
  if (typeof window !== "undefined" && !storeUser) {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        isGuest = !!parsed.isGuest;
      }
    } catch {
      // ignore
    }
  }

  // Gate asset fetch behind BOTH isAppReady AND a valid session token.
  // Without both guards the query can fire:
  //   a) before bootstrap completes (no token at all), OR
  //   b) with an empty/stale token if the Zustand store update hasn't propagated yet.
  const { data: clientAsset, isLoading: assetLoading, isError, error, fetchStatus, status } = useAsset(
    assetId,
    !!assetId && isAppReady && !!sessionId
  );
  const queryNotStarted = status === 'pending' && fetchStatus === 'idle';
  // A 403 means the WebSocket socket handshake hasn't finished — treat as transient loading.
  const isTransient403 = isError && ((error as any)?.status === 403 || String(error).includes('socket'));
  
  const currentAsset = (clientAsset || initialAsset) as typeof clientAsset;
  
  // Auth is loading if bootstrap isn't done, session isn't loaded, or socket handshake is failing
  const isAuthLoading = !isAppReady || !sessionId || isTransient403;

  // We only show the full-page skeleton if we have NO asset data at all (not even initialAsset)
  // AND the data is currently loading/waiting to load
  const isDataLoading = assetLoading || (!clientAsset && queryNotStarted);
  const showSkeleton = !currentAsset && (isAuthLoading || isDataLoading);
  
  // Provide an alias for the rest of the component to use
  const asset = currentAsset;

  // console.log("[Client AssetDetailView state]", {
  //   assetId,
  //   sessionIdExists: !!sessionId,
  //   isSocketConnected,
  //   hasAsset: !!asset,
  //   assetTitle: asset?.title,
  //   assetLoading,
  //   fetchStatus,
  //   status,
  //   queryNotStarted,
  //   isLoading,
  //   isError,
  //   error: error ? (error as any).message || error : null
  // });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [interactionData, setInteractionData] = useState<any>(null);

  // Sync isLiked state (defaults to false when interactions API is removed)
  useEffect(() => {
    if (!assetId || !sessionId || !isAppReady) return;

    let timer: NodeJS.Timeout;

    const handleInteractionResponse = (rawResponse: any) => {
      const response = decryptSocketData(rawResponse);
      if (!response) return;

      const metaData = response['meta-data'] || response.metadata || response.meta || {};
      const eventName = response.en || metaData.en || response.event_name || response.event || '';
      if (eventName === 'asset-interactions' || eventName === 'asset_interactions') {
        logger.info('[AssetDetailView] Received asset-interactions data', response);
        const data = Array.isArray(response.data) ? response.data[0] : (response.data || response);
        setInteractionData(data);
      }
    };

    socketClient.on('res', handleInteractionResponse);

    // Trigger 500ms after component mounts and socket is verified
    timer = setTimeout(() => {
      const validAssetId = assetId ? Number(assetId) : null;
      if (!validAssetId || isNaN(validAssetId)) {
        logger.warn('[AssetDetailView] Invalid assetId for asset-interactions', { assetId });
        return;
      }
      if (socketClient.isConnected) {
        logger.info('[AssetDetailView] Querying asset-interactions for asset', { assetId: validAssetId });
        socketClient.emitRequest('asset-interactions', {
          asset_id: validAssetId,
        }, true);
      } else {
        logger.warn('[AssetDetailView] Socket not connected, scheduling retry in 1000ms');
        setTimeout(() => {
          if (socketClient.isConnected) {
            socketClient.emitRequest('asset-interactions', {
              asset_id: validAssetId,
            }, true);
          }
        }, 1000);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      socketClient.off('res', handleInteractionResponse);
    };
  }, [assetId, sessionId, isAppReady]);

  // Sync isLiked state with interactionData when received
  useEffect(() => {
    if (interactionData) {
      const liked = interactionData.reaction === 'like' ||
        interactionData.reaction === 1 ||
        interactionData.is_liked ||
        interactionData.isLiked;
      if (liked !== undefined) {
        setIsLiked(!!liked);
      }
    }
  }, [interactionData]);

  const previewsList = useMemo(() => {
    const list: Array<{
      id: string;
      type: "video" | "image";
      videoUrl: string | null;
      poster: string;
      title: string;
    }> = [];

    // 1. Always add previewUrl as slide 1 (if available)
    if (asset?.previewUrl) {
      list.push({
        id: "main-preview",
        type: "video",
        videoUrl: asset.previewUrl,
        poster: asset.poster?.url || asset.landscape?.url || "",
        title: asset.title,
      });
    }

    // 2. Always append atrailers after previewUrl
    if (asset?.atrailers && Array.isArray(asset.atrailers) && asset.atrailers.length > 0) {
      asset.atrailers.forEach((trailer: any, idx: number) => {
        const videoUrl = trailer.trailer_url || trailer.preview_url || trailer.url || null;
        const poster =
          trailer.trailer_thumbnail || "";
        if (videoUrl) {
          list.push({
            id: `atrailer-${trailer.trailer_id ?? idx}`,
            type: "video",
            videoUrl,
            poster,
            title: trailer.trailer_title || trailer.name_analytics || `Trailer ${idx + 1}`,
          });
        }
      });
    }

    // 3. Fallback: legacy `trailers` field if nothing added yet
    if (list.length === 0 && asset?.trailers && Array.isArray(asset.trailers)) {
      asset.trailers.forEach((trailer: any, idx: number) => {
        const videoUrl =
          trailer.preview_url || trailer.previewUrl ||
          trailer.playback_url || trailer.playbackUrl ||
          trailer.url || null;
        const poster =
          trailer.landscape?.url || trailer.landscape ||
          trailer.poster?.url || trailer.poster ||
          trailer.image || "";
        if (videoUrl) {
          list.push({
            id: `trailer-${trailer.asset_id ?? idx}`,
            type: "video",
            videoUrl,
            poster: typeof poster === "string" ? poster : (poster?.url || ""),
            title: trailer.asset_title || trailer.title || `Trailer ${idx + 1}`,
          });
        }
      });
    }

    // 4. Last resort: static poster image
    if (list.length === 0) {
      list.push({
        id: "main-poster",
        type: "image",
        videoUrl: null,
        poster: asset?.poster?.url || asset?.landscape?.url || "",
        title: asset?.title || "",
      });
    }

    return list;
  }, [asset]);

  const activePreview = useMemo(() => {
    return previewsList[currentSlideIndex] || null;
  }, [previewsList, currentSlideIndex]);

  // Reset slide index if assetId changes
  useEffect(() => {
    setCurrentSlideIndex(0);
  }, [assetId]);

  // Track whether slide was changed manually by the user (shorter autoplay delay)
  const isUserSlideChangeRef = useRef(false);

  const handleNextSlide = useCallback(() => {
    if (previewsList.length <= 1) return;
    isUserSlideChangeRef.current = true;
    setCurrentSlideIndex((prev) => (prev + 1) % previewsList.length);
  }, [previewsList]);

  const handlePrevSlide = useCallback(() => {
    if (previewsList.length <= 1) return;
    isUserSlideChangeRef.current = true;
    setCurrentSlideIndex((prev) => (prev - 1 + previewsList.length) % previewsList.length);
  }, [previewsList]);

  const handleSlideChange = (idx: number) => {
    isUserSlideChangeRef.current = true;
    setCurrentSlideIndex(idx);
  };

  // Scroll window to top when assetId changes (only on standalone details page views)
  useEffect(() => {
    if (isStandalone) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [assetId, isStandalone]);

  const { data: navItems } = useAppNavigation(isAppReady);
  const openAssetDetail = useAssetDetailStore((s) => s.openAssetDetail);

  const homeSubnavId = useMemo(() => {
    return navItems?.find((i) => i.url === "/" || i.url === "/home")?.subnav_id ?? 1;
  }, [navItems]);

  // Only fetch rails after the main asset has loaded to avoid competing requests
  const { data: railsData, isLoading: railsLoading } = useContentRails(
    homeSubnavId,
    isAppReady && !assetLoading
  );

  const recentItems = useMemo(() => {
    if (!railsData?.pages) return [];

    // Flatten rails
    const rails: any[] = railsData.pages.flatMap((page: any) => {
      const d = page?.data;
      return (
        d?.content_rail_items ||
        d?.rails ||
        d?.navigation_list ||
        page?.rails ||
        (Array.isArray(page) ? page : [])
      );
    });

    const recentRail = rails.find((rail: any) => {
      const name = (rail?.cr_name || "").toLowerCase();
      return name.includes("recent") || name.includes("arrival") || name.includes("new");
    });

    const items = recentRail?.cr_items || recentRail?.items || recentRail?.contents || [];
    return items;
  }, [railsData]);

  const displayRelated = useMemo(() => {
    return recentItems.slice(0, 16);
  }, [recentItems]);

  // Combine directors + writers + professionals for Cast & Crew display
  const castList = useMemo(() => {
    if (!asset) return [];

    const items: Array<Professional> = [];
    const idMap = new Map<number, Professional>();

    const addOrMerge = (p: Professional) => {
      const id = p.id;
      if (!id) return;

      if (idMap.has(id)) {
        const existing = idMap.get(id)!;
        if (existing.role && p.role && !existing.role.includes(p.role)) {
          existing.role = `${existing.role} & ${p.role}`;
        }
      } else {
        const newItem = {
          id,
          name: p.name,
          role: p.role,
          image: p.image,
        };
        idMap.set(id, newItem);
        items.push(newItem);
      }
    };

    // 1. Add Professionals (Cast) first
    if (asset.professionals && asset.professionals.length > 0) {
      asset.professionals.forEach(addOrMerge);
    }
    // 2. Add Directors next
    if (asset.directors && asset.directors.length > 0) {
      asset.directors.forEach(addOrMerge);
    }
    // 3. Add Writers last
    if (asset.writers && asset.writers.length > 0) {
      asset.writers.forEach(addOrMerge);
    }

    return items;
  }, [asset]);

  const relatedListRef = useRef<HTMLDivElement>(null);
  const { isDragging } = useDragScroll(relatedListRef);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = relatedListRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);

    let observer: ResizeObserver | null = null;
    if (typeof window !== "undefined" && relatedListRef.current) {
      observer = new ResizeObserver(() => {
        checkScroll();
      });
      observer.observe(relatedListRef.current);
    }

    return () => {
      window.removeEventListener("resize", checkScroll);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [displayRelated, checkScroll]);

  useEffect(() => {
    if (!railsLoading) {
      const timer = setTimeout(checkScroll, 200);
      return () => clearTimeout(timer);
    }
  }, [railsLoading, checkScroll]);



  const checkCastScroll = useCallback(() => {
    const el = castListRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanCastScrollLeft(scrollLeft > 5);
      setCanCastScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkCastScroll();
    window.addEventListener("resize", checkCastScroll);

    let observer: ResizeObserver | null = null;
    if (typeof window !== "undefined" && castListRef.current) {
      observer = new ResizeObserver(() => {
        checkCastScroll();
      });
      observer.observe(castListRef.current);
    }

    return () => {
      window.removeEventListener("resize", checkCastScroll);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [castList, checkCastScroll]);

  useEffect(() => {
    if (!showSkeleton) {
      const timer = setTimeout(checkCastScroll, 200);
      return () => clearTimeout(timer);
    }
  }, [showSkeleton, checkCastScroll]);

  // Interactive Action States
  // Watchlist — powered by socket store
  const watchlistAssets = useWatchlistStore((s) => s.assets);
  const toggleWatchlist = useWatchlistStore((s) => s.toggleWatchlist);
  const inWatchlist = watchlistAssets.some(
    (a) => Number(a.asset_id ?? a.assetId) === Number(asset?.assetId ?? assetId)
  );
  const [isLiked, setIsLiked] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  // Video Autoplay States
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [shouldPassSrcNatively, setShouldPassSrcNatively] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mute State & Controls
  const isMuted = usePlayerStore((s) => s.isMuted);
  const toggleMuted = usePlayerStore((s) => s.toggleMuted);

  // State to track the progress percentage (0 to 100) of the current active slide
  const [slideProgress, setSlideProgress] = useState(0);

  // Title shrink animation (same as HoverCard)
  const [isTitleShrunk, setIsTitleShrunk] = useState(false);

  useEffect(() => {
    setIsTitleShrunk(false);
    if (!asset) return;

    const timer = setTimeout(() => {
      setIsTitleShrunk(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [assetId, asset]);

  // TVOD Rental Section animation (same as HoverCard)
  const [tvodAnimate, setTvodAnimate] = useState(false);

  useEffect(() => {
    if (asset) {
      setTvodAnimate(false);
      const raf = requestAnimationFrame(() => {
        setTvodAnimate(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setTvodAnimate(false);
    }
  }, [assetId, asset]);

  const autoNextSlide = useCallback(() => {
    if (previewsList.length <= 1) return;
    setCurrentSlideIndex((prev) => (prev + 1) % previewsList.length);
  }, [previewsList]);

  // Handle slide progress and auto-advancing for image / fallback slides
  useEffect(() => {
    setSlideProgress(0);
    if (previewsList.length <= 1) return;

    const isImage = activePreview?.type === "image" || !activePreview?.videoUrl || videoError;

    if (isImage) {
      const startTime = Date.now();
      const duration = 2000; // 2 seconds

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min((elapsed / duration) * 100, 100);
        setSlideProgress(pct);

        if (elapsed >= duration) {
          clearInterval(interval);
          autoNextSlide();
        }
      }, 16);

      return () => clearInterval(interval);
    }
  }, [currentSlideIndex, activePreview, previewsList.length, videoError, autoNextSlide]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      setSlideProgress(pct);
    }
  };

  const handleVideoEnded = () => {
    autoNextSlide();
  };

  useEffect(() => {
    setVideoStarted(false);
    setVideoReady(false);
    setVideoError(false);

    if (!activePreview?.videoUrl) return;

    const delay = isUserSlideChangeRef.current ? 500 : 2000;
    isUserSlideChangeRef.current = false; // reset after reading

    const timer = setTimeout(() => {
      setVideoStarted(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [assetId, currentSlideIndex, activePreview?.videoUrl]);

  // Sync mute state with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Load and play HLS video if needed
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoStarted || !activePreview?.videoUrl) return;

    const isHls = isHlsUrl(activePreview.videoUrl);
    const nativeHls = video.canPlayType(VIDEO_CONSTANTS.HLS_MIME_TYPE);
    const passNatively = !isHls || !!nativeHls;
    setShouldPassSrcNatively(passNatively);

    let hlsInstance: any = null;

    if (isHls && !nativeHls) {
      import("hls.js").then(({ default: Hls }) => {
        if (!videoRef.current) return;
        if (!Hls.isSupported()) {
          setVideoError(true);
          return;
        }
        hlsInstance = new Hls({
          maxMaxBufferLength: 10,
          enableWorker: true,
        });
        hlsInstance.loadSource(activePreview.videoUrl!);
        hlsInstance.attachMedia(videoRef.current);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().then(() => {
            setVideoReady(true);
          }).catch(() => { });
        });
        hlsInstance.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            setVideoError(true);
            hlsInstance?.destroy();
          }
        });
      });
    } else {
      video.currentTime = 0;
      video.play().then(() => {
        setVideoReady(true);
      }).catch(() => {
        setVideoError(true);
      });
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [videoStarted, activePreview?.videoUrl]);

  // Series details setup using the custom useEpisodes hook
  const seasonsOption = useMemo(() => asset?.seasons ?? [], [asset]);
  const {
    selectedSeasonIndex,
    displayedEpisodes,
    isLoading: episodesLoading,
    hasMore,
    handleSeasonChange,
    loadMoreEpisodes,
  } = useEpisodes({ seasons: seasonsOption });

  const activeSeason = seasonsOption[selectedSeasonIndex];

  const isShowAsset = useMemo(() => {
    if (!asset) return false;
    return asset.assetType === "SHOW" || (asset.seasons && asset.seasons.length > 0);
  }, [asset]);

  const firstEpisodeId = useMemo(() => {
    if (!asset?.seasons || asset.seasons.length === 0) return null;
    for (const season of asset.seasons) {
      if (season.episodes && season.episodes.length > 0) {
        const sorted = [...season.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
        return sorted[0]?.assetId;
      }
    }
    return null;
  }, [asset]);

  // ── Entitlement gating (mobile → auth → overseas → SVOD → TVOD) ──────────
  const {
    handleWatch,
    gateResult,
    clearGate,
    isPricingLoading,
    isSubscribed,
    isOverseas,
    isTvodPurchased,
    pricing,
    isVerifyLoading,
  } = useWatchGating({ asset, enabled: isAppReady });

  const cwItems = useContinueWatchingStore((s) => s.items);

  // For Shows, find if any episode from any season is in the Continue Watching list.
  // If found, that is our last watched episode, which we should resume.
  const lastWatchedEpisodeCwItem = useMemo(() => {
    if (!isShowAsset || !asset?.seasons) return null;
    const allEpisodes = asset.seasons.flatMap((s) => s.episodes || []);
    return cwItems.find((cw) =>
      allEpisodes.some((ep) => String(ep.assetId) === String(cw.id))
    ) || null;
  }, [isShowAsset, asset, cwItems]);

  const targetId = useMemo(() => {
    if (isShowAsset) {
      if (lastWatchedEpisodeCwItem) {
        return String(lastWatchedEpisodeCwItem.id);
      }
      return firstEpisodeId ? String(firstEpisodeId) : assetId;
    }
    return assetId;
  }, [isShowAsset, lastWatchedEpisodeCwItem, firstEpisodeId, assetId]);

  const cwItem = lastWatchedEpisodeCwItem || cwItems.find(
    (item) => String(item.id) === String(assetId)
  );

  const effectiveProgress =
    (typeof interactionData?.progress === 'number' ? interactionData.progress : undefined) ??
    (typeof interactionData?.progressSeconds === 'number' ? interactionData.progressSeconds : undefined) ??
    cwItem?.progressSeconds;

  const effectiveIsCompleted =
    interactionData?.isCompleted ??
    interactionData?.is_completed ??
    (cwItem as any)?.isCompleted ??
    (cwItem as any)?.is_completed;

  const buttonConfig = getAssetButtonConfig({
    asset,
    isOverseas,
    isSubscribed,
    isTvodPurchased,
    pricing,
    isPricingLoading,
    isVerifyLoading,
    progress: effectiveProgress,
    isCompleted: effectiveIsCompleted,
  });

  // Primary Action — runs the full gate chain before navigating
  const handleWatchNow = () => {
    const isTVODBtn = asset?.assetCategoryCode === ASSET_CATEGORY_CODE.TVOD || asset?.assetCategory === 'TVOD' || asset?.isTVOD || buttonConfig.text.toLowerCase().includes("rent");
    const isSubscribeBtn = buttonConfig.text.toLowerCase().includes("subscribe") || (!isSubscribed && (asset?.isSVOD || asset?.assetCategory === 'SVOD' || asset?.assetCategoryCode === ASSET_CATEGORY_CODE.SVOD));

    if (isTVODBtn && !isTvodPurchased) {
      const tvodProps = buildPlanDetailAnalytics(asset, pricing, storeUser, "TVOD");
      analyticsService.track(EVENT_NAMES.TVOD_PLAN_DETAIL_PAGE_POPUP_OPENED, tvodProps);
    } else if (isSubscribeBtn) {
      const svodProps = buildPlanDetailAnalytics(asset, pricing, storeUser, "SVOD");
      analyticsService.track(EVENT_NAMES.SVOD_PLAN_DETAIL_PAGE_EVENT, svodProps);
    }

    const progress = effectiveProgress ?? 0;
    handleWatch(targetId, progress);
  };

  // ── Focus setup ──────────────────────────────────────────────────────────
  const listsRef = useRef({
    isShowAsset,
    firstCastId: castList?.[0]?.id,
    hasCast: castList && castList.length > 0,
    firstRelatedId: displayRelated?.[0] ? resolveId(displayRelated[0]) : null,
    hasRelated: displayRelated && displayRelated.length > 0,
  });

  useEffect(() => {
    listsRef.current = {
      isShowAsset,
      firstCastId: castList?.[0]?.id,
      hasCast: castList && castList.length > 0,
      firstRelatedId: displayRelated?.[0] ? resolveId(displayRelated[0]) : null,
      hasRelated: displayRelated && displayRelated.length > 0,
    };
  }, [isShowAsset, castList, displayRelated]);

  const navigateDownFromActions = () => {
    const state = listsRef.current;
    if (state.isShowAsset) {
      setFocus('tab-episodes');
    } else if (state.hasCast && state.firstCastId) {
      setFocus(`cast-${state.firstCastId}`);
    } else if (state.hasRelated && state.firstRelatedId) {
      setFocus(`related-item-${state.firstRelatedId}`);
    } else {
      setFocus(`asset-watch-now-${assetId}`);
    }
  };

  const navigateUpFromActions = () => {
    if (!isStandalone) {
      setFocus('asset-close-btn');
    } else if (previewsList?.length > 1) {
      setFocus('preview-dot-0');
    }
  };

  const { ref: watchNowRef, focused: watchNowFocused } = useFocusable({
    focusKey: `asset-watch-now-${assetId}`,
    onArrowPress: (direction) => {
      if (direction === 'up') { navigateUpFromActions(); return false; }
      if (direction === 'left') return false;
      if (direction === 'down') {
        navigateDownFromActions();
        return false;
      }
      return true;
    },
    onEnterPress: () => handleWatchNow(),
    onFocus: () => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const { ref: watchlistRef, focused: watchlistFocused } = useFocusable({
    focusKey: `asset-watchlist-${assetId}`,
    onArrowPress: (direction) => {
      if (direction === 'up') { navigateUpFromActions(); return false; }
      if (direction === 'down') {
        navigateDownFromActions();
        return false;
      }
      return true;
    },
    onEnterPress: () => {
      if (isGuest) {
        useGuestPopupStore.getState().openGuestPopup();
        return;
      }
      const targetId = Number(asset?.assetId ?? assetId);
      toggleWatchlist(targetId, !inWatchlist, asset ? {
        title: asset.title,
        asset_title: asset.title,
        poster: asset.poster,
        landscape: asset.landscape,
        posterImage: asset.poster?.url,
        landscapeImage: asset.landscape?.url,
        image: asset.landscape?.url || asset.poster?.url || "",
        assetTypeCode: asset.assetTypeCode,
        description: asset.description,
      } : undefined);
    },
    onFocus: () => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const { ref: shareRef, focused: shareFocused } = useFocusable({
    focusKey: `asset-share-${assetId}`,
    onArrowPress: (direction) => {
      if (direction === 'up') { navigateUpFromActions(); return false; }
      if (direction === 'down') {
        navigateDownFromActions();
        return false;
      }
      return true;
    },
    onEnterPress: () => {
      if (typeof window !== "undefined") {
        const shareUrl = deepLinkManager.generateEncryptedShareUrl(
          String(asset?.assetId ?? assetId),
          String(asset?.assetTypeCode || "MOVIE"),
          asset?.title || "",
          storeUser?.id || "",
          window.location.origin
        );
        const clipText = shareUrl || window.location.href;
        navigator.clipboard.writeText(clipText).then(() => {
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
          analyticsService.track(EVENT_NAMES.CONTENT_SHARED, {
            asset_id: String(asset?.assetId ?? assetId),
            asset_title: asset?.title ?? '',
            content_type: asset?.assetType === 'SHOW' ? 'show' : 'movie',
            share_method: 'clipboard',
          });
        });
      }
    },
    onFocus: () => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const { ref: likeRef, focused: likeFocused } = useFocusable({
    focusKey: `asset-like-${assetId}`,
    onArrowPress: (direction) => {
      if (direction === 'up') { navigateUpFromActions(); return false; }
      if (direction === 'down') {
        navigateDownFromActions();
        return false;
      }
      return true;
    },
    onEnterPress: () => {
      if (isGuest) {
        useGuestPopupStore.getState().openGuestPopup();
        return;
      }
      const nextLiked = !isLiked;
      setIsLiked(nextLiked);
      analyticsService.track(nextLiked ? EVENT_NAMES.CONTENT_LIKED : EVENT_NAMES.CONTENT_DISLIKED, {
        asset_id: String(asset?.assetId ?? assetId),
        asset_title: asset?.title ?? '',
        content_type: asset?.assetType === 'SHOW' ? 'show' : 'movie',
      });
    },
    onFocus: () => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const { ref: muteRef, focused: muteFocused } = useFocusable({
    focusKey: `asset-mute-${assetId}`,
    onArrowPress: (direction) => {
      if (direction === 'up') { navigateUpFromActions(); return false; }
      if (direction === 'right') return false;
      if (direction === 'down') {
        navigateDownFromActions();
        return false;
      }
      return true;
    },
    onEnterPress: () => {
      toggleMuted();
      analyticsService.track(EVENT_NAMES.PLAYER_MUTE_TOGGLED, {
        asset_id: String(asset?.assetId ?? assetId),
        asset_title: asset?.title ?? '',
        is_muted: !isMuted,
        source: 'content_detail_card',
      });
    },
    onFocus: () => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // 1. Initial Focus Trigger: Set focus to primary Watch Now button as soon as skeleton finishes loading
  useEffect(() => {
    if (!showSkeleton && asset && !isAuthLoading && !isDataLoading) {
      const timer = setTimeout(() => {
        setFocus(`asset-watch-now-${assetId}`);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [assetId, showSkeleton, isAuthLoading, isDataLoading, asset]);

  // 2. Focus Auto-Recovery Guard: Continuously ensure focus is maintained on AssetDetailView
  useEffect(() => {
    if (showSkeleton || !asset) return;

    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;

      const isAnyActionFocused =
        watchNowFocused ||
        watchlistFocused ||
        shareFocused ||
        likeFocused ||
        muteFocused;

      if (!isAnyActionFocused) {
        const container = document.getElementById("asset-detail-container");
        if (container) {
          const activeFocusedInDom = container.querySelector(
            '[data-focuskey].ring-4, ' +
            '[data-focuskey].scale-110, ' +
            '[data-focuskey].scale-105, ' +
            '[data-focuskey].border-white'
          );

          if (!activeFocusedInDom) {
            const watchNowKey = `asset-watch-now-${assetId}`;
            const watchNowEl = container.querySelector(`[data-focuskey="${watchNowKey}"]`);
            if (watchNowEl) {
              setFocus(watchNowKey);
            } else {
              const firstFocusable = container.querySelector('[data-focuskey]');
              if (firstFocusable) {
                const key = firstFocusable.getAttribute("data-focuskey");
                if (key) setFocus(key);
              }
            }
          }
        }
      }

      if (attempts >= 12) {
        clearInterval(checkInterval);
      }
    }, 150);

    return () => clearInterval(checkInterval);
  }, [
    assetId,
    showSkeleton,
    asset,
    watchNowFocused,
    watchlistFocused,
    shareFocused,
    likeFocused,
    muteFocused,
    videoStarted,
    videoReady
  ]);

  if (showSkeleton) {
    return (
      <div
        className={
          isStandalone
            ? "relative w-full min-h-screen bg-theme_10 text-theme_1 overflow-x-hidden pb-16 animate-pulse"
            : "relative w-full max-w-[850px] mx-auto bg-theme_10 text-theme_1 rounded-[12px] overflow-hidden animate-pulse"
        }
      >
        {/* Banner Area Placeholder */}
        <div
          className={
            isStandalone
              ? "relative w-full h-[350px] sm:h-[500px] md:h-[600px] lg:h-[70vh] bg-neutral-900 flex flex-col justify-end p-6 gap-4"
              : "relative w-full h-[280px] sm:h-[450px] bg-neutral-900 flex flex-col justify-end p-6 gap-4"
          }
        >
          {/* Logo/Title block */}
          <div className="h-8 sm:h-16 w-[180px] sm:w-[320px] bg-neutral-800 rounded-lg z-20" />

          {/* Badges block */}
          <div className="flex gap-3 mt-2 z-20">
            <div className="h-4 sm:h-5 w-20 bg-neutral-800 rounded-full" />
            <div className="h-4 sm:h-5 w-16 bg-neutral-800 rounded-full" />
            <div className="h-4 sm:h-5 w-12 bg-neutral-800 rounded-full" />
            <div className="h-4 sm:h-5 w-24 bg-neutral-800 rounded-full" />
          </div>

          {/* Action Row block */}
          <div className="flex items-center gap-3 mt-2 z-20">
            <div className="h-10 sm:h-11 w-32 sm:w-36 bg-neutral-800 rounded-full" />
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-neutral-800 rounded-full" />
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-neutral-800 rounded-full" />
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-neutral-800 rounded-full" />
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-neutral-800 rounded-full" />
          </div>

          {/* Overlay gradients for exact layout matching */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to top, var(--theme_10, #191919) 0%, var(--theme_10_50, rgba(25, 25, 25, 0.5)) 40%, transparent 100%)" }}
          />
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, var(--theme_10, #191919) 0%, var(--theme_10_50, rgba(25, 25, 25, 0.5)) 20%, transparent 100%)" }}
          />
        </div>

        {/* Description Section Placeholder */}
        <div
          className={
            isStandalone
              ? "px-4 sm:px-6 lg:px-14 py-8 border-b border-neutral-900 bg-theme_10 flex flex-col gap-2.5"
              : "px-6 py-6 border-b border-neutral-900 bg-theme_10 flex flex-col gap-2.5"
          }
        >
          <div className="h-4 w-full bg-neutral-900 rounded" />
          <div className="h-4 w-[92%] bg-neutral-900 rounded" />
          <div className="h-4 w-[80%] bg-neutral-900 rounded" />
        </div>

        {/* Content Tabs & Lists Area Placeholder */}
        <div
          className={
            isStandalone
              ? "px-4 sm:px-6 lg:px-14 py-8 bg-theme_10 flex flex-col gap-6"
              : "px-6 py-6 bg-theme_10 flex flex-col gap-6"
          }
        >
          {/* Tabs bar */}
          <div className="flex gap-6 border-b border-neutral-900 pb-0.5">
            <div className="h-5 w-20 bg-neutral-900 rounded mb-2" />
            <div className="h-5 w-20 bg-neutral-900 rounded mb-2" />
          </div>

          {/* Shimmer list of rows */}
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-4 p-3 bg-neutral-900/10 border border-neutral-900/30 rounded-xl">
                {/* Image thumb */}
                <div className="w-full sm:w-[190px] aspect-video rounded-lg bg-neutral-900 shrink-0" />
                {/* Title & Info */}
                <div className="flex flex-col flex-1 justify-center gap-3">
                  <div className="h-4 w-[60%] bg-neutral-900 rounded" />
                  <div className="h-3 w-full bg-neutral-900 rounded" />
                  <div className="h-3 w-[85%] bg-neutral-900 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 404 guard ──────────────────────────────────────────────────────────────
  // Only render NotFound when we KNOW the query has genuinely failed:
  //   - app is ready (bootstrap + session done)
  //   - query is NOT in progress
  //   - the error is NOT a transient 403 socket handshake delay
  //   - there is truly no asset data
  const queryFinishedWithNoData =
    isAppReady &&
    !!sessionId &&
    !assetLoading &&
    !queryNotStarted &&
    fetchStatus !== 'fetching' &&
    !isTransient403;

  if (queryFinishedWithNoData && (isError || !asset)) {
    return <NotFound />;
  }

  // While the query is still in any loading state, keep showing the skeleton.
  // This catches the gap between !isLoading becoming false and asset arriving.
  if (!asset) {
    // Should be unreachable if showSkeleton is true — safety net.
    if (showSkeleton) return null; // skeleton already rendered above
    return <NotFound />;
  }

  const isShow = asset.assetType === "SHOW" || asset.seasons?.length > 0;
  const isMovie = !isShow;

  // ── Coming Soon logic ──────────────────────────────────────────────────────
  // An asset is "Coming Soon" when both conditions are true:
  //   1. is_upcoming_scheduled === true  (API field mapped as isUpcomingScheduled)
  //   2. asset_tags contains "Coming Soon" (case-insensitive)
  const isComingSoon =
    asset.isUpcomingScheduled === true &&
    Array.isArray(asset.asset_tags) &&
    asset.asset_tags.some((tag) => tag.toLowerCase().includes("coming soon"));

  const bgPosterUrl = activePreview?.poster || asset.poster?.url || asset.landscape?.url || "";

  return (
    <div
      id="asset-detail-container"
      ref={topRef}
      className={
        isStandalone
          ? "relative w-full min-h-screen bg-black text-theme_1 overflow-x-hidden"
          : "relative w-full max-w-[850px] mx-auto bg-theme_10 text-theme_1 rounded-[12px] overflow-hidden"
      }
    >
      {/* Absolute Close Button */}
      {!isStandalone && (
        <FocusableCloseButton onClose={onClose} />
      )}

      {/* Top Banner Section */}
      <div
        className={
          isStandalone
            ? "relative w-full h-[400px] sm:h-[550px] md:h-[650px] lg:h-[75vh] overflow-hidden group"
            : "relative w-full h-[280px] sm:h-[450px] overflow-hidden group"
        }
      >
        {/* Background preview video playing after static poster delay */}
        {videoStarted && activePreview?.videoUrl && !videoError ? (
          <video
            ref={videoRef}
            src={shouldPassSrcNatively ? activePreview.videoUrl : undefined}
            muted={isMuted}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ${videoReady ? "opacity-100" : "opacity-0"
              }`}
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoError(true)}
          />
        ) : null}

        {/* Background Image (Static Poster) shown initially or as fallback */}
        {(!videoStarted || !videoReady || videoError) && (
          bgPosterUrl ? (
            <JOJOCommonImage
              src={bgPosterUrl}
              alt={asset.title}
              fill
              className="object-cover object-top transition-opacity duration-1000"
              wrapperClassName="w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-neutral-900" />
          )
        )}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, var(--theme_10, #191919) 0%, var(--theme_10_50, rgba(25, 25, 25, 0.5)) 40%, transparent 100%)" }}
        />
        <div
          className="absolute inset-x-0 -bottom-px h-[50%] z-10 pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--theme_10, #191919) 0%, var(--theme_10_50, rgba(25, 25, 25, 0.5)) 20%, transparent 100%)" }}
        />
        <div
          className={
            isStandalone
              ? "absolute bottom-2 left-4 sm:left-6 lg:left-14 z-20 max-w-[70%]"
              : "absolute bottom-6 left-6 z-20 max-w-[70%]"
          }
        >
          <div
            className="pointer-events-none transition-transform duration-700 ease-out origin-bottom-left"
            style={{
              transform: isTitleShrunk ? "scale(0.60)" : "scale(1)",
            }}
          >
            {/* Logo image or Title text */}
            {asset.titleImage ? (
              <>
                <h1 className="sr-only">{asset.title}</h1>
                <div className={
                  isStandalone
                    ? "relative w-[180px] h-[60px] sm:w-[320px] sm:h-[110px] lg:w-[450px] lg:h-[150px]"
                    : "relative w-[150px] h-[50px] sm:w-[260px] sm:h-[90px]"
                }>
                  <JOJOCommonImage
                    src={asset.titleImage}
                    alt={asset.title}
                    fill
                    contentMode="contain"
                    position="left"
                    optimizeRequestURL={false}
                    wrapperClassName="w-full h-full"
                  />
                </div>
              </>
            ) : (
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black drop-shadow-lg tracking-tight">
                {asset.title}
              </h1>
            )}
          </div>
        </div>

        {/* Slider Controls / Indicators - bottom right of image */}
        {previewsList?.length > 1 && (
          <div
            className={
              isStandalone
                ? "absolute bottom-6 right-4 sm:right-6 lg:right-14 z-30 flex items-center gap-2"
                : "absolute bottom-6 right-6 z-30 flex items-center gap-2"
            }
          >
            {/* Bar indicators — only width animates, height is always h-1 */}
            <div className="flex items-center gap-1.5">
              {previewsList.map((_, idx) => (
                <FocusablePreviewDot
                  key={idx}
                  idx={idx}
                  onClick={() => handleSlideChange(idx)}
                  assetId={assetId}
                >
                  <span
                    style={{
                      display: "block",
                      height: "4px",
                      borderRadius: "9999px",
                      width: currentSlideIndex === idx ? "28px" : "16px",
                      backgroundColor: "rgba(255, 255, 255, 0.35)",
                      transition: "width 300ms ease",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        backgroundColor: "#ffffff",
                        width: currentSlideIndex === idx
                          ? `${slideProgress}%`
                          : idx < currentSlideIndex
                            ? "100%"
                            : "0%",
                        transition: currentSlideIndex === idx ? "none" : "width 300ms ease",
                        boxShadow: "0 0 4px rgba(255,255,255,0.8)",
                      }}
                    />
                  </span>
                </FocusablePreviewDot>
              ))}
            </div>
            {/* Next arrow */}
            <FocusablePreviewNextButton onClick={handleNextSlide} />
          </div>
        )}
      </div>

      <div className={isStandalone ? "relative z-20 -mt-px px-4 sm:px-6 lg:px-14 pt-4 pb-8 bg-theme_10 flex flex-col gap-4 w-full" : "relative z-20 -mt-px px-6 pt-3 pb-6 bg-theme_10 flex flex-col gap-5"}>
        {asset?.assetCategoryCode === ASSET_CATEGORY_CODE.TVOD && (
          <div className="flex items-center gap-2 px-1 overflow-hidden">
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
        <div className="flex items-center justify-start gap-4 sm:gap-6 w-full">
          {/* Primary Play/Rent CTA — replaced with plain Coming Soon text when applicable */}
          {isComingSoon ? (
            <span className="text-sm sm:text-base font-bold text-white select-none">
              Coming Soon
            </span>
          ) : isAuthLoading ? (
            <div className="h-9 sm:h-11 w-32 sm:w-40 bg-neutral-800 rounded-full animate-pulse shrink-0" />
          ) : (
            <div ref={watchNowRef as any} className={`rounded-full ${watchNowFocused ? 'ring-4 ring-white shadow-xl scale-105 z-50 transition-all' : ''}`}>
              <JOJOCustomButton
                state={JOJOButton.State.ACTIVE}
                size={JOJOButton.Size.M}
                appearance={buttonConfig.appearance}
                disabled={buttonConfig.disabled}
                leftIcon={buttonConfig.showIcon ? <Play className="w-4 h-4 sm:w-5" fill="currentColor" /> : undefined}
                onClick={handleWatchNow}
                className="text-theme_1 !text-sm sm:!text-base sm:body-sm-medium font-bold gap-1.5 sm:gap-2 h-9 sm:h-11 px-4 sm:px-8 transition-all !rounded-full shrink-0"
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
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthLoading ? (
              <>
                <div className="h-9 w-9 sm:h-11 sm:w-11 bg-neutral-800 rounded-full animate-pulse shrink-0" />
                <div className="h-9 w-9 sm:h-11 sm:w-11 bg-neutral-800 rounded-full animate-pulse shrink-0" />
                <div className="h-9 w-9 sm:h-11 sm:w-11 bg-neutral-800 rounded-full animate-pulse shrink-0" />
                {activePreview?.videoUrl && videoStarted && videoReady && !videoError && (
                  <div className="h-9 w-9 sm:h-11 sm:w-11 bg-neutral-800 rounded-full animate-pulse shrink-0" />
                )}
              </>
            ) : (
              <>
                {/* Add to list */}
                <button
                  ref={watchlistRef as any}
                  onClick={() => {
                if (isGuest) {
                  useGuestPopupStore.getState().openGuestPopup();
                  return;
                }
                const targetId = Number(asset?.assetId ?? assetId);
                toggleWatchlist(targetId, !inWatchlist, asset ? {
                  title: asset.title,
                  asset_title: asset.title,
                  poster: asset.poster,
                  landscape: asset.landscape,
                  posterImage: asset.poster?.url,
                  landscapeImage: asset.landscape?.url,
                  image: asset.landscape?.url || asset.poster?.url || "",
                  assetTypeCode: asset.assetTypeCode,
                  description: asset.description,
                } : undefined);
              }}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${watchlistFocused ? "bg-white text-black border-white scale-110 shadow-lg ring-4 ring-white/40 z-50" : "bg-white/10 text-white/80 border-white/15 hover:bg-white/20 hover:text-white"}`}
              title={t("add_to_watchlist")}
            >
              {inWatchlist ? <Check size={20} className="text-theme_13_samecolour" /> : <Plus size={20} />}
            </button>

            {/* Share */}
            <div className="relative shrink-0">
              <button
                ref={shareRef as any}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    const shareUrl = deepLinkManager.generateEncryptedShareUrl(
                      String(asset?.assetId ?? assetId),
                      String(asset?.assetTypeCode || "MOVIE"),
                      asset?.title || "",
                      storeUser?.id || "",
                      window.location.origin
                    );
                    const clipText = shareUrl || window.location.href;
                    navigator.clipboard.writeText(clipText).then(() => {
                      setShareSuccess(true);
                      setTimeout(() => setShareSuccess(false), 2000);
                      analyticsService.track(EVENT_NAMES.CONTENT_SHARED, {
                        asset_id: String(asset?.assetId ?? assetId),
                        asset_title: asset?.title ?? '',
                        content_type: asset?.assetType === 'SHOW' ? 'show' : 'movie',
                        share_method: 'clipboard',
                      });
                    });
                  }
                }}
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer ${shareFocused ? "bg-white text-black border-white scale-110 shadow-lg ring-4 ring-white/40 z-50" : "bg-white/10 text-white/80 border-white/15 hover:bg-white/20 hover:text-white"}`}
                title={t("share")}
              >
                <Share2 size={20} />
              </button>
              {shareSuccess && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-[10px] text-theme_13_samecolour font-bold whitespace-nowrap rounded shadow-lg animate-fadeIn">
                  Link Copied!
                </div>
              )}
            </div>

            {/* Like */}
            <button
              ref={likeRef as any}
              onClick={() => {
                if (isGuest) {
                  useGuestPopupStore.getState().openGuestPopup();
                  return;
                }
                const nextLiked = !isLiked;
                setIsLiked(nextLiked);
                analyticsService.track(nextLiked ? EVENT_NAMES.CONTENT_LIKED : EVENT_NAMES.CONTENT_DISLIKED, {
                  asset_id: String(asset?.assetId ?? assetId),
                  asset_title: asset?.title ?? '',
                  content_type: asset?.assetType === 'SHOW' ? 'show' : 'movie',
                });
              }}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${likeFocused ? "bg-white text-black border-white scale-110 shadow-lg ring-4 ring-white/40 z-50" : "bg-white/10 text-white/80 border-white/15 hover:bg-white/20 hover:text-white"}`}
              title={t("like")}
            >
              <ThumbsUp size={20} fill={isLiked ? "currentColor" : "none"} />
            </button>

            {/* Mute/Unmute */}
            {activePreview?.videoUrl && videoStarted && videoReady && !videoError && (
              <button
                ref={muteRef as any}
                onClick={() => {
                  toggleMuted();
                  analyticsService.track(EVENT_NAMES.PLAYER_MUTE_TOGGLED, {
                    asset_id: String(asset?.assetId ?? assetId),
                    asset_title: asset?.title ?? '',
                    is_muted: !isMuted,
                    source: 'content_detail_card',
                  });
                }}
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${muteFocused ? "bg-white text-black border-white scale-110 shadow-lg ring-4 ring-white/40 z-50" : "bg-white/10 text-white/80 border-white/15 hover:bg-white/20 hover:text-white"}`}
                title={isMuted ? t("unmute") : t("mute")}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
              </>
            )}
          </div>
        </div>

        {/* Metadata Details Block */}
        <div className="flex flex-col items-start gap-3 mt-1">
          <div className="flex items-center gap-2 mt-1 flex-wrap">

            {/* Show the "New" tag only when this is NOT a Coming Soon asset */}
            {!isComingSoon && asset.asset_tags_badgeText && asset.asset_tags_badgeText.toLowerCase().includes("new") && (
              <span className="px-3 py-1 rounded-md bg-theme_9 text-theme_1 text-xs font-bold uppercase">
                {asset.asset_tags_badgeText}
              </span>
            )}
            {asset.isInTop10 && (
              <span className="px-3 py-1 rounded-md bg-theme_9 text-theme_1 text-xs font-bold uppercase">
                {t("top", { rank: asset?.numberintop10 || 10 })}
              </span>
            )}
            {asset.certification && (
              <span className="px-3 py-1 rounded-md bg-theme_9 text-theme_5 text-xs font-medium uppercase">
                {asset.certification}
              </span>
            )}
            {(isShow ? (asset.seasons?.length || 0) > 0 : !!asset.durationSeconds) && (
              <span className="px-3 py-1 rounded-md bg-theme_9 text-theme_5 text-xs font-medium uppercase">
                {isShow
                  ? `${asset.seasons?.length || 1} Season${(asset.seasons?.length || 1) > 1 ? "s" : ""}`
                  : asset.durationSeconds
                    ? `${Math.floor(asset.durationSeconds / 3600) > 0 ? `${Math.floor(asset.durationSeconds / 3600)}h ` : ""}${Math.floor((asset.durationSeconds % 3600) / 60)}m`
                    : ""}
              </span>
            )}
          </div>

          {asset.genres && asset.genres.length > 0 && (
            <div className="flex flex-wrap items-center text-sm font-bold text-theme_1 mt-1">
              {asset.genres.map((genre: string, i: number) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-2 text-neutral-500 font-normal">•</span>}
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 text-sm sm:text-base leading-relaxed text-theme_4">
            {asset.description ? (
              <div
                className="[&>p]:mb-3 [&>p:last-child]:mb-0 [&_*]:!text-theme_4"
                dangerouslySetInnerHTML={{ __html: asset.description }}
              />
            ) : (
              <p>{t("no_description_available")}</p>
            )}
          </div>
        </div>
      </div>

      {
        isShow && asset.seasons && asset.seasons.length > 0 && (
          <div className={isStandalone ? "bg-theme_10 px-4 sm:px-6 lg:px-14 pt-4 pb-2 w-full" : "bg-theme_10 px-6 pt-4 pb-2 w-full"}>
            <div className="flex flex-col gap-6">
              {/* Tabs Selector Bar */}
              <div className="flex items-center gap-6 pb-0.5">
                <FocusableTabButton
                  label={t("episodes")}
                  isActive={activeTab === "episodes"}
                  onClick={() => setActiveTab("episodes")}
                  focusKeyPrefix="tab-episodes"
                  assetId={assetId}
                  firstEpId={displayedEpisodes?.[0]?.assetId}
                  firstCastId={castList?.[0]?.id}
                  firstRelatedId={displayRelated?.[0] ? resolveId(displayRelated[0]) : null}
                />
                {asset.trailers && asset.trailers.length > 0 && (
                  <FocusableTabButton
                    label={t("trailers")}
                    isActive={activeTab === "trailers"}
                    onClick={() => setActiveTab("trailers")}
                    focusKeyPrefix="tab-trailers"
                    assetId={assetId}
                    firstEpId={displayedEpisodes?.[0]?.assetId}
                    firstCastId={castList?.[0]?.id}
                    firstRelatedId={displayRelated?.[0] ? resolveId(displayRelated[0]) : null}
                  />
                )}

                {/* Season Dropdown Selector - positioned on the right */}
                {activeTab === "episodes" && seasonsOption.length > 0 && (
                  <div className="relative ml-auto">
                    {seasonsOption.length > 1 ? (
                      <>
                        <FocusableSeasonButton
                          label={t("season", { number: selectedSeasonIndex + 1 })}
                          isOpen={seasonDropdownOpen}
                          onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                        />

                        {seasonDropdownOpen && (
                          <div className="absolute right-0 mt-2 z-50 min-w-[130px] rounded bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden py-1">
                            {seasonsOption.map((s, idx) => (
                              <FocusableSeasonDropdownItem
                                key={s.assetId || idx}
                                idx={idx}
                                isSelected={idx === selectedSeasonIndex}
                                label={t("season", { number: idx + 1 })}
                                onClick={() => {
                                  handleSeasonChange(idx);
                                  setSeasonDropdownOpen(false);
                                  // Restore focus to the main dropdown button asynchronously after DOM unmount
                                  setTimeout(() => setFocus("season-dropdown-btn"), 60);
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-1.5 bg-neutral-900 text-xs sm:text-sm font-semibold text-neutral-300 rounded border border-neutral-800 select-none">
                        {t("season", { number: 1 })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activeTab === "episodes" ? (
                <div className="flex flex-col gap-4 pb-4">
                  {activeSeason && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400 font-semibold mb-2">
                      <span className="uppercase text-theme_13_samecolour">{t("season", { number: selectedSeasonIndex + 1 })}:</span>
                      {asset.certification && <span>{asset.certification}</span>}
                      <span>•</span>
                      <span>{t("gujarati")}</span>
                      {asset.classifications && asset.classifications.length > 0 && (
                        <span className="text-neutral-400 text-[11px] sm:text-xs font-normal">
                          ({asset.classifications.join(", ")})
                        </span>
                      )}
                    </div>
                  )}

                  {displayedEpisodes?.length > 0 ? (
                    <div className="flex flex-col gap-4 sm:gap-6">
                      {displayedEpisodes.map((ep, index) => {
                        return (
                          <FocusableEpisodeItem
                            key={ep.assetId}
                            ep={ep}
                            index={index}
                            episodes={displayedEpisodes}
                            asset={asset}
                            selectedSeasonIndex={selectedSeasonIndex}
                            t={t}
                            onWatch={() => handleWatch(ep.assetId)}
                          />
                        );
                      })}

                      {/* Infinite Load More button */}
                      {hasMore && (
                        <FocusableLoadMoreButton
                          onClick={(e: any) => {
                            e.stopPropagation();
                            loadMoreEpisodes();
                          }}
                          disabled={episodesLoading}
                          label={episodesLoading ? null : t("load_more_episodes")}
                          lastEpisodeId={displayedEpisodes[displayedEpisodes.length - 1]?.assetId}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-neutral-500 text-sm">
                      {t("no_episodes_found")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-500 text-sm border border-neutral-900 rounded-xl mb-4">
                  {t("no_trailers_found")}
                </div>
              )}
            </div>
          </div>
        )
      }

      <div
        className={
          isStandalone
            ? "bg-gradient-to-b from-theme_10 to-black px-4 sm:px-6 lg:px-14 pt-8 pb-24 flex flex-col gap-8 w-full"
            : "bg-theme_10 px-6 py-8 flex flex-col gap-8"
        }
      >
        {castList.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-bold text-theme_1 mb-4 pb-2">
              {t("cast_crew")}
            </h3>
            <div className="relative group/cast-rail w-full">
              {canCastScrollLeft && (
                <button
                  onClick={() => {
                    if (castListRef.current) {
                      castListRef.current.scrollBy({ left: -280, behavior: "smooth" });
                    }
                  }}
                  className="absolute left-2 top-[32px] sm:top-[38px] -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-theme_1 flex items-center justify-center border border-theme_1/10 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/cast-rail:opacity-100 shadow-md"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {canCastScrollRight && (
                <button
                  onClick={() => {
                    if (castListRef.current) {
                      castListRef.current.scrollBy({ left: 280, behavior: "smooth" });
                    }
                  }}
                  className="absolute right-2 top-[32px] sm:top-[38px] -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-theme_1 flex items-center justify-center border border-theme_1/10 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/cast-rail:opacity-100 shadow-md"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              <div
                ref={castListRef}
                onScroll={checkCastScroll}
                className={`flex gap-4 sm:gap-6 overflow-x-auto pt-4 pb-6 scrollbar-none ${isCastDragging ? "scroll-auto cursor-grabbing select-none" : "scroll-smooth cursor-grab"
                  }`}
              >
                {castList.map((castItem, idx) => (
                    <FocusableCastItem
                      key={idx}
                      castItem={castItem}
                      idx={idx}
                      asset={asset}
                      assetId={assetId}
                      setSelectedProfessionalId={setSelectedProfessionalId}
                      firstRelatedId={displayRelated?.[0] ? resolveId(displayRelated[0]) : null}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Related Content Grid */}
        {(railsLoading || displayRelated.length > 0) && (
          <div>
            <h3 className="text-base sm:text-lg font-bold text-theme_1 mb-4 pb-2">
              {t("new_arrivals")}
            </h3>
            <div className="relative group/related-rail w-full">
              {/* Left Scroll Button */}
              {canScrollLeft && (
                <button
                  onClick={() => {
                    if (relatedListRef.current) {
                      relatedListRef.current.scrollBy({ left: -320, behavior: "smooth" });
                    }
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-theme_1 flex items-center justify-center border border-theme_1/10 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/related-rail:opacity-100 shadow-md"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Right Scroll Button */}
              {canScrollRight && (
                <button
                  onClick={() => {
                    if (relatedListRef.current) {
                      relatedListRef.current.scrollBy({ left: 320, behavior: "smooth" });
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-theme_1 flex items-center justify-center border border-theme_1/10 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/related-rail:opacity-100 shadow-md"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              <div
                ref={relatedListRef}
                className={`flex gap-4 overflow-x-auto pt-4 pb-6 px-2 scrollbar-none ${isDragging ? "scroll-auto cursor-grabbing select-none" : "scroll-smooth cursor-grab"
                  }`}
                onScroll={checkScroll}
              >
                {railsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="relative w-[130px] sm:w-[160px] aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900 animate-pulse shrink-0" />
                  ))
                ) : (
                  displayRelated.map((item: any, idx: number) => {
                    const isFallback = !item.asset && !item.id && !item.asset_id && item.image;
                    const title = isFallback ? item.title : resolveTitle(item);
                    const img = isFallback ? item.image : resolveImage(item?.asset || item);
                    const id = isFallback ? "" : resolveId(item);
                    const assetType = isFallback ? "" : (item?.asset?.asset_type || item?.asset_type || item?.assetTypeCode);

                    return (
                      <FocusableRelatedItem
                        key={id || idx}
                        item={item}
                        idx={idx}
                        id={id}
                        title={title}
                        img={img}
                        assetType={assetType}
                        isFallback={isFallback}
                        isStandalone={isStandalone}
                        router={router}
                        openAssetDetail={openAssetDetail}
                        assetId={assetId}
                        firstCastId={castList?.[0]?.id}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {
        gateResult && gateResult.gate !== "none" && (
          <GatePopup
            gate={gateResult.gate}
            message={gateResult.message}
            onClose={clearGate}
            onAction={() => {
              if (gateResult.gate === "tvod") {
                const tvodPlan = transformTVODToPaymentPlan(pricing, asset);
                if (tvodPlan) {
                  try {
                    analyticsService.track(EVENT_NAMES.TVOD_PURCHASE_STARTED, {
                      product_id: tvodPlan.sProductId || `tvod_${asset?.assetId}`,
                      price: tvodPlan.pricing?.nPrice,
                      currency: tvodPlan.pricing?.sCurrency ?? 'INR',
                      plan_name: tvodPlan.oProductTranslation?.sName ?? asset?.title,
                      content_name: asset?.title ?? '',
                      asset_id: String(asset?.assetId ?? assetId),
                    });
                  } catch (e) { }

                  sessionStorage.setItem("selected_payment_plan", JSON.stringify(tvodPlan));
                  router.push(`/payment?assetId=${asset?.assetId ?? assetId}`);
                }
              }
            }}
          />
        )
      }

      <AnimatePresence>
        {selectedProfessionalId && (
          <CastDetailsPopup
            professionalId={selectedProfessionalId}
            onClose={() => setSelectedProfessionalId(null)}
            openAssetDetail={openAssetDetail}
            isStandalone={isStandalone}
            router={router}
          />
        )}
      </AnimatePresence>
    </div >
  );
}

// ── Subcomponents for Focusable Items ────────────────────────────────────────

function FocusableEpisodeItem({ ep, index, episodes, asset, selectedSeasonIndex, t, onWatch }: any) {
  const { ref, focused } = useFocusable({
    focusKey: `episode-${ep.assetId}`,
    onEnterPress: onWatch,
    onArrowPress: (direction) => {
      if (direction === "up") {
        if (index > 0) {
          const prevEp = episodes[index - 1];
          setFocus(`episode-${prevEp.assetId}`);
          return false;
        } else {
          setFocus("tab-episodes");
          return false;
        }
      }
      if (direction === "down") {
        if (index < episodes?.length - 1) {
          const nextEp = episodes[index + 1];
          setFocus(`episode-${nextEp.assetId}`);
          return false;
        }
      }
      return true;
    },
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  const epPosterUrl = ep.poster?.url || asset.landscape?.url || asset.poster?.url || "";

  return (
    <div
      ref={ref as any}
      onClick={onWatch}
      className={`group flex flex-col sm:flex-row gap-4 p-3 bg-neutral-900/20 hover:bg-neutral-900/60 border rounded-xl cursor-pointer transition-all duration-300 ${focused ? "border-white ring-2 ring-white/50 bg-neutral-900/80 scale-[1.02]" : "border-transparent hover:border-neutral-800/40"}`}
    >
      <div className="relative w-full sm:w-[190px] aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-900">
        {epPosterUrl ? (
          <JOJOCommonImage
            src={epPosterUrl}
            alt={ep.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            wrapperClassName="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-neutral-800" />
        )}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <div className="w-10 h-10 rounded-full bg-theme_13_samecolour/90 text-theme_1 flex items-center justify-center">
            <Play size={18} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 justify-center">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className={`text-sm sm:text-base font-bold transition-colors line-clamp-1 ${focused ? "text-theme_13_samecolour" : "text-theme_1 group-hover:text-theme_13_samecolour"}`}>
            S{selectedSeasonIndex + 1} EP{ep.episodeNumber || index + 1} {ep.title}
          </h4>
          {ep.durationSeconds && (
            <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded-full shrink-0">
              {Math.round(ep.durationSeconds / 60)} min
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed line-clamp-3">
          {stripHtml(ep.description) || t("no_description_episode")}
        </p>
      </div>
    </div>
  );
}

function FocusableCastItem({ castItem, idx, asset, assetId, setSelectedProfessionalId, firstRelatedId }: any) {
  const cast = castItem as any;
  const avatarUrl = cast.image || cast.avatar || "";

  const handleCastClick = () => {
    if (cast.id) {
      setSelectedProfessionalId(String(cast.id));
      analyticsService.track(EVENT_NAMES.ARTIST_CLICKED, {
        artist_id: String(cast.id),
        artist_name: cast.name ?? '',
        artist_role: cast.role ?? '',
        asset_id: String(asset?.assetId ?? assetId),
        asset_title: asset?.title ?? '',
      });
    }
  };

  const { ref, focused } = useFocusable({
    focusKey: `cast-${cast.id || idx}`,
    onEnterPress: handleCastClick,
    onArrowPress: (direction) => {
      if (direction === "up") {
        setFocus(`asset-watch-now-${assetId}`);
        return false;
      }
      if (direction === "down" && firstRelatedId) {
        setFocus(`related-item-${firstRelatedId}`);
        return false;
      }
      return true;
    }
  });

  return (
    <div
      ref={ref as any}
      onClick={handleCastClick}
      className={`flex flex-col items-center shrink-0 w-[80px] sm:w-[96px] text-center cursor-pointer group transition-transform ${focused ? "scale-110" : ""}`}
    >
      {/* Circle Avatar wrapper */}
      <div className={`w-[64px] h-[64px] sm:w-[76px] sm:h-[76px] rounded-full overflow-hidden mb-2 flex items-center justify-center bg-neutral-900 shrink-0 transition-all ${focused ? "ring-[3px] ring-white ring-offset-[4px] ring-offset-[#191919] shadow-xl" : ""}`}>
        {avatarUrl ? (
          <JOJOCommonImage
            src={avatarUrl}
            alt={cast.name}
            fill
            className="object-cover"
            wrapperClassName="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-400 font-bold text-lg select-none">
            {cast.name ? cast.name.charAt(0) : "?"}
          </div>
        )}
      </div>
      {/* Name */}
      <span className={`text-[11px] sm:text-xs font-semibold line-clamp-1 leading-tight w-full transition-colors ${focused ? "text-theme_13_samecolour" : "text-neutral-300 group-hover:text-theme_13_samecolour"}`}>
        {cast.name}
      </span>
      {/* Role */}
      <span className="text-[10px] sm:text-[11px] text-neutral-500 line-clamp-1 leading-tight w-full">
        {cast.role}
      </span>
    </div>
  );
}

function FocusableCloseButton({ onClose }: { onClose?: () => void }) {
  const { ref, focused } = useFocusable({
    focusKey: 'asset-close-btn',
    onEnterPress: () => onClose?.(),
  });
  return (
    <button
      ref={ref as any}
      onClick={onClose}
      className={`absolute top-4 right-4 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 transition-colors border border-theme_1/10 cursor-pointer outline-none ${focused ? "ring-2 ring-white scale-110" : ""}`}
      aria-label="Close details"
    >
      <X size={20} className="text-theme_1/80" />
    </button>
  );
}

function FocusablePreviewDot({ idx, onClick, assetId, children }: any) {
  const { ref, focused } = useFocusable({
    focusKey: `preview-dot-${idx}`,
    onEnterPress: onClick,
    onArrowPress: (direction: string) => {
      if (direction === 'down') {
        setFocus(`asset-watch-now-${assetId}`);
        return false;
      }
      return true;
    },
  });
  return (
    <button
      ref={ref as any}
      onClick={onClick}
      aria-label={`Go to preview ${idx + 1}`}
      className={`cursor-pointer flex items-center justify-center outline-none ${focused ? "ring-2 ring-white rounded-full scale-125" : ""}`}
      style={{ background: "none", border: "none", padding: 0 }}
    >
      {children}
    </button>
  );
}

function FocusablePreviewNextButton({ onClick }: { onClick: () => void }) {
  const { ref, focused } = useFocusable({
    focusKey: 'preview-next-btn',
    onEnterPress: onClick,
  });
  return (
    <button
      ref={ref as any}
      onClick={onClick}
      className={`text-theme_1/80 hover:text-theme_1 transition-colors flex items-center justify-center cursor-pointer active:scale-90 outline-none ${focused ? "ring-2 ring-white rounded-full scale-110" : ""}`}
      aria-label="Next slide"
    >
      <ChevronRight size={30} />
    </button>
  );
}

function FocusableTabButton({ label, isActive, onClick, focusKeyPrefix, assetId, firstEpId, firstCastId, firstRelatedId }: any) {
  const { ref, focused } = useFocusable({
    focusKey: focusKeyPrefix,
    onEnterPress: onClick,
    onArrowPress: (direction) => {
      if (direction === "up" && assetId) {
        setFocus(`asset-watch-now-${assetId}`);
        return false;
      }
      if (direction === "down") {
        if (firstEpId) {
          setFocus(`episode-${firstEpId}`);
          return false;
        } else if (firstCastId) {
          setFocus(`cast-${firstCastId}`);
          return false;
        } else if (firstRelatedId) {
          setFocus(`related-item-${firstRelatedId}`);
          return false;
        }
      }
      return true;
    },
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  return (
    <button
      ref={ref as any}
      onClick={onClick}
      className={`pb-3 text-sm sm:text-base font-bold transition-all relative outline-none ${isActive
        ? "text-theme_13_samecolour border-b-2 border-theme_13_samecolour"
        : "text-neutral-400 hover:text-theme_1"
        } ${focused ? "ring-2 ring-white/50 rounded scale-105 px-2 bg-neutral-800" : ""}`}
    >
      {label}
    </button>
  );
}

function FocusableSeasonButton({ label, isOpen, onClick }: any) {
  const { ref, focused } = useFocusable({
    focusKey: "season-dropdown-btn",
    onEnterPress: onClick,
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  return (
    <button
      ref={ref as any}
      onClick={onClick}
      className={`px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm font-semibold rounded flex items-center gap-2 border transition-all cursor-pointer outline-none ${focused ? "ring-2 ring-white border-white bg-neutral-800 scale-105" : "border-neutral-800"}`}
    >
      {label}
      <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
    </button>
  );
}

function FocusableSeasonDropdownItem({ idx, isSelected, label, onClick }: any) {
  const { ref, focused } = useFocusable({
    focusKey: `season-dropdown-item-${idx}`,
    onEnterPress: onClick,
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
  
  useEffect(() => {
    // Auto focus the selected item when dropdown opens
    if (isSelected) {
      setTimeout(() => setFocus(`season-dropdown-item-${idx}`), 50);
    }
  }, [isSelected, idx]);

  return (
    <button
      ref={ref as any}
      onClick={onClick}
      className={`w-full px-4 py-2 text-left text-xs sm:text-sm hover:bg-neutral-800 transition-colors cursor-pointer outline-none ${isSelected ? "text-theme_13_samecolour font-bold" : "text-neutral-300"} ${focused ? "bg-neutral-700 ring-2 ring-inset ring-white" : ""}`}
    >
      {label}
    </button>
  );
}

function FocusableLoadMoreButton({ onClick, disabled, label, lastEpisodeId }: any) {
  const { ref, focused } = useFocusable({
    focusKey: "load-more-episodes-btn",
    onEnterPress: () => {
      if (!disabled) onClick({ stopPropagation: () => {} });
    },
    onArrowPress: (direction) => {
      if (direction === "up" && lastEpisodeId) {
        setFocus(`episode-${lastEpisodeId}`);
        return false;
      }
      return true;
    },
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  useEffect(() => {
    return () => {
      if (lastEpisodeId) {
        setTimeout(() => setFocus(`episode-${lastEpisodeId}`), 60);
      }
    };
  }, [lastEpisodeId]);
  return (
    <button
      ref={ref as any}
      onClick={onClick}
      disabled={disabled}
      className={`mt-2 w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-xs sm:text-sm font-bold text-neutral-300 hover:text-theme_1 rounded-lg border flex items-center justify-center gap-2 transition-all outline-none ${focused ? "ring-2 ring-white border-white bg-neutral-800 scale-[1.01]" : "border-neutral-850"}`}
    >
      {!label ? <Loader size="sm" /> : label}
    </button>
  );
}

function FocusableRelatedItem({ item, idx, id, title, img, assetType, isFallback, isStandalone, router, openAssetDetail, assetId, firstCastId }: any) {
  const handleClick = () => {
    if (isFallback || !id) return;
    if (isStandalone) {
      const typeSlug = getAssetTypeSlug(assetType);
      const titleSlug = slugify(title);
      const targetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${id}` : `/${typeSlug}/${id}`;
      router.push(targetUrl);
    } else {
      openAssetDetail(id, assetType || "movies", title);
    }
  };

  const { ref, focused } = useFocusable({
    focusKey: `related-item-${id || idx}`,
    onEnterPress: handleClick,
    onArrowPress: (direction) => {
      if (direction === "up") {
        if (firstCastId) {
          setFocus(`cast-${firstCastId}`);
          return false;
        } else if (assetId) {
          setFocus(`asset-watch-now-${assetId}`);
          return false;
        }
      }
      return true;
    },
    onFocus: () => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  return (
    <div
      ref={ref as any}
      onClick={handleClick}
      className={`relative w-[130px] sm:w-[160px] aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer bg-neutral-900 transition-all duration-300 shrink-0 ${focused ? "ring-[3px] ring-white ring-offset-[3px] ring-offset-[#191919] scale-105 shadow-2xl" : "hover:scale-105"}`}
    >
      {img ? (
        <JOJOCommonImage
          src={img}
          alt={title}
          fill
          className="object-cover"
          wrapperClassName="w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-neutral-500 bg-neutral-900">
          {title}
        </div>
      )}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent transition-opacity duration-300 flex items-end p-3 ${focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <span className={`text-xs font-semibold truncate w-full ${focused ? "text-theme_13_samecolour" : "text-white"}`}>{title}</span>
      </div>
    </div>
  );
}