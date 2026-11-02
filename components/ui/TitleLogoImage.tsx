"use client";

import React, { useState, type ReactNode } from "react";
import { titleArtURL } from "@/lib/config/imageRequest.config";

interface TitleLogoImageProps {
  src: string;
  alt: string;
  /** Classes for the box the logo is fitted into. */
  wrapperClassName?: string;
  /** Classes for the <img> itself (object-fit, object-position, effects). */
  className?: string;
  /** Rendered in place of the whole box if the logo fails to load. */
  fallback?: ReactNode;
  /** Ask the network scheduler to fetch this logo ahead of background work. */
  highPriority?: boolean;
}

/**
 * Title-art logo for rail cards, the home hero and asset detail.
 *
 * Title art is transparent and its originals run up to ~2100px, so it is
 * requested through titleArtURL (CDN `fit=inside`, alpha kept) — the full-size
 * decode blocked whole frames on Samsung TVs. It is still the slowest image on
 * a card. Through JOJOCommonImage / next/image it was lazy-loaded, hidden
 * until onLoad, and drawn over an opaque placeholder: the black box seen
 * while scrolling fast. This is a plain eager <img> instead — nothing is
 * drawn until the logo arrives, and a logo the preloader already fetched shows
 * on the first frame. Each URL gets its own <img>: reusing one across items
 * kept the previous title's logo on screen until the new one downloaded.
 */
export const TitleLogoImage = React.memo(function TitleLogoImage({
  src,
  alt,
  wrapperClassName,
  className,
  fallback = null,
  highPriority = false,
}: TitleLogoImageProps) {
  const resizedSrc = titleArtURL(src);
  // Keyed by URL so a new item's logo gets a fresh attempt automatically.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  // A failed resized URL falls back to the original once.
  const activeSrc = failedSrc === resizedSrc ? src : resizedSrc;

  if (failedSrc === src) return <>{fallback}</>;

  return (
    <div className={wrapperClassName}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={activeSrc}
        src={activeSrc}
        alt={alt}
        className={className}
        loading="eager"
        decoding="async"
        fetchPriority={highPriority ? "high" : undefined}
        draggable={false}
        onError={() => setFailedSrc(activeSrc)}
      />
    </div>
  );
});
