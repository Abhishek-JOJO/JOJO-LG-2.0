/**
 * Samsung Tizen AVPlay adapter.
 *
 * AVPlay owns a native video plane rather than the HTMLVideoElement. This
 * adapter translates that native lifecycle into the same contract used by
 * Shaka so controls, analytics, recovery, and ads stay platform-agnostic.
 */

import { logger } from '@lib/logger/logger';
import type { SamsungAVPlay, SamsungAVPlayTrack } from '@/src/platform/types';
import { stopTizenPreview, TIZEN_VIDEO_FULLSCREEN_CLASS } from '@/src/platform/tizen/tizenPreviewPlayer';
import type {
  AdapterName,
  AudioTrack,
  DrmConfig,
  PlaybackSpeed,
  PlayerAdapter,
  PlayerAdapterEventHandlers,
  PlayerLoadOptions,
  PlayerCapabilities,
  QualityOption,
  StreamFormat,
  SubtitleTrack,
} from '../model/types';

const TIZEN_LOGICAL_WIDTH = 1920;
const TIZEN_LOGICAL_HEIGHT = 1080;
// Long enough for a slow manifest + DRM license; past it, prepareAsync is
// treated as never reporting back (see load()).
// Measured on a slow connection: prepareAsync took longer than the old 10s,
// the fallback then froze the page for 25s in a synchronous prepare() and
// restarted the download. Buffering events restart the countdown, so only a
// prepare that shows no activity at all for this long falls back.
const PREPARE_ASYNC_TIMEOUT_MS = 30000;
// Time updates reach the UI at the HTML5 timeupdate cadence (~4/s); more
// often only re-renders the whole player for no visible gain.
const TIME_UPDATE_INTERVAL_MS = 250;
// A seekTo whose callbacks never arrive must not block every later seek.
const SEEK_SETTLE_TIMEOUT_MS = 5000;
// After a seek (Skip Intro, FF/RW) or a subtitle switch AVPlay refills its
// buffer before resuming: by default ~15s frozen on a ~1 Mbps TV connection
// (measured on a Tizen 8 TV). Resume once this much is buffered.
const RESUME_BUFFER_SECONDS = 4;
// seekTo/jumpForward block the page for 0.4-4.7s on a Tizen 8 TV (measured;
// it waits on the fetch at the new position). A burst of FF/RW presses lands
// as one native seek to the newest target once the presses pause this long
// (a press can take ~0.4s to process on the TV, so shorter split bursts).
const SEEK_COALESCE_MS = 500;

class PrepareTimeoutError extends Error {
  constructor() {
    super(`AVPlay prepareAsync did not report back within ${PREPARE_ASYNC_TIMEOUT_MS}ms`);
  }
}

const TIZEN_AVPLAY_CAPABILITIES: PlayerCapabilities = {
  playbackSpeeds: [1, 2],
  qualitySelection: 'manual',
  volumeControl: 'mute-only',
  captionStyling: false,
};

interface HlsVariant {
  /** BANDWIDTH from the master playlist, in bps: what ADAPTIVE_INFO pins. */
  bandwidth: number;
  height: number;
  /** Absolute URL of the variant's media playlist. */
  url: string;
}

/** One entry per resolution from an HLS master playlist, highest first; [] if not HLS/unreadable. */
export async function fetchHlsVariants(manifestUrl: string): Promise<HlsVariant[]> {
  try {
    const text = await (await fetch(manifestUrl)).text();
    const byHeight = new Map<number, HlsVariant>();
    let pending: { bandwidth: number; height: number } | null = null;
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        pending = {
          bandwidth: Number(/[:,]BANDWIDTH=(\d+)/.exec(line)?.[1]),
          height: Number(/RESOLUTION=\d+x(\d+)/.exec(line)?.[1]),
        };
      } else if (pending && line && !line.startsWith('#')) {
        const { bandwidth, height } = pending;
        pending = null;
        if (bandwidth > 0 && height > 0 && !byHeight.has(height)) {
          byHeight.set(height, { bandwidth, height, url: new URL(line, manifestUrl).href });
        }
      }
    }
    return [...byHeight.values()].sort((a, b) => b.height - a.height);
  } catch {
    return [];
  }
}

interface ParsedTrackInfo {
  language?: string;
  title?: string;
  label?: string;
}

