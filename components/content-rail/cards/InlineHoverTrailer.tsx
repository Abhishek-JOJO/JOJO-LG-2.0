"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { isHlsUrl, VIDEO_CONSTANTS } from "@/lib/constants/video";
import { usePlayerStore } from "@/store/usePlayerStore";
import { jojoResizedImageURL } from "@/lib/config/imageRequest.config";
import { ContentRailItem } from "../config/contentRail.types";

interface InlineHoverTrailerProps {
  item: ContentRailItem;
  isExpanded: boolean;
  /** Pass true when this trailer is mounted inside the spotlight landscape lead card (870px wide) */
  isLandscape?: boolean;
}

export const InlineHoverTrailer = React.memo(function InlineHoverTrailer({ item, isExpanded, isLandscape = false }: InlineHoverTrailerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  const isMuted = usePlayerStore((s) => s.isMuted);

  const previewUrl = useMemo(() => {
    return item?.previewUrl || (item as any)?.preview_url || null;
  }, [item]);

  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  useEffect(() => {
    setVideoReady(false);
    setVideoError(false);
    setShouldLoadVideo(false);

    if (!isExpanded || !previewUrl) return;

    // Debounce 1200ms before allocating webOS hardware video decoders
    const timer = setTimeout(() => {
      setShouldLoadVideo(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [previewUrl, item?.id, isExpanded]);

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

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">

      {/* Video Player - Only mounted when card is active/expanded, debounced, and hidden until first frame is ready */}
      {shouldLoadVideo && previewUrl && !videoError && (
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
      
      {/* Shadow overlay for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 via-35% to-transparent pointer-events-none" />
      
      {/* Meta details at bottom left with seamless transition */}
      <div
        className={`absolute flex flex-col justify-end items-start text-left z-20 pointer-events-none transition-all duration-200 ${
        isLandscape
          ? "bottom-8 left-8 right-8"
          : "bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8"
      }`}>
        {item?.title_image ? (
          <div className={`relative mb-3 flex justify-start items-end ${
            isLandscape
              ? "w-[280px] h-[90px]"
              : "w-[160px] sm:w-[220px] lg:w-[280px] h-[50px] sm:h-[65px] lg:h-[80px]"
          }`}>
            <img
              src={jojoResizedImageURL(item.title_image, { targetSize: { width: 560, height: 160 } })}
              alt={item?.title || ""}
              className="w-full h-full object-contain object-left-bottom drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
              loading="eager"
              decoding="async"
            />
          </div>
        ) : item?.title ? (
          <h3 className={`text-white font-extrabold line-clamp-1 drop-shadow-lg mb-2 text-left ${
            isLandscape ? "text-3xl" : "text-xl sm:text-2xl"
          }`}>
            {item.title}
          </h3>
        ) : null}
        {item?.genres && item.genres.length > 0 && (
          <span className={`text-white/90 font-semibold truncate drop-shadow-md text-left transition-opacity duration-300 ${
            isLandscape ? "text-base" : "text-sm sm:text-base"
          }`}>
            {item.genres.join(" • ")}
          </span>
        )}
      </div>
    </div>
  );
});
