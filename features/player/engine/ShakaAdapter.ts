/**
 * Shaka Player Adapter
 *
 * Wraps shaka-player with lazy dynamic import for performance.
 * Implements PlayerAdapter interface.
 */

import { logger } from '@lib/logger/logger';
import { getCaptionFontScale } from '../constants/player.constants';
import type {
  PlayerAdapter,
  AdapterName,
  QualityOption,
  AudioTrack,
  SubtitleTrack,
  DrmConfig,
  PlaybackSpeed,
  StreamFormat,
  PlayerLoadOptions,
  CaptionSize,
} from '../model/types';

export class ShakaAdapter implements PlayerAdapter {
  readonly name: AdapterName = 'shaka';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private player: any = null;
  private videoEl: HTMLVideoElement | null = null;

  private stablePlaybackTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isStable = false;
  private initialBufferingGoal = 15;

  canPlay(manifestUrl: string, streamFormat: StreamFormat): boolean {
    if (typeof window === 'undefined') {
      logger.info('[ShakaAdapter] canPlay=false: window is undefined (SSR)');
      return false;
    }
    // Shaka Player requires MediaSource support (not available in some browsers e.g. iOS Safari)
    const isMseSupported = 'MediaSource' in window;
    if (!isMseSupported) {
      logger.warn('[ShakaAdapter] canPlay=false: MediaSource not supported');
      return false;
    }

    // Shaka plays HLS and DASH
    const supported = streamFormat === 'hls' || streamFormat === 'dash';
    if (!supported) {
      logger.warn('[ShakaAdapter] canPlay=false: unsupported streamFormat', {
        streamFormat,
        manifestUrl,
      });
    }
    return supported;
  }