function parseTrackInfo(track: SamsungAVPlayTrack): ParsedTrackInfo {
  if (!track.extra_info) return {};
  try {
    return JSON.parse(track.extra_info) as ParsedTrackInfo;
  } catch {
    return {};
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

export class TizenAVPlayAdapter implements PlayerAdapter {
  readonly name: AdapterName = 'tizen-avplay';

  private avplay: SamsungAVPlay | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private container: HTMLElement | null = null;
  private objectEl: HTMLObjectElement | null = null;
  private handlers: PlayerAdapterEventHandlers | null = null;
  private tracks: SamsungAVPlayTrack[] = [];
  private manifestUrl = '';
  private drmConfig: DrmConfig | null = null;
  private variants: HlsVariant[] = [];
  /** Variant pinned by a manual quality choice (bps), or null for Auto. */
  private fixedBandwidth: number | null = null;
  /** Playing one variant playlist, not the master (see load: silent master fallback). */
  private muxedAudioOnly = false;
  /** Variant used for Auto while muxedAudioOnly (no adaptive switching then). */
  private autoBandwidth: number | null = null;
  private qualitySwitch: Promise<void> = Promise.resolve();
  private currentTimeSeconds = 0;
  private durationSeconds = 0;
  private bufferedSeconds = 0;
  private ended = false;
  private previousVideoVisibility = '';
  private selectedAudioIndex: number | null = null;
  private selectedTextIndex: number | null = null;
  private originalBackgrounds = new Map<HTMLElement, string>();
  private destroyed = false;
  /** The TV's own mute state before this session, restored if setVolume changed it. */
  private initialTvMute: boolean | null = null;
  private changedTvMute = false;
  /** A native seekTo is running; newer requests wait in queuedSeekMs (only the latest is kept). */
  private seekInFlight = false;
  private queuedSeekMs: number | null = null;
  /** The resume seek failed before playback started; tried once more on the first time report. */
  private resumeRetryMs: number | null = null;
  private seekSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private seekCoalesceTimer: ReturnType<typeof setTimeout> | null = null;
  private playbackSpeed: PlaybackSpeed = 1;
  /** Last native buffering event: a prepare still making progress isn't timed out. */
  private nativeActivityAt = 0;
  /** A seek is waiting to run or running: the native clock still reads the pre-seek position. */
  private get seeking(): boolean {
    return this.seekInFlight || this.seekCoalesceTimer !== null;
  }
  private lastTimeUpdateAt = 0;
  /** suspend() was called for the app going to the background; restore() on return. */
  private suspendedForBackground = false;

  static isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.webapis?.avplay);
  }

  setEventHandlers(handlers: PlayerAdapterEventHandlers | null): void {
    this.handlers = handlers;
  }

  canPlay(_manifestUrl: string, streamFormat: StreamFormat): boolean {
    return TizenAVPlayAdapter.isAvailable()
      && (streamFormat === 'hls' || streamFormat === 'dash' || streamFormat === 'mp4');
  }

  async load(
    videoEl: HTMLVideoElement,
    manifestUrl: string,
    drmConfig: DrmConfig | null,
    options?: PlayerLoadOptions,
  ): Promise<void> {
    const avplay = window.webapis?.avplay;
    if (!avplay) throw new Error('Samsung AVPlay API is unavailable');

    this.destroyed = false;
    this.avplay = avplay;
    this.videoEl = videoEl;
    this.manifestUrl = manifestUrl;
    this.drmConfig = drmConfig;
    this.muxedAudioOnly = false;
    this.autoBandwidth = null;
    // Read alongside prepare (which takes far longer), for the quality menu.
    const variantsPromise = fetchHlsVariants(manifestUrl);
    this.container = options?.videoContainer ?? videoEl.parentElement;
    if (!this.container) throw new Error('AVPlay requires a video container');

    this.createNativeVideoObject();
    this.previousVideoVisibility = videoEl.style.visibility;
    videoEl.style.visibility = 'hidden';

    // The native AVPlay hardware video plane renders behind the HTML graphics plane.
    // Make container and ancestor elements transparent so video is not blocked by opaque backgrounds.
    let el: HTMLElement | null = this.container;
    while (el) {
      this.originalBackgrounds.set(el, el.style.backgroundColor);
      el.style.backgroundColor = 'transparent';
      el = el.parentElement;
    }
    if (typeof document !== 'undefined') {
      if (document.body) {
        this.originalBackgrounds.set(document.body, document.body.style.backgroundColor);
        document.body.style.backgroundColor = 'transparent';
      }
      if (document.documentElement) {
        this.originalBackgrounds.set(document.documentElement, document.documentElement.style.backgroundColor);
        document.documentElement.style.backgroundColor = 'transparent';
      }
    }

    window.addEventListener('resize', this.updateDisplayRect);
    document.addEventListener('fullscreenchange', this.updateDisplayRect);
    // Leaving the watch page is a full document load on the packaged app, and
    // React's unmount cleanup never runs on unload — so destroy() didn't
    // either. AVPlay is native: left open, its video plane and audio carried
    // on into the next page's startup (the glitch landing back on asset
    // detail). pagehide always fires; destroy()'s native calls are synchronous.
    window.addEventListener('pagehide', this.handlePageHide);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.initialTvMute = this.readTvMute();
    this.changedTvMute = false;

    try {
      // One native instance: an inline preview must give it up first.
      stopTizenPreview();
      // On Tizen the page background is a backdrop layer, not html/body
      // (globals.css); this drops it so the video plane shows behind the player.
      document.documentElement.classList.add(TIZEN_VIDEO_FULLSCREEN_CLASS);
      await this.openAndPrepare(avplay, manifestUrl, drmConfig);

      this.durationSeconds = Math.max(0, avplay.getDuration() / 1000);
      this.tracks = avplay.getTotalTrackInfo() ?? [];
      this.syncSelectedTracks();
      this.handlers?.onDurationChange(this.durationSeconds);
      this.variants = await Promise.race([
        variantsPromise,
        new Promise<HlsVariant[]>((resolve) => setTimeout(() => resolve([]), 3000)),
      ]);

      // Some packagings (FFmpeg: a TS audio rendition plus the same audio muxed
      // into each video TS) play silent on AVPlay: the master lists the audio
      // track but AVPlay never selects it, and setSelectTrack is refused (seen
      // on a Tizen 8 TV). A variant playlist alone plays its muxed audio.
      if (this.variants.length > 0 && this.isAudioMissing(avplay)) {
        this.muxedAudioOnly = true;
        this.autoBandwidth = this.pickStartBandwidth(avplay);
        logger.warn('[TizenAVPlayAdapter] Master played no audio; reopening on a variant playlist', {
          manifestUrl,
          bandwidth: this.fixedBandwidth ?? this.autoBandwidth,
        });
        await this.openAndPrepare(avplay, this.sessionUrl(), drmConfig);
        this.tracks = avplay.getTotalTrackInfo() ?? [];
        this.syncSelectedTracks();
      }

      // Not seekTo before prepare: faster when it works, but on a Tizen 8 TV
      // prepareAsync then failed to report back in 2 of 4 tries (up to 23s).
      const startTime = options?.startTime ?? 0;
      if (startTime > 0) this.seek(startTime);

      logger.info('[TizenAVPlayAdapter] Content prepared', {
        manifestUrl,
        durationSeconds: this.durationSeconds,
        trackCount: this.tracks.length,
      });
    } catch (error) {
      await this.destroy();
      throw error;
    }
  }

  play(): void {
    if (!this.avplay) return;
    try {
      const state = this.avplay.getState();
      if (state === 'READY' || state === 'PAUSED') {
        this.ended = false;
        this.avplay.play();
        this.handlers?.onPlay(this.getCurrentTime());
        // Signal buffering complete so loading spinner dismisses immediately upon playback start
        this.handlers?.onBufferingEnd(this.getCurrentTime());
      }
    } catch (error) {
      this.reportError('AVPLAY_PLAY_FAILED', error, true);
    }
  }

  pause(): void {
    if (!this.avplay) return;
    try {
      if (this.avplay.getState() === 'PLAYING') {
        this.avplay.pause();
        this.handlers?.onPause(this.getCurrentTime());
      }
    } catch (error) {
      this.reportError('AVPLAY_PAUSE_FAILED', error, true);
    }
  }

  seek(seconds: number, options?: { immediate?: boolean }): void {
    if (!this.avplay || !Number.isFinite(seconds) || seconds < 0) return;
    const target = this.durationSeconds > 0
      ? Math.min(seconds, Math.max(0, this.durationSeconds - 0.1))
      : seconds;
    // Report the requested position straight away: relative seeks (each
    // FF/RW press) chain from it, and the seek bar doesn't jump back to the
    // old position while the native seek runs.
    this.currentTimeSeconds = target;
    // …and show it on the seek bar now, since time updates are held while
    // the seek runs. Not for the load-time seek: playback hasn't reported yet
    // and the player UI is still in its loading state.
    if (this.lastTimeUpdateAt > 0) {
      this.lastTimeUpdateAt = Date.now();
      this.handlers?.onTimeUpdate(target, this.durationSeconds, this.bufferedSeconds);
    }
    const targetMs = Math.round(target * 1000);
    // One native seek at a time. A burst of FF/RW presses issues a seek per
    // press, and a seekTo issued while another is still running can fail on
    // AVPlay. The newest target waits and runs as soon as the current lands.
    if (this.seekInFlight) {
      this.queuedSeekMs = targetMs;
      return;
    }
    // Before playback reports (load-time resume, the resume prompt, start
    // over) the seek must land before the play() that follows it.
    if (this.lastTimeUpdateAt === 0 || options?.immediate) {
      this.runSeek(targetMs);
      return;
    }
    this.queuedSeekMs = targetMs;
    if (this.seekCoalesceTimer) clearTimeout(this.seekCoalesceTimer);
    this.seekCoalesceTimer = setTimeout(() => {
      this.seekCoalesceTimer = null;
      const next = this.queuedSeekMs;
      this.queuedSeekMs = null;
      if (next !== null) this.runSeek(next);
    }, SEEK_COALESCE_MS);
  }

  private runSeek(targetMs: number): void {
    const avplay = this.avplay;
    if (!avplay || this.destroyed) return;
    this.seekInFlight = true;
    const beforePlayback = this.lastTimeUpdateAt === 0;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (this.seekSettleTimer) clearTimeout(this.seekSettleTimer);
      this.seekSettleTimer = null;
      this.seekInFlight = false;
      const next = this.queuedSeekMs;
      this.queuedSeekMs = null;
      if (next !== null && next !== targetMs) this.runSeek(next);
    };
    // A failed seek leaves playback running where it was. It used to be
    // reported as a playback error, which engine recovery answers by
    // reloading the whole session — a visible restart for a missed seek.
    const fail = (error: unknown) => {
      logger.warn('[TizenAVPlayAdapter] Seek failed; playback continues', { targetMs, error: errorMessage(error) });
      // The resume seek fails when the target segment is slow to arrive
      // (blocked 5.2s then failed on a Tizen 8 TV): the movie then restarted
      // from 0. Retry once playback is running instead of losing the position.
      if (beforePlayback) this.resumeRetryMs = targetMs;
      settle();
    };
    this.seekSettleTimer = setTimeout(settle, SEEK_SETTLE_TIMEOUT_MS);
    try {
      avplay.seekTo(targetMs, settle, fail);
    } catch (error) {
      fail(error);
    }
  }

  setQuality(qualityId: number): void {
    const bandwidth = qualityId === -1
      ? null
      : this.variants.find((variant) => variant.bandwidth === qualityId)?.bandwidth ?? null;
    if (!this.avplay || bandwidth === this.fixedBandwidth) return;
    this.fixedBandwidth = bandwidth;
    this.qualitySwitch = this.qualitySwitch.then(() => this.reopenAtCurrentPosition());
  }

  /**
   * AVPlay fixes its bitrate range at prepare (ADAPTIVE_INFO, see openSession),
   * so a quality change reopens the session where playback was.
   */
  private async reopenAtCurrentPosition(): Promise<void> {
    const avplay = this.avplay;
    if (!avplay || this.destroyed) return;
    const position = this.getCurrentTime();
    const wasPaused = this.isPaused();
    this.handlers?.onBufferingStart(position);
    try {
      this.safeCloseExistingSession();
      this.openSession(avplay, this.sessionUrl(), this.drmConfig);
      await this.prepareAsync(avplay);
      if (this.destroyed) return;
      this.tracks = avplay.getTotalTrackInfo() ?? [];
      if (this.selectedTextIndex !== null) {
        avplay.setSelectTrack('TEXT', this.selectedTextIndex);
        avplay.setSilentSubtitle?.(false);
      }
      if (this.selectedAudioIndex !== null && this.tracks.filter((track) => track.type === 'AUDIO').length > 1) {
        avplay.setSelectTrack('AUDIO', this.selectedAudioIndex);
      }
      // Before the first time report, seek() runs at once, ahead of play().
      this.lastTimeUpdateAt = 0;
      if (position > 0) this.seek(position);
      if (!wasPaused) this.play();
      this.handlers?.onBufferingEnd(position);
    } catch (error) {
      if (!this.destroyed) this.reportError('AVPLAY_QUALITY_SWITCH_FAILED', error, true);
    }
  }

  setAudioTrack(trackId: number): void {
    const track = this.tracks.find((item) => item.type === 'AUDIO' && item.index === trackId);
    if (!this.avplay || !track) return;
    try {
      this.avplay.setSelectTrack('AUDIO', track.index);
      this.selectedAudioIndex = track.index;
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] Unable to select audio track', { trackId, error });
    }
  }

  setSubtitleTrack(trackId: number): void {
    const avplay = this.avplay;
    if (!avplay) return;
    let wasPlaying = false;
    try {
      wasPlaying = avplay.getState() === 'PLAYING';
      if (trackId === -1) {
        avplay.setSilentSubtitle?.(true);
        this.selectedTextIndex = null;
      } else {
        const track = this.tracks.find((item) => item.type === 'TEXT' && item.index === trackId);
        if (!track) return;
        avplay.setSelectTrack('TEXT', track.index);
        avplay.setSilentSubtitle?.(false);
        this.selectedTextIndex = track.index;
      }
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] Unable to select subtitle track', { trackId, error });
    }
    // A text-track switch can leave AVPlay paused (reported as "subtitles pause
    // the video"); it never says so, so check and carry on playing.
    if (wasPlaying) {
      setTimeout(() => {
        try {
          if (this.avplay === avplay && !this.destroyed && avplay.getState() === 'PAUSED') avplay.play();
        } catch {
          // Session closed meanwhile.
        }
      }, 500);
    }
  }

  setCaptionSize(): void {
    // Native AVPlay subtitle styling is controlled by the TV accessibility UI.
  }

  setVolume(volume: number): void {
    const audio = window.tizen?.tvaudiocontrol;
    if (!audio) return;
    try {
      const normalized = Math.max(0, Math.min(1, volume));
      // AVPlay has no per-stream gain API. Map only mute state here; changing
      // the TV's global volume during player initialization would be surprising.
      // destroy() restores the TV's own mute state afterwards.
      const mute = normalized === 0;
      if (audio.isMute() === mute) return;
      audio.setMute(mute);
      this.changedTvMute = true;
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] TV audio control failed', { error });
    }
  }

  setPlaybackSpeed(speed: PlaybackSpeed): boolean {
    if (!this.avplay?.setSpeed || !TIZEN_AVPLAY_CAPABILITIES.playbackSpeeds.includes(speed)) {
      return false;
    }
    // A new session already plays at 1x. The player re-applies the saved
    // speed on every start, and that native call blocked ~4s on a Tizen 8 TV
    // right before play().
    if (speed === this.playbackSpeed) return true;
    try {
      this.avplay.setSpeed(speed);
      this.playbackSpeed = speed;
      return true;
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] Playback speed is unsupported on this TV', { speed, error });
      return false;
    }
  }

  getQualities(): QualityOption[] {
    return [
      { id: -1, label: 'Auto', height: null, bitrate: null, isAuto: true },
      ...this.variants.map((variant) => ({
        id: variant.bandwidth,
        label: `${variant.height}p`,
        height: variant.height,
        bitrate: variant.bandwidth,
        isAuto: false,
      })),
    ];
  }

  getAudioTracks(): AudioTrack[] {
    return this.tracks.filter((track) => track.type === 'AUDIO').map((track, position) => {
      const info = parseTrackInfo(track);
      const language = info.language ?? 'und';
      return {
        id: track.index,
        language,
        label: info.title ?? info.label ?? (language === 'und' ? `Audio ${position + 1}` : language.toUpperCase()),
        isActive: track.index === this.selectedAudioIndex,
      };
    });
  }

  getSubtitleTracks(): SubtitleTrack[] {
    return this.tracks.filter((track) => track.type === 'TEXT').map((track, position) => {
      const info = parseTrackInfo(track);
      const language = info.language ?? 'und';
      return {
        id: track.index,
        language,
        label: info.title ?? info.label ?? (language === 'und' ? `Subtitle ${position + 1}` : language.toUpperCase()),
        isActive: track.index === this.selectedTextIndex,
      };
    });
  }

  getCurrentTime(): number {
    // Mid-seek the native clock still reads the pre-seek position.
    if (!this.avplay || this.seeking) return this.currentTimeSeconds;
    try {
      const state = this.avplay.getState();
      if (state !== 'NONE' && state !== 'IDLE') {
        this.currentTimeSeconds = Math.max(0, this.avplay.getCurrentTime() / 1000);
      }
    } catch {
      // Keep the last native callback value during state transitions.
    }
    return this.currentTimeSeconds;
  }

  getDuration(): number {
    return this.durationSeconds;
  }

  isPaused(): boolean {
    if (!this.avplay) return true;
    try {
      return this.avplay.getState() !== 'PLAYING';
    } catch {
      return true;
    }
  }

  isEnded(): boolean {
    return this.ended;
  }

  getCapabilities(): PlayerCapabilities {
    return TIZEN_AVPLAY_CAPABILITIES;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    window.removeEventListener('resize', this.updateDisplayRect);
    document.removeEventListener('fullscreenchange', this.updateDisplayRect);
    window.removeEventListener('pagehide', this.handlePageHide);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.seekSettleTimer) clearTimeout(this.seekSettleTimer);
    this.seekSettleTimer = null;
    if (this.seekCoalesceTimer) clearTimeout(this.seekCoalesceTimer);
    this.seekCoalesceTimer = null;
    this.seekInFlight = false;
    this.queuedSeekMs = null;
    this.resumeRetryMs = null;
    this.suspendedForBackground = false;

    // The player's mute control can only reach the TV's global mute; leaving
    // the player must hand the TV back exactly as the user had it.
    if (this.changedTvMute && this.initialTvMute !== null) {
      try {
        window.tizen?.tvaudiocontrol?.setMute(this.initialTvMute);
      } catch (error) {
        logger.warn('[TizenAVPlayAdapter] Restoring TV mute failed', { error });
      }
    }
    this.changedTvMute = false;

    if (this.avplay) {
      // close() stops playback itself. A separate stop() first measured
      // 0.7-1.2s of extra blocking on a Tizen 8 TV — on every exit from the player.
      try {
        if (this.avplay.getState() !== 'NONE') this.avplay.close();
      } catch (error) {
        logger.warn('[TizenAVPlayAdapter] AVPlay close failed during cleanup', { error });
      }
    }

    this.objectEl?.remove();
    document.documentElement.classList.remove(TIZEN_VIDEO_FULLSCREEN_CLASS);
    if (this.videoEl) this.videoEl.style.visibility = this.previousVideoVisibility;

    // Restore original background colors on ancestors
    for (const [elem, originalBg] of this.originalBackgrounds.entries()) {
      try {
        elem.style.backgroundColor = originalBg;
      } catch {}
    }
    this.originalBackgrounds.clear();

    this.avplay = null;
    this.videoEl = null;
    this.container = null;
    this.objectEl = null;
    this.handlers = null;
    this.tracks = [];
    logger.info('[TizenAVPlayAdapter] Destroyed');
  }

  private readonly handlePageHide = (): void => {
    void this.destroy();
  };

  // Samsung multitasking: hand the decoder back while the app is hidden
  // (Home, input switch) and take it again on return, so the TV can't
  // reclaim it from under a paused session. The player has already paused
  // itself by then (RemoteManager → tv-media-pause).
  private readonly handleVisibilityChange = (): void => {
    const avplay = this.avplay;
    if (!avplay || this.destroyed) return;
    try {
      if (document.hidden) {
        if (avplay.suspend && avplay.getState() !== 'NONE' && avplay.getState() !== 'IDLE') {
          avplay.suspend();
          this.suspendedForBackground = true;
        }
      } else if (this.suspendedForBackground) {
        this.suspendedForBackground = false;
        avplay.restore?.();
      }
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] Multitasking suspend/restore failed', { error });
    }
  };

  private readTvMute(): boolean | null {
    try {
      return window.tizen?.tvaudiocontrol?.isMute() ?? null;
    } catch {
      return null;
    }
  }

  /**
   * prepareAsync keeps the page responsive while the manifest (and any DRM
   * license) loads — prepare() blocks the whole UI, loading spinner and Back
   * key included, for that entire time. prepare() stays as the fallback, on a
   * fresh session, for firmware where prepareAsync never reports back at all.
   */
  private async openAndPrepare(avplay: SamsungAVPlay, url: string, drmConfig: DrmConfig | null): Promise<void> {
    this.safeCloseExistingSession();
    this.openSession(avplay, url, drmConfig);
    try {
      await this.prepareAsync(avplay);
    } catch (error) {
      if (this.destroyed || !(error instanceof PrepareTimeoutError)) throw error;
      logger.warn('[TizenAVPlayAdapter] prepareAsync never reported; retrying with synchronous prepare');
      this.safeCloseExistingSession();
      this.openSession(avplay, url, drmConfig);
      avplay.prepare();
    }
    if (this.destroyed) {
      throw new Error('AVPlay was destroyed while preparing');
    }
  }

  /** The master, or while muxedAudioOnly the chosen variant's own playlist. */
  private sessionUrl(): string {
    if (!this.muxedAudioOnly) return this.manifestUrl;
    const bandwidth = this.fixedBandwidth ?? this.autoBandwidth;
    return this.variants.find((variant) => variant.bandwidth === bandwidth)?.url ?? this.manifestUrl;
  }

  /** An audio track exists but AVPlay selected none. */
  private isAudioMissing(avplay: SamsungAVPlay): boolean {
    if (!this.tracks.some((track) => track.type === 'AUDIO')) return false;
    try {
      const current = avplay.getCurrentStreamInfo?.();
      return !!current && !current.some((track) => track.type === 'AUDIO');
    } catch {
      return false;
    }
  }

  /**
   * shortcut: a variant playlist has no adaptive switching, so Auto takes the
   * best variant within a third of AVPlay's first estimate (it read 3.2 Mbps
   * on a ~1.2 Mbps TV link). Gone once that content is repackaged.
   */
  private pickStartBandwidth(avplay: SamsungAVPlay): number {
    let estimate = 0;
    try {
      estimate = Number(avplay.getStreamingProperty?.('CURRENT_BANDWIDTH')) || 0;
    } catch {
      // Unknown estimate: lowest variant.
    }
    const fitting = this.variants.find((variant) => variant.bandwidth <= estimate / 3);
    return (fitting ?? this.variants[this.variants.length - 1]).bandwidth;
  }

  private openSession(avplay: SamsungAVPlay, manifestUrl: string, drmConfig: DrmConfig | null): void {
    avplay.open(manifestUrl);
    avplay.setListener(this.createListener());
    try {
      this.updateDisplayRect();
    } catch (e) {
      logger.warn('[TizenAVPlayAdapter] Initial setDisplayRect failed', { error: e });
    }
    try {
      avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
    } catch (e) {
      logger.warn('[TizenAVPlayAdapter] setDisplayMethod failed', { error: e });
    }
    try {
      // Must be set before prepare; optional on older firmware.
      avplay.setBufferingParam?.('PLAYER_BUFFER_FOR_RESUME', 'PLAYER_BUFFER_SIZE_IN_SECOND', RESUME_BUFFER_SECONDS);
    } catch (e) {
      logger.warn('[TizenAVPlayAdapter] setBufferingParam failed', { error: e });
    }
    // A variant playlist (muxedAudioOnly) has one bitrate: nothing to pin.
    if (this.fixedBandwidth !== null && !this.muxedAudioOnly) {
      try {
        // Pins one variant (bps; a Tizen 8 TV ignored the same values in kbps).
        const bandwidth = this.fixedBandwidth;
        avplay.setStreamingProperty?.('ADAPTIVE_INFO', `BITRATES=${bandwidth}~${bandwidth}|STARTBITRATE=${bandwidth}`);
      } catch (e) {
        logger.warn('[TizenAVPlayAdapter] Pinning quality failed; playing Auto', { error: e });
      }
    }
    this.configureDrm(drmConfig);
  }

  private prepareAsync(avplay: SamsungAVPlay): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.nativeActivityAt = Date.now();
      const check = () => {
        const idleMs = Date.now() - this.nativeActivityAt;
        if (idleMs >= PREPARE_ASYNC_TIMEOUT_MS) reject(new PrepareTimeoutError());
        else prepareTimeout = setTimeout(check, PREPARE_ASYNC_TIMEOUT_MS - idleMs);
      };
      let prepareTimeout = setTimeout(check, PREPARE_ASYNC_TIMEOUT_MS);
      avplay.prepareAsync(
        () => {
          clearTimeout(prepareTimeout);
          resolve();
        },
        (error) => {
          clearTimeout(prepareTimeout);
          reject(new Error(`AVPlay prepare failed: ${errorMessage(error)}`));
        },
      );
    });
  }

  private createNativeVideoObject(): void {
    if (!this.container) return;
    const object = document.createElement('object');
    object.id = 'av-player';
    object.type = 'application/avplayer';
    object.tabIndex = -1;
    Object.assign(object.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      pointerEvents: 'none',
      backgroundColor: 'transparent',
    });
    this.container.prepend(object);
    this.objectEl = object;
  }

  private safeCloseExistingSession(): void {
    if (!this.avplay) return;
    try {
      const state = this.avplay.getState();
      if (state === 'PLAYING' || state === 'PAUSED' || state === 'READY') this.avplay.stop();
      if (this.avplay.getState() !== 'NONE') this.avplay.close();
    } catch {
      // No previous session, or an older device rejected a redundant close.
    }
  }

  private readonly updateDisplayRect = (): void => {
    if (!this.avplay || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const viewportWidth = window.innerWidth || TIZEN_LOGICAL_WIDTH;
    const viewportHeight = window.innerHeight || TIZEN_LOGICAL_HEIGHT;

    // Fall back to full screen coordinates (1920x1080) if DOM bounding box has not yet computed layout
    let x = 0;
    let y = 0;
    let width = TIZEN_LOGICAL_WIDTH;
    let height = TIZEN_LOGICAL_HEIGHT;

    if (rect.width > 50 && rect.height > 50 && viewportWidth > 0 && viewportHeight > 0) {
      x = Math.max(0, Math.round((rect.left / viewportWidth) * TIZEN_LOGICAL_WIDTH));
      y = Math.max(0, Math.round((rect.top / viewportHeight) * TIZEN_LOGICAL_HEIGHT));
      width = Math.max(1, Math.round((rect.width / viewportWidth) * TIZEN_LOGICAL_WIDTH));
      height = Math.max(1, Math.round((rect.height / viewportHeight) * TIZEN_LOGICAL_HEIGHT));
    }

    try {
      this.avplay.setDisplayRect(x, y, width, height);
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] setDisplayRect failed', { error });
    }
  };

  private createListener() {
    return {
      onbufferingstart: () => {
        this.nativeActivityAt = Date.now();
        this.handlers?.onBufferingStart(this.getCurrentTime());
      },
      onbufferingprogress: (percent: number) => {
        this.nativeActivityAt = Date.now();
        this.bufferedSeconds = this.durationSeconds * Math.max(0, Math.min(100, percent)) / 100;
      },
      onbufferingcomplete: () => {
        this.nativeActivityAt = Date.now();
        this.handlers?.onBufferingEnd(this.getCurrentTime());
      },
      oncurrentplaytime: (milliseconds: number) => {
        // While a native seek runs AVPlay still reports pre-seek positions;
        // passing them on made the seek bar jump back, then forward again.
        if (this.seeking) return;
        if (this.resumeRetryMs !== null) {
          const retryMs = this.resumeRetryMs;
          this.resumeRetryMs = null;
          this.lastTimeUpdateAt = Date.now(); // playing now: a failed retry isn't retried again
          this.seek(retryMs / 1000, { immediate: true });
          return;
        }
        this.currentTimeSeconds = milliseconds / 1000;
        const now = Date.now();
        if (now - this.lastTimeUpdateAt < TIME_UPDATE_INTERVAL_MS) return;
        this.lastTimeUpdateAt = now;
        this.handlers?.onTimeUpdate(this.currentTimeSeconds, this.durationSeconds, this.bufferedSeconds);
      },
      onstreamcompleted: () => {
        this.ended = true;
        this.currentTimeSeconds = this.durationSeconds;
        this.handlers?.onEnded(this.durationSeconds);
      },
      onerror: (eventType: string) => this.reportError(eventType, eventType, true),
      onerrormsg: (eventType: string, message: string) => this.reportError(eventType, message, true),
    };
  }

  private syncSelectedTracks(): void {
    try {
      const current = this.avplay?.getCurrentStreamInfo?.() ?? [];
      this.selectedAudioIndex = current.find((track) => track.type === 'AUDIO')?.index
        ?? this.tracks.find((track) => track.type === 'AUDIO')?.index
        ?? null;
      this.selectedTextIndex = current.find((track) => track.type === 'TEXT')?.index ?? null;
    } catch {
      this.selectedAudioIndex = this.tracks.find((track) => track.type === 'AUDIO')?.index ?? null;
    }
  }

  private configureDrm(config: DrmConfig | null): void {
    if (!config || !this.avplay?.setDrm) return;
    if (config.type === 'fairplay') {
      throw new Error('FairPlay is not supported by Samsung Tizen AVPlay');
    }

    const drmType = config.type === 'playready' ? 'PLAYREADY' : 'WIDEVINE_CDM';
    const properties: Record<string, unknown> = {
      LicenseServer: config.licenseUrl,
      DeleteLicenseAfterUse: true,
    };
    if (config.customData) properties.CustomData = config.customData;
    if (config.headers) properties.HttpHeader = config.headers;
    this.avplay.setDrm(drmType, 'SetProperties', JSON.stringify(properties));
  }

  private reportError(code: string, error: unknown, recoverable: boolean): void {
    if (this.destroyed) return;
    const message = errorMessage(error);
    logger.error('[TizenAVPlayAdapter] Playback error', { code, message });
    this.handlers?.onError({
      code,
      message,
      adapter: this.name,
      isRecoverable: recoverable,
      originalError: error instanceof Error ? error : new Error(message),
    });
  }
}
