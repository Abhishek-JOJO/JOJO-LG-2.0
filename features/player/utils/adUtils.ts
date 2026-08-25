/**
 * Utility to validate if a string is a genuine web page / advertiser landing URL.
 * Filters out video stream files (.mp4, .m3u8, .mpd, .ts) and raw ad tag endpoints.
 */
export function isLandingPageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;

  const lower = trimmed.toLowerCase();

  // Exclude video files and streaming manifests
  if (
    lower.includes('.mp4') ||
    lower.includes('.m3u8') ||
    lower.includes('.mpd') ||
    lower.includes('.webm') ||
    lower.includes('.ts') ||
    lower.includes('.m4s')
  ) {
    return false;
  }

  // Exclude raw DoubleClick ad tag endpoints / VMAP XML endpoints
  if (
    lower.includes('pubads.g.doubleclick.net/gampad/ads') ||
    lower.includes('/vmap/')
  ) {
    return false;
  }

  return true;
}
