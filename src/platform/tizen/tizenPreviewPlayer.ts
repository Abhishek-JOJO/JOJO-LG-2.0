/**
 * Inline preview videos on Samsung Tizen (home hero, spotlight lead card,
 * asset-detail hero).
 *
 * HTML5 <video> previews are off on Tizen: on physical Samsung TVs they paint
 * white or late frames (see HeroCarouselCard). AVPlay — the native player the
 * movie player already uses — renders reliably, but on a hardware video plane
 * *behind* the web page, so the page has to be see-through wherever the video
 * shows. Once a preview's frames are on screen, its box and every ancestor
 * get `tizen-video-passthrough` (globals.css makes them transparent, fades
 * out artwork marked `data-tizen-video-cover`, and masks the rounded corners
 * of `data-tizen-video-frame` boxes), and every layer that sits behind the
 * page content (`data-tizen-video-backdrop`: the page backdrop, the ambient
 * tint) gets a hole cut exactly over the box. The video is sized like `object-fit: cover` —
 * AVPlay can't crop, so its rect may overhang the box, and the opaque
 * backdrop around the hole hides the overhang.
 *
 * `webapis.avplay` is one native instance shared with TizenAVPlayAdapter:
 * only one preview plays at a time (a new one supersedes the last), the movie
 * player stops any preview before opening its own session, and a preview is
 * always closed before the page unloads.
 */

import type { SamsungAVPlay } from "../types";

const PASSTHROUGH_CLASS = "tizen-video-passthrough";
/** Set on <html> by TizenAVPlayAdapter while a movie plays: drops the whole page backdrop. */
export const TIZEN_VIDEO_FULLSCREEN_CLASS = "tizen-video-fullscreen";
const BACKDROP_SELECTOR = "[data-tizen-video-backdrop]";
// Until the stream reports its real size (after prepare), assume 16:9.
const DEFAULT_VIDEO_ASPECT = 16 / 9;
// AVPlay reports a play position before the plane shows a picture, and can do
// so while still buffering; going see-through then showed a black card until
// the picture caught up. Reveal only once the clock has been seen advancing
// across reports, by at least this much, with no buffering in progress.
const REVEAL_AFTER_ADVANCE_MS = 250;
// A preview starts playing once this much is buffered instead of AVPlay's
// default (sized for full playback), so the first frame comes sooner.
const PREVIEW_START_BUFFER_SECONDS = 2;
// AVPlay's display rect is always in the TV's 1920x1080 logical space.
const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;

export interface TizenPreviewOptions {
  url: string;
  /** Box the video fills; its on-screen rect becomes the AVPlay display rect. */
  target: HTMLElement;
  /** First frames are on screen and the page above them is now see-through. */
  onReady?: () => void;
  onTimeUpdate?: (currentMs: number, durationMs: number) => void;
  /** Played to the end (the preview is already closed). */
  onEnded?: () => void;
  /** Failed, or was taken over by another preview / the movie player / the app being hidden. */
  onStop?: (reason: "error" | "superseded") => void;
  /**
   * false: prepare now (manifest + first segments, the slow part) but hold
   * playback until handle.play(). Lets a caller warm a preview up during a
   * dwell instead of only starting the download once the dwell ends.
   */
  autoPlay?: boolean;
}

export interface TizenPreviewHandle {
  /** Starts a preview opened with autoPlay: false — at once if prepared, else as soon as it is. */
  play(): void;
  pause(): void;
  resume(): void;
  /** Closes the preview. Does nothing if it has already ended or been superseded. */
  stop(): void;
}

interface Session {
  options: TizenPreviewOptions;
  objectEl: HTMLObjectElement;
  passthrough: HTMLElement[];
  ready: boolean;
  videoAspect: number;
  /** Position of the first time report, the baseline for REVEAL_AFTER_ADVANCE_MS. */
  firstReportMs: number | null;
  buffering: boolean;
  prepared: boolean;
  playRequested: boolean;
}

let current: Session | null = null;
let lifecycleHooked = false;
let nativeClosePending = false;

const NOOP_HANDLE: TizenPreviewHandle = { play() {}, pause() {}, resume() {}, stop() {} };

function getAVPlay(): SamsungAVPlay | null {
  return typeof window !== "undefined" ? window.webapis?.avplay ?? null : null;
}

export function isTizenPreviewAvailable(): boolean {
  return getAVPlay() !== null;
}

function closeNativeSession(avplay: SamsungAVPlay): void {
  try {
    const state = avplay.getState();
    if (state === "PLAYING" || state === "PAUSED" || state === "READY") avplay.stop();
    if (avplay.getState() !== "NONE") avplay.close();
  } catch {
    // Nothing open, or the TV rejected a redundant stop/close.
  }
}