  async load(
    videoEl: HTMLVideoElement,
    manifestUrl: string,
    drmConfig: DrmConfig | null,
    options?: PlayerLoadOptions
  ): Promise<void> {
    this.videoEl = videoEl;
    const captionSize = options?.captionSize ?? 'medium';

    // Import mux.js first so Shaka Player can demux MPEG-TS (.ts) HLS streams
    logger.info('[ShakaAdapter] Importing mux.js for TS demuxing...');
    // @ts-ignore
    const muxjs = await import('mux.js').catch((e) => {
      logger.warn('[ShakaAdapter] mux.js import failed — TS demuxing may be unavailable', {
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    });

    if (muxjs && typeof window !== 'undefined') {
      (window as any).muxjs = muxjs.default ?? muxjs;
      (globalThis as any).muxjs = muxjs.default ?? muxjs;
      logger.info('[ShakaAdapter] mux.js attached to window.muxjs');
    }

    // Import the compiled Shaka UMD bundle which sets window.shaka
    // Using the ui bundle gives us the full player including polyfills.
    // Dynamic import ensures it's only loaded client-side.
    logger.info('[ShakaAdapter] Importing shaka-player module...');
    const shakaModule = await import('shaka-player/dist/shaka-player.compiled.js').catch((e) => {
      logger.warn('[ShakaAdapter] compiled.js import failed', {
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    })
      ?? await import('shaka-player').catch((e) => {
        logger.warn('[ShakaAdapter] shaka-player import failed', {
          message: e instanceof Error ? e.message : String(e),
        });
        return null;
      });

    // After import, check for the global set by the UMD bundle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shakaGlobal = (globalThis as any).shaka;

    // Some bundlers expose it as module default instead
    if (!shakaGlobal && shakaModule) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = shakaModule as any;
      shakaGlobal = mod.default ?? mod.shaka ?? mod;
    }

    if (!shakaGlobal?.Player) {
      logger.error('[ShakaAdapter] Shaka global not found after import', {
        hasModule: !!shakaModule,
        hasGlobal: !!(globalThis as any).shaka,
        moduleKeys: shakaModule ? Object.keys(shakaModule).slice(0, 10) : [],
      });
      throw new Error('Shaka Player: global not found after import');
    }

    shakaGlobal.polyfill.installAll();

    if (!shakaGlobal.Player.isBrowserSupported()) {
      throw new Error('Shaka Player: browser not supported');
    }

    this.player = new shakaGlobal.Player();



    if (options?.videoContainer) {
      this.player.setVideoContainer(options.videoContainer);
    }

    await this.player.attach(videoEl);

    // DRM configuration (architecture ready, not required now)
    if (drmConfig) {
      this.configureDrm(drmConfig);
    }

    // ABR configuration
    const connection = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
    const effectiveType = connection?.effectiveType;
    const isSlow = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
    this.initialBufferingGoal = isSlow ? 10 : 15;
    this.isStable = false;

    this.player.configure({
      abr: {
        enabled: true,
        switchInterval: 3,
      },
      manifest: {
        retryParameters: {
          timeout: 10000,          // 10s manifest request timeout (accommodate slow networks)
          stallTimeout: 5000,      // 5s stall timeout
          connectionTimeout: 10000,// 10s connection timeout
          maxAttempts: 5,          // Increased from 2 to 5 for better resilience
          baseDelay: 1000,         // 1s base delay
          backoffFactor: 2,        // Exponential backoff
          fuzzFactor: 0.5,         // Add jitter to avoid synchronized retries
        },
      },
      streaming: {
        bufferingGoal: this.initialBufferingGoal,
        rebufferingGoal: 2,
        bufferBehind: 30,
        retryParameters: {
          timeout: 10000,          // 10s media request timeout
          stallTimeout: 5000,      // 5s stall timeout
          connectionTimeout: 10000,// 10s connection timeout
          maxAttempts: 5,          // Let Shaka retry fetching chunks multiple times
          baseDelay: 1000,
          backoffFactor: 2,
          fuzzFactor: 0.5,
        }
      },
      textDisplayer: {
        fontScaleFactor: getCaptionFontScale(captionSize),
      },
    });

    // Listen for Shaka errors to handle recovery logs gracefully
    this.player.addEventListener('error', (event: any) => {
      const detail = event?.detail;
      const isRecoverable = detail?.severity === shakaGlobal.util.Error.Severity.RECOVERABLE;
      
      const errorLogPayload = {
        code: detail?.code,
        category: detail?.category,
        message: detail?.message ?? String(detail),
        severity: detail?.severity,
        data: detail?.data,
        docLink: `https://shaka-player-demo.appspot.com/docs/api/shaka.util.Error.html#value:${detail?.code}`,
      };

      if (isRecoverable) {
        logger.warn('[ShakaAdapter] Shaka encountered a recoverable error, attempting to fix...', errorLogPayload);
      } else {
        logger.error('[ShakaAdapter] Shaka critical error event during load/playback', errorLogPayload);
      }
    });

    videoEl.addEventListener('playing', this.onPlaying);
    videoEl.addEventListener('waiting', this.onPauseOrWaiting);
    videoEl.addEventListener('pause', this.onPauseOrWaiting);

    const startTime = options?.startTime ?? null;
    logger.info('[ShakaAdapter] Loading manifest', { manifestUrl, startTime });
    await this.player.load(manifestUrl, startTime !== null && startTime > 0 ? startTime : undefined);
    logger.info('[ShakaAdapter] Manifest loaded successfully');
  }

  async destroy(): Promise<void> {
    this.clearStableTimeout();
    if (this.videoEl) {
      this.videoEl.removeEventListener('playing', this.onPlaying);
      this.videoEl.removeEventListener('waiting', this.onPauseOrWaiting);
      this.videoEl.removeEventListener('pause', this.onPauseOrWaiting);
      // Synchronously stop media pipeline BEFORE Shaka's async destroy() runs.
      // Forces browser to release audio/video decoder immediately.
      this.videoEl.pause();
      this.videoEl.removeAttribute('src');
      this.videoEl.load();
    }
    if (this.player) {
      const p = this.player;
      this.player = null;
      try {
        await p.destroy();
      } catch (err) {
        logger.warn('[ShakaAdapter] Error tearing down Shaka instance', { err });
      }
    }
    this.videoEl = null;
    logger.info('[ShakaAdapter] Destroyed');
  }

  play(): void {
    if (!this.videoEl) return;
    this.videoEl.play().catch((err) => {
      logger.warn('[ShakaAdapter] play() rejected, user gesture required to play unmuted', { err });
      // Do not attempt muted fallback so that the video respects the user's unmuted preference.
    });
  }

  pause(): void {
    this.videoEl?.pause();
  }

  private lastSeekTime = 0;

  isRecentlySeeked(withinMs = 4000): boolean {
    return Date.now() - this.lastSeekTime < withinMs;
  }

  seek(seconds: number): void {
    if (!this.videoEl) return;
    if (Number.isNaN(seconds) || seconds < 0) return;
    this.lastSeekTime = Date.now();

    const performSeek = () => {
      if (!this.videoEl) return;
      try {
        const dur = this.videoEl.duration;
        const target = dur > 0 ? Math.min(seconds, dur - 0.1) : seconds;
        this.videoEl.currentTime = target;
        logger.info('[ShakaAdapter] Seek performed', { target });
      } catch (err) {
        logger.warn('[ShakaAdapter] seek failed', { seconds, err });
      }
    };

    if (this.videoEl.readyState >= 1) {
      performSeek();
    } else {
      logger.info('[ShakaAdapter] readyState is 0, deferring seek to loadedmetadata event', { seconds });
      const onMetadata = () => {
        if (this.videoEl) {
          this.videoEl.removeEventListener('loadedmetadata', onMetadata);
          performSeek();
        }
      };
      this.videoEl.addEventListener('loadedmetadata', onMetadata);
    }
  }

  setQuality(qualityId: number): void {
    if (!this.player) return;
    if (qualityId === -1) {
      this.player.configure({ abr: { enabled: true } });
      return;
    }
    this.player.configure({ abr: { enabled: false } });
    const tracks = this.player.getVariantTracks() as {
      id: number;
      active: boolean;
    }[];
    const track = tracks.find((t) => t.id === qualityId);
    if (track) {
      this.player.selectVariantTrack(track, true);
    }
  }

  setAudioTrack(trackId: number): void {
    if (!this.player) return;
    const tracks = this.player.getAudioTracks() as {
      language: string;
      label: string | null;
      active: boolean;
      roles: string[];
    }[];
    const track = tracks[trackId];
    if (track) {
      this.player.selectAudioTrack(track);
    }
  }

  setSubtitleTrack(trackId: number): void {
    if (!this.player) return;
    if (trackId === -1) {
      this.player.selectTextTrack(null);
      if (typeof this.player.setTextVisibility === 'function') {
        this.player.setTextVisibility(false);
      } else if (typeof this.player.setTextTrackVisibility === 'function') {
        this.player.setTextTrackVisibility(false);
      }
      return;
    }
    const tracks = this.player.getTextTracks() as { id: number }[];
    const track = tracks[trackId];
    if (track) {
      this.player.selectTextTrack(track);
      if (typeof this.player.setTextVisibility === 'function') {
        this.player.setTextVisibility(true);
      } else if (typeof this.player.setTextTrackVisibility === 'function') {
        this.player.setTextTrackVisibility(true);
      }
    }
  }

  setCaptionSize(size: CaptionSize): void {
    if (!this.player) return;
    this.player.configure({
      textDisplayer: {
        fontScaleFactor: getCaptionFontScale(size),
      },
    });
  }

  setVolume(volume: number): void {
    if (this.videoEl) {
      this.videoEl.volume = Math.max(0, Math.min(1, volume));
      this.videoEl.muted = volume === 0;
    }
  }

  setPlaybackSpeed(speed: PlaybackSpeed): void {
    if (this.videoEl) {
      this.videoEl.playbackRate = speed;
    }
  }

  getQualities(): QualityOption[] {
    if (!this.player) return [];
    const tracks = this.player.getVariantTracks() as {
      id: number;
      height: number | null;
      bandwidth: number;
      active: boolean;
    }[];

    // Deduplicate by height
    const seen = new Set<number | null>();
    const options: QualityOption[] = [
      {
        id: -1,
        label: 'Auto',
        height: null,
        bitrate: null,
        isAuto: true,
      },
    ];

    const sorted = [...tracks].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

    for (const track of sorted) {
      if (seen.has(track.height)) continue;
      seen.add(track.height);
      options.push({
        id: track.id,
        label: track.height ? `${track.height}p` : 'Unknown',
        height: track.height,
        bitrate: track.bandwidth,
        isAuto: false,
      });
    }

    return options;
  }

  getAudioTracks(): AudioTrack[] {
    if (!this.player) return [];
    const tracks = this.player.getAudioTracks() as {
      language: string;
      label: string | null;
      active: boolean;
    }[];

    return tracks.map((track, index) => ({
      id: index,
      language: track.language,
      label: track.label ?? track.language.toUpperCase(),
      isActive: track.active,
    }));
  }

  getSubtitleTracks(): SubtitleTrack[] {
    if (!this.player) return [];
    const tracks = this.player.getTextTracks() as {
      id: number;
      language: string;
      label: string | null;
      active: boolean;
    }[];

    return tracks.map((track, index) => ({
      id: index,
      language: track.language,
      label: track.label ?? track.language.toUpperCase(),
      isActive: track.active,
    }));
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private readonly onPlaying = (): void => {
    if (this.isStable) return;
    this.clearStableTimeout();
    this.stablePlaybackTimeoutId = setTimeout(() => {
      if (!this.player) return;
      this.isStable = true;
      this.player.configure({
        streaming: {
          bufferingGoal: 30,
        },
      });
      logger.info('[ShakaAdapter] Playback stabilized. Scaled buffering goal to 30s.');
    }, 5000);
  };

  private readonly onPauseOrWaiting = (): void => {
    this.isStable = false;
    this.clearStableTimeout();
    if (this.player) {
      this.player.configure({
        streaming: {
          bufferingGoal: this.initialBufferingGoal,
        },
      });
    }
  };

  private clearStableTimeout(): void {
    if (this.stablePlaybackTimeoutId !== null) {
      clearTimeout(this.stablePlaybackTimeoutId);
      this.stablePlaybackTimeoutId = null;
    }
  }

  private configureDrm(drmConfig: DrmConfig): void {
    if (!this.player) return;
    // Architecture ready — implementation when DRM is required
    logger.info('[ShakaAdapter] DRM config received (not active)', {
      type: drmConfig.type,
    });
  }
}
