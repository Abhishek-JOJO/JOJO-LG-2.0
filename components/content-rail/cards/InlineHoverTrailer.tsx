"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { isHlsUrl, VIDEO_CONSTANTS } from "@/lib/constants/video";
import { usePlayerStore } from "@/store/usePlayerStore";
import JOJOCommonImage from "@/components/ui/JOJOCommonImage";
import { ContentRailItem } from "../config/contentRail.types";

interface InlineHoverTrailerProps {
  item: ContentRailItem;
  isExpanded: boolean;
  /** Pass true when this trailer is mounted inside the spotlight landscape lead card (870px wide) */
  isLandscape?: boolean;
}

export function InlineHoverTrailer({ item, isExpanded, isLandscape = false }: InlineHoverTrailerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  const isMuted = usePlayerStore((s) => s.isMuted);

  const previewUrl = useMemo(() => {
    return item?.previewUrl || (item as any)?.preview_url || null;
  }, [item]);

  const landscapeImageUrl = item?.posterImage || item?.landscapeImage || item?.heroImage || item?.image;

  useEffect(() => {
    setVideoReady(false);
    setVideoError(false);
  }, [previewUrl, item?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewUrl || !isExpanded) return;

    let hlsInstance: any = null;
    let playTimeout: NodeJS.Timeout | null = null;

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
            maxBufferLength: 5,
            maxMaxBufferLength: 10,
            enableWorker: true,
          });
          hlsInstance.loadSource(previewUrl);
          hlsInstance.attachMedia(videoRef.current);

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            playTimeout = setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.play().then(() => {
                  setVideoReady(true);
                }).catch(() => {});
              }
            }, 200);
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
      playTimeout = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().then(() => {
            setVideoReady(true);
          }).catch(() => {});
        }
      }, 200);
    }

    return () => {
      if (playTimeout) clearTimeout(playTimeout);
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
  }, [isExpanded, previewUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
      {/* Landscape image: ALWAYS visible behind video */}
      <div className="absolute inset-0 w-full h-full">
        {landscapeImageUrl && (
          <JOJOCommonImage
            src={landscapeImageUrl}
            alt={item.title}
            fill
            contentMode="cover"
            wrapperClassName="w-full h-full"
          />
        )}
      </div>

      {/* Video Player - Only mounted when card is active/expanded */}
      {isExpanded && previewUrl && !videoError && (
        <video
          ref={videoRef}
          muted={isMuted}
          loop
          playsInline
          preload="auto"
          onPlaying={() => setVideoReady(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            videoReady ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      
      {/* Shadow overlay for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 via-35% to-transparent pointer-events-none" />
      
      {/* Meta details at bottom left */}
      <div className={`absolute flex flex-col justify-end z-20 pointer-events-none ${
        isLandscape
          ? "bottom-8 left-8 right-8"
          : "bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8"
      }`}>
        {item?.title_image ? (
          <div className={`relative mb-3 ${
            isLandscape
              ? "w-[280px] h-[90px]"
              : "w-[160px] sm:w-[220px] lg:w-[280px] h-[50px] sm:h-[65px] lg:h-[80px]"
          }`}>
            <JOJOCommonImage
              src={item.title_image}
              alt={item.title}
              fill
              contentMode="contain"
              optimizeRequestURL={false}
              wrapperClassName="w-full h-full object-contain object-left-bottom origin-bottom-left"
            />
          </div>
        ) : (
          <h3 className={`text-white font-extrabold line-clamp-1 drop-shadow-lg mb-2 ${
            isLandscape ? "text-3xl" : "text-xl sm:text-2xl"
          }`}>
            {item.title}
          </h3>
        )}
        {item.genres && item.genres.length > 0 && (
          <span className={`text-white/90 font-semibold truncate drop-shadow-md ${
            isLandscape ? "text-base" : "text-sm sm:text-base"
          }`}>
            {item.genres.join(" • ")}
          </span>
        )}
      </div>
    </div>
  );
}
