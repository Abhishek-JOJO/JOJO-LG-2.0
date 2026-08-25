/**
 * Player Engine
 *
 * Orchestrates adapters, events, session, and recovery.
 * Adapters are isolated — none knows about another.
 */

import { logger } from '@lib/logger/logger';
import { ShakaAdapter } from './ShakaAdapter';
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

  // Single adapter — Shaka handles HLS, DASH, and DRM
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
    this.videoEl = videoEl;
    this.video = video;
    this.loadOptions = options ?? {};
    this.hasFatalError = false;

    this.attachNativeListeners(videoEl);
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
    const from = this.videoEl?.currentTime ?? 0;
    this.adapter?.seek(seconds);
    this.eventBus.emit('SEEK', { from, to: seconds });
  }

  setQuality(qualityId: number): void {
    if (!this.adapter || !this.video) return;
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
    const newTrack = tracks[trackId]?.language ?? 'unknown';
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
    const newTrack = trackId === -1 ? 'off' : (tracks[trackId]?.language ?? 'off');
    this.eventBus.emit('SUBTITLE_CHANGED', {
      oldSubtitle: oldTrack,
      newSubtitle: newTrack,
    });
  }

  setCaptionSize(size: CaptionSize): void {
    this.loadOptions = { ...this.loadOptions, captionSize: size };
    this.adapter?.setCaptionSize(size);
  }

  setVolume(volume: number): void {
    this.adapter?.setVolume(volume);
  }

  setPlaybackSpeed(speed: PlaybackSpeed): void {
    this.adapter?.setPlaybackSpeed(speed);
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
    return this.videoEl?.currentTime ?? 0;
  }

  getDuration(): number {
    return this.videoEl?.duration ?? 0;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getActiveAdapterName(): AdapterName | null {
    return this.adapter?.name ?? null;
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

    for (const cleanup of this.nativeListeners) cleanup();
    this.nativeListeners.length = 0;

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
    const adapter = this.shakaAdapter;

    logger.info('[PlayerEngine] loadAdapter called', {
      manifestUrl: video.manifestUrl,
      streamFormat: video.streamFormat,
    });

    if (!adapter.canPlay(video.manifestUrl, video.streamFormat)) {
      throw new Error(
        `PlayerEngine: Shaka cannot play this content (format=${video.streamFormat})`
      );
    }

    logger.info('[PlayerEngine] Loading Shaka adapter');

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
      const currentPosition = this.videoEl.currentTime;
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
          position: this.videoEl?.currentTime ?? currentPosition,
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
