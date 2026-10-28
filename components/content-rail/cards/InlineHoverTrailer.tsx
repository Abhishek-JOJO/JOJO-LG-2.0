"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { isHlsUrl, VIDEO_CONSTANTS } from "@/lib/constants/video";
import { usePlayerStore } from "@/store/usePlayerStore";
import { TitleLogoImage } from "@/components/ui/TitleLogoImage";
import { ContentRailItem } from "../config/contentRail.types";
import { isTizen } from "@/src/platform/detectPlatform";
import {
  isTizenPreviewAvailable,
  startTizenPreview,
  type TizenPreviewHandle,
} from "@/src/platform/tizen/tizenPreviewPlayer";

// <video> (webOS/browser): wait this long on a card before allocating a
// hardware decoder for its preview.
const VIDEO_PREVIEW_DWELL_MS = 1200;
// Tizen splits that wait: AVPlay starts preparing (manifest + first segments,
// most of the start-up time) once the card is clearly settled on — held keys
// repeat every ~120ms — and starts playing at the full dwell. The download
// then overlaps the dwell instead of only starting after it.
const TIZEN_PREPARE_AFTER_MS = 300;
const TIZEN_PLAY_AFTER_MS = 800;

interface InlineHoverTrailerProps {
  item: ContentRailItem;
  isExpanded: boolean;
  /** Pass true when this trailer is mounted inside the spotlight landscape lead card (870px wide) */
  isLandscape?: boolean;
}

