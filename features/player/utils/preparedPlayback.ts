import type { VideoDetails } from "../model/types";

const STORAGE_KEY = "jojo_prepared_playback";
const MAX_AGE_MS = 30_000;

// sessionStorage survives the packaged TV app's file:// navigation. This is a
// single-use handoff, not a persistent cache of signed playback URLs.
export function savePreparedPlayback(video: VideoDetails, sessionId: string, profile: string | null): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ video, sessionId, profile, createdAt: Date.now() }));
}

export function takePreparedPlayback(contentId: string, sessionId: string | null, profile: string | null): VideoDetails | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const prepared = JSON.parse(raw);
    const age = Date.now() - prepared.createdAt;
    if (
      prepared.video?.contentId !== contentId ||
      prepared.sessionId !== sessionId ||
      prepared.profile !== profile ||
      !Number.isFinite(age) || age < 0 || age > MAX_AGE_MS ||
      !prepared.video?.manifestUrl
    ) return null;
    return prepared.video;
  } catch {
    return null;
  }
}
