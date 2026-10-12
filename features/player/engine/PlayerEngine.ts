/**
 * Player Engine
 *
 * Orchestrates adapters, events, session, and recovery.
 * Adapters are isolated — none knows about another.
 */

import { logger } from '@lib/logger/logger';
import { ShakaAdapter } from './ShakaAdapter';
import { TizenAVPlayAdapter } from './TizenAVPlayAdapter';
import { isTizen } from '@/src/platform/detectPlatform';
import { PlaybackRecoveryManager } from './PlaybackRecoveryManager';
import { SessionManager } from './SessionManager';
import { PlayerEventBus } from './PlayerEventBus';
import type {
  PlayerAdapter,
  AdapterName,
  VideoDetails,
  PlayerError,
  QualityOption,
  AudioTrack,
  SubtitleTrack,
  PlaybackSpeed,
  PlayerLoadOptions,
  CaptionSize,
  PlayerAdapterEventHandlers,
  PlayerCapabilities,
} from '../model/types';

export class PlayerEngine {
  readonly eventBus: PlayerEventBus;

  private adapter: PlayerAdapter | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private video: VideoDetails | null = null;
  private recoveryManager: PlaybackRecoveryManager;
  private sessionManager: SessionManager;
  private bufferStartTime: number | null = null;
  private readonly nativeListeners: (() => void)[] = [];
  private loadOptions: PlayerLoadOptions = {};
  /** Set to true once destroy() is called — prevents ghost callbacks from operating */
  private destroyed = false;
  private hasFatalError = false;

  // Shaka remains the default. AVPlay is selected only on a real Tizen runtime.
  private readonly shakaAdapter = new ShakaAdapter();

  constructor() {
    this.eventBus = new PlayerEventBus();
    this.recoveryManager = new PlaybackRecoveryManager(this.eventBus);
    this.sessionManager = new SessionManager(this.eventBus);
  }

  /**
   * Initialize with a video element and load content.
   */
  async initialize(
    videoEl: HTMLVideoElement,
    video: VideoDetails,
    options?: PlayerLoadOptions
  ): Promise<void> {
    this.destroyed = false;
    this.videoEl = videoEl;
    this.video = video;
    this.loadOptions = options ?? {};
    this.hasFatalError = false;

    this.clearNativeListeners();
    this.recoveryManager.reset();
    this.sessionManager.startSession(video.contentId);

    await this.loadAdapter(videoEl, video);
  }

  // ── Playback controls ────────────────────────────────────────────────────

  play(): void {
    if (this.destroyed) return;
    this.adapter?.play();
  }

  pause(): void {
    if (this.destroyed) return;
    this.adapter?.pause();
  }

  seek(seconds: number): void {
    const from = this.getCurrentTime();
    this.adapter?.seek(seconds);
    this.eventBus.emit('SEEK', { from, to: seconds });
  }

  setQuality(qualityId: number): void {
    if (!this.adapter || !this.video) return;
    if (this.getCapabilities().qualitySelection === 'auto-only' && qualityId !== -1) {
      logger.warn('[PlayerEngine] Ignoring unsupported manual quality selection', {
        adapter: this.adapter.name,
        qualityId,
      });
      return;
    }
    const oldQuality = this.getActiveQualityLabel();
    this.adapter.setQuality(qualityId);
    const newQuality = qualityId === -1 ? 'Auto' : `${qualityId}`;
    this.eventBus.emit('QUALITY_CHANGED', {
      oldQuality,
      newQuality,
      isAuto: qualityId === -1,
    });
  }

  setAudioTrack(trackId: number): void {
    if (!this.adapter) return;
    const tracks = this.adapter.getAudioTracks();
    const oldTrack = tracks.find((t) => t.isActive)?.language ?? 'unknown';
    this.adapter.setAudioTrack(trackId);
    const newTrack = tracks.find((track) => track.id === trackId)?.language ?? 'unknown';
    this.eventBus.emit('AUDIO_CHANGED', {
      oldLanguage: oldTrack,
      newLanguage: newTrack,
    });
  }

