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
import { markImageUrlLoaded } from "@/lib/utils/loadedImageCache";
import { getLandscapeCardImageUrl, getPortraitCardImageUrl } from "./cardImageUrls";

// Matches the spotlight lead card's rendered size (ContentRailList's slot0Config).
export const LEAD_IMAGE_SIZE = { width: 871, height: 490 };
// Matches the standard portrait card's rendered size (portraitConfig / standardCardConfig).
export const PORTRAIT_IMAGE_SIZE = { width: 326, height: 490 };

const preloadedUrls = new Set<string>();
const activePreloadMap = new Map<string, HTMLImageElement>();

export function preloadImageUrl(
  url?: string | null,
  targetSize?: { width: number; height: number },
  quality?: number
): void {
  if (!url || typeof window === "undefined") return;
  const resolvedUrl = targetSize
    ? jojoResizedImageURL(url, { targetSize, fit: JOJOImageFit.Cover, quality })
    : url;
  if (preloadedUrls.has(resolvedUrl)) return;
  preloadedUrls.add(resolvedUrl);

  try {
    const img = new Image();
    // Confirmed live via CDP network trace: this preloading was competing
    // directly with the asset-detail API call for the TV's limited
    // concurrent-connection pool — opening a card while dozens of these
    // preloads were still in flight measured the API response itself
    // taking ~3.6s (vs. a normal fast JSON response), matching the
    // reported "2-3 second delay before real content shows." fetchPriority
    // is a browser-level hint (silently ignored where unsupported, so safe
    // regardless of this TV's exact Chromium version) that lets the
    // network scheduler correctly favor small, critical requests like that
    // API call over these speculative background image fetches, instead of
    // treating everything as equally urgent.
    if ('fetchPriority' in img) {
      (img as HTMLImageElement & { fetchPriority: string }).fetchPriority = 'low';
    }
    activePreloadMap.set(resolvedUrl, img);
    img.src = resolvedUrl;
    // Pre-decode the bitmap so the browser can composite it instantly
    // when a DOM <img> later uses the same URL (avoids on-demand decode delay)
    if (typeof img.decode === "function") {
      img.decode().then(() => {
        markImageUrlLoaded(resolvedUrl);
        activePreloadMap.delete(resolvedUrl);
      }).catch(() => {
        activePreloadMap.delete(resolvedUrl);
      });
    } else {
      img.onload = () => {
        markImageUrlLoaded(resolvedUrl);
        activePreloadMap.delete(resolvedUrl);
      };
      img.onerror = () => { activePreloadMap.delete(resolvedUrl); };
    }
  } catch {
    // ignore
  }
}

/**
 * Warms exactly what the cards render for one item: the lead landscape
 * poster, the title logo (always its original URL — title art is never
 * resized, see jojoResizedImageURL / TitleLogoImage), and optionally the
 * portrait poster.
 */
export function preloadRailItemImages(
  item: ContentRailItem | undefined,
  options: { lead?: boolean; portrait?: boolean } = {}
): void {
  if (!item) return;
  const { lead = true, portrait = false } = options;
  if (lead) preloadImageUrl(getLandscapeCardImageUrl(item), LEAD_IMAGE_SIZE);
  preloadImageUrl(item.title_image);
  if (portrait) preloadImageUrl(getPortraitCardImageUrl(item), PORTRAIT_IMAGE_SIZE);
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
    preloadRailItemImages(item, { portrait: true });
  }
}