/** Runs a deferred close now — before AVPlay is reused, or the page goes away. */
function flushNativeClose(): void {
  if (!nativeClosePending) return;
  nativeClosePending = false;
  const avplay = getAVPlay();
  if (avplay) closeNativeSession(avplay);
}

function getBackdrops(): HTMLElement[] {
  return typeof document !== "undefined"
    ? Array.from(document.querySelectorAll<HTMLElement>(BACKDROP_SELECTOR))
    : [];
}

function teardown(session: Session): void {
  if (current === session) current = null;
  for (const el of session.passthrough) el.classList.remove(PASSTHROUGH_CLASS);
  session.passthrough = [];
  for (const backdrop of getBackdrops()) backdrop.style.clipPath = "";
  window.removeEventListener("scroll", interruptPreview);
  session.objectEl.remove();
  // stop()/close() are synchronous native calls that can take a visible
  // slice of a frame on Samsung hardware, and a preview usually stops because
  // the user just pressed a key. Let that keypress render first — the page is
  // already opaque again, so the still-open plane can't be seen. Anything
  // that reuses AVPlay flushes this first (startTizenPreview/stopTizenPreview).
  if (!nativeClosePending) {
    nativeClosePending = true;
    setTimeout(flushNativeClose, 0);
  }
}

function getViewport(): { width: number; height: number } {
  return { width: window.innerWidth || LOGICAL_WIDTH, height: window.innerHeight || LOGICAL_HEIGHT };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function applyPassthrough(session: Session): void {
  for (let el: HTMLElement | null = session.options.target; el; el = el.parentElement) {
    el.classList.add(PASSTHROUGH_CLASS);
    session.passthrough.push(el);
  }
  // The plane may only show through the box itself: everywhere else these
  // layers stay as they are, hiding the cover rect's overhang (and keeping
  // the page background and ambient tint around the box). clip-path is in
  // each layer's own coordinates, so the box is mapped into each one.
  const box = session.options.target.getBoundingClientRect();
  const { width, height } = getViewport();
  const left = clamp(box.left, 0, width), top = clamp(box.top, 0, height);
  const right = clamp(box.right, 0, width), bottom = clamp(box.bottom, 0, height);
  for (const backdrop of getBackdrops()) {
    const origin = backdrop.getBoundingClientRect();
    const l = left - origin.left, t = top - origin.top;
    const r = right - origin.left, b = bottom - origin.top;
    backdrop.style.clipPath =
      `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${r}px ${t}px, ${r}px ${b}px, ${l}px ${b}px, ${l}px ${t}px)`;
  }
  // Scrolling moves the box out from under the hole and the display rect.
  window.addEventListener("scroll", interruptPreview, { passive: true });
}

/**
 * The video's AVPlay rect, sized like `object-fit: cover; object-position:
 * center top` over the target box. A plain box-sized rect letterboxed the
 * video instead — in the wide home hero that left a bare black strip at the
 * side. The rect is kept on-screen (AVPlay rejects off-screen rects on some
 * models) by nudging it, which only shifts which part of the overhang is
 * cropped by the backdrop hole.
 */
export function computeCoverRect(
  box: { left: number; top: number; width: number; height: number },
  videoAspect: number,
  viewport: { width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  let width = box.width;
  let height = box.width / videoAspect;
  if (height < box.height) {
    height = box.height;
    width = height * videoAspect;
  }
  if (width > viewport.width) {
    height *= viewport.width / width;
    width = viewport.width;
  }
  if (height > viewport.height) {
    width *= viewport.height / height;
    height = viewport.height;
  }
  return {
    left: clamp(box.left + (box.width - width) / 2, 0, viewport.width - width),
    top: clamp(box.top, 0, viewport.height - height),
    width,
    height,
  };
}

function applyDisplayRect(avplay: SamsungAVPlay, session: Session): void {
  const viewport = getViewport();
  const rect = computeCoverRect(session.options.target.getBoundingClientRect(), session.videoAspect, viewport);
  const scaleX = LOGICAL_WIDTH / viewport.width;
  const scaleY = LOGICAL_HEIGHT / viewport.height;
  avplay.setDisplayRect(
    Math.round(rect.left * scaleX),
    Math.round(rect.top * scaleY),
    Math.max(1, Math.round(rect.width * scaleX)),
    Math.max(1, Math.round(rect.height * scaleY)),
  );
}

/** The stream's real width/height ratio, once prepared; null if the TV doesn't report it. */
function readVideoAspect(avplay: SamsungAVPlay): number | null {
  try {
    const tracks = avplay.getCurrentStreamInfo?.() ?? avplay.getTotalTrackInfo();
    const video = tracks.find((track) => track.type === "VIDEO");
    const info = video?.extra_info ? JSON.parse(video.extra_info) : null;
    const width = Number(info?.Width);
    const height = Number(info?.Height);
    return width > 0 && height > 0 ? width / height : null;
  } catch {
    return null;
  }
}

function hookLifecycle(): void {
  if (lifecycleHooked || typeof window === "undefined") return;
  lifecycleHooked = true;
  // AVPlay is native: left open, its plane (and audio) would outlive the
  // page into the next document's startup.
  window.addEventListener("pagehide", stopTizenPreview);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTizenPreview();
  });
}

