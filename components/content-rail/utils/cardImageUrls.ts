/**
 * Which source image each rail card renders.
 *
 * The cards and the image preloader must agree on this exactly: a preload of
 * any other field (or crop) is a download no card ever displays. The
 * preloader used to warm `posterImage` / `portraitImage || image` while the
 * cards rendered the fallback cascades below, so on TV every "preloaded" card
 * still loaded cold while scrolling.
 */

import { ContentRailItem } from "../config/contentRail.types";

function uniqueUrls(candidates: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  return candidates.filter((u): u is string => {
    if (typeof u === "string" && u.trim().length > 0 && !seen.has(u)) {
      seen.add(u);
      return true;
    }
    return false;
  });
}

/** Landscape card / spotlight lead fallback cascade (Poster Ratio 4 -> Poster Ratio 1 -> Landscape -> etc.). */
export function getLandscapeCardImages(item: ContentRailItem): string[] {
  if (item.landscapeFallbackImages && item.landscapeFallbackImages.length > 0) {
    return item.landscapeFallbackImages;
  }
  return uniqueUrls([
    item.landscapeImage,
    item.posterImageRatio4,
    item.posterImage,
    item.heroImage,
    item.image,
    item.portraitImage,
  ]);
}

export function getLandscapeCardImageUrl(
  item: ContentRailItem,
  images: string[] = getLandscapeCardImages(item)
): string {
  return (
    images[0] ||
    item.landscapeImage ||
    item.posterImage ||
    item.heroImage ||
    item.image ||
    item.portraitImage ||
    ""
  );
}

/**
 * Portrait card fallback cascade:
 * 1. POSTER Ratio 4 -> 2. POSTER Ratio 3 -> 3. POSTER Ratio 1 -> 4. POSTER (null)
 * -> 5. LANDSCAPE Ratio 1 -> 6. LANDSCAPE (null) -> 7. PORTRAIT -> 8. Generic
 */
export function getPortraitCardImages(item: ContentRailItem): string[] {
  if (item.portraitFallbackImages && item.portraitFallbackImages.length > 0) {
    return item.portraitFallbackImages;
  }
  return uniqueUrls([
    item.posterImageRatio4,
    item.portraitImage,
    item.posterImage,
    item.landscapeImage,
    item.image,
  ]);
}

export function getPortraitCardImageUrl(
  item: ContentRailItem,
  images: string[] = getPortraitCardImages(item)
): string {
  return images[0] || item.posterImageRatio4 || item.portraitImage || item.image || "";
}
