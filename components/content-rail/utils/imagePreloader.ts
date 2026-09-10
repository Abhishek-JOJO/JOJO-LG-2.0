/**
 * Global Deduplicated Image Preloader for LG webOS TV
 *
 * Prevents main thread lag, socket saturation, and early garbage collection:
 * 1. Tracks already preloaded URLs in a global Set so each image is requested at most once.
 * 2. Retains strong references in a Map until image is loaded/errored so V8's GC does not abort prefetching.
 * 3. Preloads the same CDN-resized URL the actual <img> will render (not the full-size
 *    original) so the prefetch and the on-screen request hit the same cache entry —
 *    resizing is what keeps bytes-over-the-wire and decode cost low on TV hardware.
 */

import { ContentRailItem } from "../config/contentRail.types";
import { jojoResizedImageURL, JOJOImageFit } from "@/lib/config/imageRequest.config";

// Matches the spotlight lead card's rendered size (ContentRailList's slot0Config).
const LEAD_IMAGE_SIZE = { width: 871, height: 490 };
// Matches the standard portrait card's rendered size (portraitConfig / standardCardConfig).
const PORTRAIT_IMAGE_SIZE = { width: 326, height: 490 };

const preloadedUrls = new Set<string>();
const activePreloadMap = new Map<string, HTMLImageElement>();

export function preloadImageUrl(
  url?: string | null,
  targetSize?: { width: number; height: number }
): void {
  if (!url || typeof window === "undefined") return;
  const resolvedUrl = targetSize
    ? jojoResizedImageURL(url, { targetSize, fit: JOJOImageFit.Cover })
    : url;
  if (preloadedUrls.has(resolvedUrl)) return;
  preloadedUrls.add(resolvedUrl);

  try {
    const img = new Image();
    activePreloadMap.set(resolvedUrl, img);
    img.src = resolvedUrl;
    // Pre-decode the bitmap so the browser can composite it instantly
    // when a DOM <img> later uses the same URL (avoids on-demand decode delay)
    if (typeof img.decode === "function") {
      img.decode().then(() => {
        activePreloadMap.delete(resolvedUrl);
      }).catch(() => {
        activePreloadMap.delete(resolvedUrl);
      });
    } else {
      img.onload = () => { activePreloadMap.delete(resolvedUrl); };
      img.onerror = () => { activePreloadMap.delete(resolvedUrl); };
    }
  } catch {
    // ignore
  }
}

/**
 * Preload all images (lead landscape, title logo, and portrait) for a list of rail items
 * Eagerly called so navigating between cards/rails has 0ms network latency.
 */
export function preloadRailItems(items?: ContentRailItem[] | null, maxItems = 10): void {
  if (!items?.length || typeof window === "undefined") return;
  const count = Math.min(items.length, maxItems);
  for (let i = 0; i < count; i++) {
    const item = items[i];
    if (!item) continue;
    const landscapeUrl = item.posterImage || item.heroImage || item.landscapeImage || item.image || item.portraitImage;
    preloadImageUrl(landscapeUrl, LEAD_IMAGE_SIZE);
    preloadImageUrl(item.title_image);
    preloadImageUrl(item.portraitImage || item.image, PORTRAIT_IMAGE_SIZE);
  }
}
