/**
 * Image URLs this session has fully loaded, either by an on-screen <img> or
 * by the rail preloader's decode(). Shared so JOJOCommonImage can render an
 * already-fetched image visible on its very first frame instead of hiding it
 * until its own onLoad fires — which made warm images (e.g. the next hero
 * slide) flash a dark placeholder on TV.
 */
const loadedImageUrls = new Set<string>();

export function markImageUrlLoaded(url: string): void {
  loadedImageUrls.add(url);
}

export function isImageUrlLoaded(url: string): boolean {
  return loadedImageUrls.has(url);
}