/**
 * Stops the preview without waiting on the native close. Used for scroll,
 * which usually comes from the very keypress that moved focus off the box.
 */
function interruptPreview(): void {
  const session = current;
  if (!session) return;
  teardown(session);
  session.options.onStop?.("superseded");
}

/**
 * Closes whatever preview is playing, synchronously — including a close still
 * deferred from an earlier stop. Called by the movie player before it opens
 * AVPlay, so a late close can never land on the movie's session.
 */
export function stopTizenPreview(): void {
  const session = current;
  if (session) {
    teardown(session);
    session.options.onStop?.("superseded");
  }
  flushNativeClose();
}

export function startTizenPreview(options: TizenPreviewOptions): TizenPreviewHandle {
  const avplay = getAVPlay();
  if (!avplay) {
    options.onStop?.("error");
    return NOOP_HANDLE;
  }
  hookLifecycle();
  stopTizenPreview();

  // Same <object> host the movie player's adapter creates for AVPlay.
  const objectEl = document.createElement("object");
  objectEl.type = "application/avplayer";
  objectEl.tabIndex = -1;
  Object.assign(objectEl.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    backgroundColor: "transparent",
  });
  options.target.prepend(objectEl);

  const session: Session = {
    options,
    objectEl,
    passthrough: [],
    ready: false,
    videoAspect: DEFAULT_VIDEO_ASPECT,
    firstReportMs: null,
    buffering: false,
    prepared: false,
    playRequested: options.autoPlay !== false,
  };
  current = session;
  const isCurrent = () => current === session;
  const fail = () => {
    if (!isCurrent()) return;
    teardown(session);
    options.onStop?.("error");
  };

  try {
    avplay.open(options.url);
    avplay.setListener({
      onbufferingstart: () => {
        if (isCurrent()) session.buffering = true;
      },
      onbufferingcomplete: () => {
        if (isCurrent()) session.buffering = false;
      },
      oncurrentplaytime: (milliseconds) => {
        if (!isCurrent()) return;
        if (!session.ready) {
          if (session.firstReportMs === null) session.firstReportMs = milliseconds;
          if (session.buffering || milliseconds - session.firstReportMs < REVEAL_AFTER_ADVANCE_MS) return;
          // Only now drop the artwork: the plane is showing real frames.
          session.ready = true;
          applyPassthrough(session);
          options.onReady?.();
        }
        let durationMs = 0;
        try {
          durationMs = avplay.getDuration();
        } catch {
          // Duration unknown during a state change; skip this tick's ratio.
        }
        options.onTimeUpdate?.(milliseconds, durationMs);
      },
      onstreamcompleted: () => {
        if (!isCurrent()) return;
        teardown(session);
        options.onEnded?.();
      },
      onerror: fail,
      onerrormsg: fail,
    });
    applyDisplayRect(avplay, session);
    // With the rect at the video's own aspect, letter-boxing fits it exactly.
    avplay.setDisplayMethod("PLAYER_DISPLAY_MODE_LETTER_BOX");
    try {
      // Must be set before prepare. Optional: older firmware may not have it.
      avplay.setBufferingParam?.("PLAYER_BUFFER_FOR_PLAY", "PLAYER_BUFFER_SIZE_IN_SECOND", PREVIEW_START_BUFFER_SECONDS);
    } catch {
      // Keep AVPlay's default buffering.
    }
    avplay.prepareAsync(
      () => {
        // Superseded or stopped while preparing: teardown already closed it.
        if (!isCurrent()) return;
        try {
          session.videoAspect = readVideoAspect(avplay) ?? session.videoAspect;
          applyDisplayRect(avplay, session);
          session.prepared = true;
          if (session.playRequested) avplay.play();
        } catch {
          fail();
        }
      },
      fail,
    );
  } catch {
    fail();
  }

  return {
    play() {
      if (!isCurrent() || session.playRequested) return;
      session.playRequested = true;
      if (!session.prepared) return; // prepareAsync's callback starts it
      try {
        avplay.play();
      } catch {
        fail();
      }
    },
    pause() {
      if (!isCurrent()) return;
      try {
        if (avplay.getState() === "PLAYING") avplay.pause();
      } catch {
        // Ignore — the next resume/stop reconciles the state.
      }
    },
    resume() {
      if (!isCurrent()) return;
      try {
        if (avplay.getState() === "PAUSED") avplay.play();
      } catch {
        // Ignore — see pause().
      }
    },
    stop() {
      if (isCurrent()) teardown(session);
    },
  };
}