  setSubtitleTrack(trackId: number): void {
    if (!this.adapter) return;
    const tracks = this.adapter.getSubtitleTracks();
    const oldTrack = tracks.find((t) => t.isActive)?.language ?? 'off';
    this.adapter.setSubtitleTrack(trackId);
    const newTrack = trackId === -1
      ? 'off'
      : (tracks.find((track) => track.id === trackId)?.language ?? 'off');
    this.eventBus.emit('SUBTITLE_CHANGED', {
      oldSubtitle: oldTrack,
      newSubtitle: newTrack,
    });
  }

  setCaptionSize(size: CaptionSize): void {
    this.loadOptions = { ...this.loadOptions, captionSize: size };
    if (this.getCapabilities().captionStyling) this.adapter?.setCaptionSize(size);
  }

  setVolume(volume: number): void {
    if (!this.adapter) return;
    const mode = this.getCapabilities().volumeControl;
    if (mode === 'none') return;
    this.adapter.setVolume(mode === 'mute-only' ? (volume === 0 ? 0 : 1) : volume);
  }

  setPlaybackSpeed(speed: PlaybackSpeed): boolean {
    if (!this.adapter || !this.getCapabilities().playbackSpeeds.includes(speed)) return false;
    return this.adapter.setPlaybackSpeed(speed);
  }

  getQualities(): QualityOption[] {
    return this.adapter?.getQualities() ?? [];
  }

  getAudioTracks(): AudioTrack[] {
    return this.adapter?.getAudioTracks() ?? [];
  }

  getSubtitleTracks(): SubtitleTrack[] {
    return this.adapter?.getSubtitleTracks() ?? [];
  }

  getCurrentTime(): number {
    return this.adapter?.getCurrentTime() ?? this.videoEl?.currentTime ?? 0;
  }

  getDuration(): number {
    return this.adapter?.getDuration() ?? this.videoEl?.duration ?? 0;
  }

  isPaused(): boolean {
    return this.adapter?.isPaused() ?? this.videoEl?.paused ?? true;
  }