export const InlineHoverTrailer = React.memo(function InlineHoverTrailer({ item, isExpanded, isLandscape = false }: InlineHoverTrailerProps) {
  // <video> everywhere except Tizen, where it paints white/late frames on
  // Samsung hardware; Tizen previews through AVPlay (tizenPreviewPlayer).
  const isTizenRuntime = isTizen();
  const videoEnabled = !isTizenRuntime;
  const tizenPreviewEnabled = isTizenRuntime && isTizenPreviewAvailable();
  const previewEnabled = videoEnabled || tizenPreviewEnabled;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const isMuted = usePlayerStore((s) => s.isMuted);

  const previewUrl = useMemo(() => {
    return item?.previewUrl || (item as any)?.preview_url || null;
  }, [item]);

  // The 1.2s gate is granted to a specific item, so it closes in the same
  // render the slot switches items. As a boolean reset by an effect it stayed
  // true for one more render: the first step after resting on a card started
  // (and at once killed) a preview of the next item — a native AVPlay
  // open/close on a single keypress, felt as a hitch while fast scrolling.
  const itemId = item?.id != null ? String(item.id) : null;
  const [loadVideoForId, setLoadVideoForId] = useState<string | null>(null);
  const [playVideoForId, setPlayVideoForId] = useState<string | null>(null);
  const isGrantedFor = (grantedId: string | null) =>
    previewEnabled && isExpanded && !!previewUrl && itemId !== null && grantedId === itemId;
  // <video>: load and play together. Tizen: prepare at shouldLoadVideo, play at shouldPlayVideo.
  const shouldLoadVideo = isGrantedFor(loadVideoForId);
  const shouldPlayVideo = tizenPreviewEnabled ? isGrantedFor(playVideoForId) : shouldLoadVideo;

  useEffect(() => {
    if (!previewEnabled) return;

    setVideoReady(false);
    setVideoError(false);
    setLoadVideoForId(null);
    setPlayVideoForId(null);

    if (!isExpanded || !previewUrl) return;

    if (tizenPreviewEnabled) {
      const prepareTimer = setTimeout(() => setLoadVideoForId(itemId), TIZEN_PREPARE_AFTER_MS);
      const playTimer = setTimeout(() => setPlayVideoForId(itemId), TIZEN_PLAY_AFTER_MS);
      return () => {
        clearTimeout(prepareTimer);
        clearTimeout(playTimer);
      };
    }

    // Debounce before allocating webOS hardware video decoders
    const timer = setTimeout(() => {
      setLoadVideoForId(itemId);
    }, VIDEO_PREVIEW_DWELL_MS);

    return () => clearTimeout(timer);
  }, [previewEnabled, tizenPreviewEnabled, previewUrl, itemId, isExpanded]);

  // Tizen: AVPlay into this overlay's box (the card's 16:9 rect), prepared
  // ahead and held until the play gate below. The card poster fades via
  // data-tizen-video-cover once frames show. AVPlay has no per-stream mute,
  // so a muted user keeps the poster.
  const tizenPreviewRef = useRef<TizenPreviewHandle | null>(null);
  useEffect(() => {
    if (!tizenPreviewEnabled || !shouldLoadVideo || !previewUrl || isMuted) return;
    const target = containerRef.current;
    if (!target) return;
    const preview = startTizenPreview({
      url: previewUrl,
      target,
      autoPlay: false,
      onReady: () => setVideoReady(true),
      onEnded: () => setVideoReady(false),
      onStop: (reason) => {
        setVideoReady(false);
        if (reason === "error") setVideoError(true);
      },
    });
    tizenPreviewRef.current = preview;
    return () => {
      preview.stop();
      tizenPreviewRef.current = null;
      setVideoReady(false);
    };
  }, [tizenPreviewEnabled, shouldLoadVideo, previewUrl, isMuted]);

  // Declared after the effect above so a preview opened in the same commit
  // already exists here.
  useEffect(() => {
    if (tizenPreviewEnabled && shouldPlayVideo) tizenPreviewRef.current?.play();
  }, [tizenPreviewEnabled, shouldPlayVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewUrl || !shouldLoadVideo) return;

    let hlsInstance: any = null;

    const isHls = isHlsUrl(previewUrl);
    const canNativeHls = Boolean(video.canPlayType(VIDEO_CONSTANTS.HLS_MIME_TYPE));
    const isNative = !isHls || canNativeHls;

    if (isHls && !isNative) {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (!videoRef.current) return;
          if (!Hls.isSupported()) {
            setVideoError(true);
            return;
          }

          hlsInstance = new Hls({
            maxBufferLength: 4,
            maxMaxBufferLength: 8,
            enableWorker: true,
          });
          hlsInstance.loadSource(previewUrl);
          hlsInstance.attachMedia(videoRef.current);

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (videoRef.current) {
              videoRef.current.play().then(() => {
                setVideoReady(true);
              }).catch(() => {});
            }
          });

          hlsInstance.on(Hls.Events.ERROR, (_event: any, data: any) => {
            if (data?.fatal) {
              setVideoError(true);
              hlsInstance?.destroy();
              hlsInstance = null;
            }
          });
        })
        .catch(() => {
          setVideoError(true);
        });
    } else {
      video.src = previewUrl;
      video.load();
      video.play().then(() => {
        setVideoReady(true);
      }).catch(() => {});
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
      }
      if (video) {
        video.pause();
        try {
          video.removeAttribute("src");
          video.load();
        } catch {
          // ignore
        }
      }
    };
  }, [shouldLoadVideo, previewUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // The poster stays up (with this loader over it) for the whole time the
  // preview loads, and only fades once real frames are showing (videoReady).
  // Not shown when no preview will start: Tizen keeps the poster for a muted
  // user (AVPlay has no per-stream mute).
  // Tizen counts from the play gate — before it the preview is only warming up
  // in the background, with no reason to show a loader yet.
  const isPreviewLoading =
    shouldPlayVideo && !videoReady && !videoError && !(tizenPreviewEnabled && isMuted);

  const titleText = item?.title ? (
    <h3 className={`text-white font-extrabold line-clamp-1 drop-shadow-lg mb-2 text-left ${
      isLandscape ? "text-3xl" : "text-xl sm:text-2xl"
    }`}>
      {item.title}
    </h3>
  ) : null;

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">

      {/* Video Player - Only mounted when card is active/expanded, debounced, and hidden until first frame is ready */}
      {videoEnabled && shouldLoadVideo && previewUrl && !videoError && (
        <video
          ref={videoRef}
          muted={isMuted}
          loop
          playsInline
          preload="auto"
          onPlaying={() => setVideoReady(true)}
          style={{ display: videoReady ? "block" : "none" }}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            videoReady ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      
      {isPreviewLoading && (
        // Fades in only after 300ms (preview-loader-in), so a preview that
        // starts promptly never flashes a spinner at all.
        <div className="preview-loader-in absolute inset-0 z-30 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="w-12 h-12 rounded-full border-4 border-white/25 border-t-white animate-spin" />
        </div>
      )}

      {/* Shadow overlay for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 via-35% to-transparent pointer-events-none" />
      
      {/* Meta details at bottom left with seamless transition */}
      <div
        className={`absolute flex flex-col justify-end items-start text-left z-20 pointer-events-none ${videoEnabled ? "transition-all duration-200" : "transition-none"} ${
        isLandscape
          ? "bottom-8 left-8 right-8"
          : "bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8"
      }`}>
        {/* Original URL, same as the preloader warms: title art is never
            CDN-resized (jojoResizedImageURL returns it untouched anyway). */}
        {item?.title_image ? (
          <TitleLogoImage
            src={item.title_image}
            alt={item?.title || ""}
            wrapperClassName={`relative mb-3 flex justify-start items-end ${
              isLandscape
                ? "w-[280px] h-[90px]"
                : "w-[160px] sm:w-[220px] lg:w-[280px] h-[50px] sm:h-[65px] lg:h-[80px]"
            }`}
            className={`w-full h-full object-contain object-left-bottom ${videoEnabled ? "drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" : ""}`}
            fallback={titleText}
            highPriority
          />
        ) : titleText}
        {item?.genres && item.genres.length > 0 && (
          <span className={`text-white/90 font-semibold truncate drop-shadow-md text-left transition-opacity duration-300 ${
            isLandscape ? "text-2xl" : "text-base sm:text-lg"
          }`}>
            {item.genres.join(" • ")}
          </span>
        )}
      </div>
    </div>
  );
});
