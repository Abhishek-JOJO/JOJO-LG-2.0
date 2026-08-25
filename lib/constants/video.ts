export const VIDEO_CONSTANTS = {
  HLS_EXTENSION: ".m3u8",
  HLS_MIME_TYPE: "application/vnd.apple.mpegurl",
  HLS_MASTER_PLAYLIST: "/hls/master.m3u8",
} as const;

export function isHlsUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.includes(VIDEO_CONSTANTS.HLS_EXTENSION) ||
    url.includes(VIDEO_CONSTANTS.HLS_MASTER_PLAYLIST)
  );
}