  isEnded(): boolean {
    return this.adapter?.isEnded() ?? this.videoEl?.ended ?? false;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getActiveAdapterName(): AdapterName | null {
    return this.adapter?.name ?? null;
  }

  getCapabilities(): PlayerCapabilities {
    return this.adapter?.getCapabilities() ?? this.shakaAdapter.getCapabilities();
  }

  /**
   * Destroy the engine — clean up everything.
   */
  async destroy(): Promise<void> {
    this.destroyed = true;

    // CRITICAL: Stop playback immediately — pause + detach src + load()
    // forces the browser to release the media pipeline synchronously.
    // This prevents audio leaking while Shaka's async destroy() runs.
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.removeAttribute('src');
      this.videoEl.load();
    }

    this.clearNativeListeners();

    if (this.adapter) {
      const a = this.adapter;
      this.adapter = null;
      await a.destroy();
    }

    this.sessionManager.stopSession();
    this.eventBus.destroy();

    this.videoEl = null;
    this.video = null;
    this.hasFatalError = false;
    this.isRecovering = false;

    logger.info('[PlayerEngine] Destroyed');
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private isRecovering = false;

  private async loadAdapter(
    videoEl: HTMLVideoElement,
    video: VideoDetails
  ): Promise<void> {
    logger.info('[PlayerEngine] loadAdapter called', {
      manifestUrl: video.manifestUrl,
      streamFormat: video.streamFormat,
    });

    if (isTizen() && TizenAVPlayAdapter.isAvailable()) {
      const avplayAdapter = new TizenAVPlayAdapter();
      if (avplayAdapter.canPlay(video.manifestUrl, video.streamFormat)) {
        logger.info('[PlayerEngine] Loading Samsung AVPlay adapter');
        try {
          await avplayAdapter.load(
            videoEl,
            video.manifestUrl,
            video.drmConfig,
            this.loadOptions,
          );
          avplayAdapter.setEventHandlers(this.createAdapterEventHandlers());
          this.adapter = avplayAdapter;
          this.eventBus.emit('DURATION_CHANGE', { duration: avplayAdapter.getDuration() });
          logger.info('[PlayerEngine] Samsung AVPlay adapter loaded');
          return;
        } catch (error) {
          await avplayAdapter.destroy();
          logger.warn('[PlayerEngine] AVPlay load failed; falling back to Shaka', { error });
        }
      }
    }

    const adapter = this.shakaAdapter;

    if (!adapter.canPlay(video.manifestUrl, video.streamFormat)) {
      throw new Error(
        `PlayerEngine: Shaka cannot play this content (format=${video.streamFormat})`
      );
    }

    logger.info('[PlayerEngine] Loading Shaka adapter');
    this.attachNativeListeners(videoEl);

    // Wrap adapter load in a timeout to prevent infinite hangs if manifest or
    // segment requests get stalled by CORS or SSL protocol errors.
    // Budget: ~4s dynamic import (dev) + 8s manifest timeout × 2 retries = ~20s
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      adapter.load(
        videoEl,
        video.manifestUrl,
        video.drmConfig,
        this.loadOptions
      ),
      new Promise<void>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Shaka adapter load timeout (20s)'));
        }, 20000);
      })
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });

    this.adapter = adapter;
    logger.info('[PlayerEngine] Shaka adapter loaded');
  }

  private clearNativeListeners(): void {
    for (const cleanup of this.nativeListeners) cleanup();
    this.nativeListeners.length = 0;
  }

  private createAdapterEventHandlers(): PlayerAdapterEventHandlers {
    return {
      onPlay: (position) => {
        if (this.destroyed) return;
        this.sessionManager.onPlay();
        this.eventBus.emit('PLAY', { position });
      },
      onPause: (position) => {
        if (this.destroyed) return;
        this.sessionManager.onPause();
        this.eventBus.emit('PAUSE', { position });
      },
      onBufferingStart: (position) => {
        if (this.destroyed) return;
        this.bufferStartTime = Date.now();
        this.eventBus.emit('BUFFER_START', { position });
      },
      onBufferingEnd: (position) => {
        if (this.destroyed) return;
        const bufferingDurationMs = this.bufferStartTime === null
          ? 0
          : Date.now() - this.bufferStartTime;
        this.bufferStartTime = null;
        this.eventBus.emit('BUFFER_END', { position, bufferingDurationMs });
      },
      onTimeUpdate: (currentTime, duration, buffered) => {
        if (this.destroyed) return;
        this.eventBus.emit('TIME_UPDATE', { currentTime, duration, buffered });
        if (duration > 0) this.sessionManager.updateProgress((currentTime / duration) * 100);
      },
      onDurationChange: (duration) => {
        if (!this.destroyed) this.eventBus.emit('DURATION_CHANGE', { duration });
      },
      onEnded: (durationSeconds) => {
        if (this.destroyed) return;
        const watchDurationSeconds = this.sessionManager.getWatchDurationSeconds();
        this.sessionManager.markCompleted();
        this.eventBus.emit('CONTENT_ENDED', { durationSeconds, watchDurationSeconds });
      },
      onError: (error) => { void this.handleError(error); },
    };
  }

  private attachNativeListeners(videoEl: HTMLVideoElement): void {
    const add = <K extends keyof HTMLVideoElementEventMap>(
      event: K,
      handler: (e: HTMLVideoElementEventMap[K]) => void
    ) => {
      videoEl.addEventListener(event, handler);
      this.nativeListeners.push(() =>
        videoEl.removeEventListener(event, handler)
      );
    };

    add('play', () => {
      this.sessionManager.onPlay();
      this.eventBus.emit('PLAY', { position: videoEl.currentTime });
    });

    add('pause', () => {
      this.sessionManager.onPause();
      this.eventBus.emit('PAUSE', { position: videoEl.currentTime });
    });

    add('waiting', () => {
      this.bufferStartTime = Date.now();
      this.eventBus.emit('BUFFER_START', { position: videoEl.currentTime });
    });

    add('playing', () => {
      const bufferingMs =
        this.bufferStartTime !== null
          ? Date.now() - this.bufferStartTime
          : 0;
      this.bufferStartTime = null;
      this.eventBus.emit('BUFFER_END', {
        position: videoEl.currentTime,
        bufferingDurationMs: bufferingMs,
      });
    });

    add('ended', () => {
      const watchDuration = this.sessionManager.getWatchDurationSeconds();
      this.sessionManager.markCompleted();
      this.eventBus.emit('CONTENT_ENDED', {
        durationSeconds: videoEl.duration,
        watchDurationSeconds: watchDuration,
      });
    });

    add('timeupdate', () => {
      const buffered =
        videoEl.buffered.length > 0
          ? videoEl.buffered.end(videoEl.buffered.length - 1)
          : 0;
      this.eventBus.emit('TIME_UPDATE', {
        currentTime: videoEl.currentTime,
        duration: videoEl.duration,
        buffered,
      });

      // Update session progress
      if (videoEl.duration > 0) {
        const pct = (videoEl.currentTime / videoEl.duration) * 100;
        this.sessionManager.updateProgress(pct);
      }
    });

    add('durationchange', () => {
      this.eventBus.emit('DURATION_CHANGE', { duration: videoEl.duration });
    });

    add('error', () => {
      const isSeeking = videoEl.seeking || this.shakaAdapter.isRecentlySeeked(4000);
      // Ignore transient errors when engine is destroyed, already fatal, or actively/recently seeking
      if (this.destroyed || this.hasFatalError || isSeeking) {
        logger.warn('[PlayerEngine] Suppressing error event (destroyed, fatal, or seek active/recent)', {
          destroyed: this.destroyed,
          hasFatalError: this.hasFatalError,
          seeking: videoEl.seeking,
          recentlySeeked: this.shakaAdapter.isRecentlySeeked(4000),
        });
        return;
      }

      const mediaError = videoEl.error;
      const err: PlayerError = {
        code: `MEDIA_ERROR_${mediaError?.code ?? 0}`,
        message: mediaError?.message ?? 'Unknown media error',
        adapter: this.adapter?.name ?? 'unknown',
        isRecoverable: true,
        originalError: new Error(mediaError?.message ?? 'Media error'),
      };

      void this.handleError(err);
    });
  }

  private async handleError(error: PlayerError): Promise<void> {
    if (this.destroyed || this.hasFatalError || this.isRecovering) {
      logger.warn('[PlayerEngine] Skipping duplicate or invalid recovery attempt', {
        destroyed: this.destroyed,
        hasFatalError: this.hasFatalError,
        isRecovering: this.isRecovering,
      });
      return;
    }
    if (!this.video || !this.videoEl) return;

    this.isRecovering = true;
    try {
      const currentPosition = this.getCurrentTime();
      const recoveryStartTime = Date.now();
      
      // Notify UI that we are buffering during recovery attempt
      this.eventBus.emit('BUFFER_START', { position: currentPosition });

      const reload = async () => {
        if (!this.video || !this.videoEl) throw new Error('No video');
        if (this.adapter) {
          const a = this.adapter;
          this.adapter = null;
          await a.destroy();
        }
        await this.loadAdapter(this.videoEl, this.video);
        const activeAdapter = this.adapter as PlayerAdapter | null;
        if (currentPosition > 0 && activeAdapter) {
          logger.info('[PlayerEngine] Restoring position on reload', { currentPosition });
          activeAdapter.seek(currentPosition);
          activeAdapter.play();
        }
      };

      const recovered = await this.recoveryManager.attemptRecovery(
        error,
        currentPosition,
        reload
      );

      if (recovered) {
        logger.info('[PlayerEngine] Recovery successful');
        this.eventBus.emit('BUFFER_END', {
          position: this.getCurrentTime() || currentPosition,
          bufferingDurationMs: Date.now() - recoveryStartTime,
        });
      } else {
        logger.error('[PlayerEngine] Recovery failed. Transitioning to fatal error state.');
        this.hasFatalError = true;
        if (this.adapter) {
          const a = this.adapter;
          this.adapter = null;
          await a.destroy();
        }
        this.eventBus.emit('ERROR', { error, position: currentPosition });
      }
    } finally {
      this.isRecovering = false;
    }
  }

  private getActiveQualityLabel(): string {
    if (!this.adapter) return 'unknown';
    const qualities = this.adapter.getQualities();
    const active = qualities.find((q) => !q.isAuto);
    return active?.label ?? 'Auto';
  }
}
