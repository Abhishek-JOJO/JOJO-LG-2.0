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
}

export function InlineHoverTrailer({ item, isExpanded }: InlineHoverTrailerProps) {
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
      {/* Landscape image: ALWAYS visible when video is not playing */}
      <div className={cn(
        "absolute inset-0 w-full h-full transition-opacity duration-300",
        videoReady && isExpanded ? "opacity-0" : "opacity-100"
      )}>
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
      
      {/* Meta details at bottom left */}
      <div className="absolute bottom-3 left-4 right-4 flex flex-col justify-end z-20">
        {item?.title_image ? (
          <div className="relative w-[120px] sm:w-[150px] h-[35px] sm:h-[45px] mb-0.5">
            <JOJOCommonImage
              src={item.title_image}
              alt={item.title}
              fill
              contentMode="contain"
              wrapperClassName="w-full h-full object-contain object-left-bottom origin-bottom-left"
            />
          </div>
        ) : (
          <h3 className="text-white font-bold text-sm sm:text-base line-clamp-1 shadow-sm">{item.title}</h3>
        )}
        {item.genres && item.genres.length > 0 && (
          <span className="text-white/80 font-medium text-[10px] sm:text-[11px] mt-0.5 truncate drop-shadow-md">
            {item.genres.join(" • ")}
          </span>
        )}
      </div>
    </div>
  );
}
