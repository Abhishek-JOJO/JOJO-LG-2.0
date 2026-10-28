"use client";

import React, { useState, type ReactNode } from "react";

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
 * Title art is a transparent PNG served at full size (the CDN resizer would
 * flatten its alpha — see jojoResizedImageURL), so it is the slowest image on
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
  // Keyed by URL so a new item's logo gets a fresh attempt automatically.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) return <>{fallback}</>;

  return (
    <div className={wrapperClassName}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={alt}
        className={className}
        loading="eager"
        decoding="async"
        fetchPriority={highPriority ? "high" : undefined}
        draggable={false}
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
});
