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

  // ── Network-loss handling ────────────────────────────────────────────────
  // A dropped connection is not a playback failure. The engine pauses while
  // offline (the NoInternet screen covers the player) and resumes at the same
  // spot when the TV is back online; if the stream itself died in between,
  // it is reopened at the last known position instead of ending in the error
  // screen — recovery used to give up on the spot whenever navigator.onLine
  // was false, and never retried once the network returned.
  /** Last position the adapter reported — survives a session that dies with the network. */
  private lastKnownPosition = 0;
  /** What the last play()/pause() asked for: whether playback should be running. */
  private wantsPlayback = false;
  /** Paused by the engine (not the user) because the network dropped. */
  private pausedForNetwork = false;
  /** Playback failed while offline; reopen at this position once online. */
  private pendingNetworkResume: { position: number; error: PlayerError } | null = null;
  private networkListenersAttached = false;

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

    this.lastKnownPosition = options?.startTime ?? 0;
    this.wantsPlayback = false;
    this.pausedForNetwork = false;
    this.pendingNetworkResume = null;
    if (typeof window !== 'undefined' && !this.networkListenersAttached) {
      window.addEventListener('offline', this.handleOffline);
      window.addEventListener('online', this.handleOnline);
      this.networkListenersAttached = true;
    }

    await this.loadAdapter(videoEl, video);
  }

  // ── Playback controls ────────────────────────────────────────────────────

  play(): void {
    if (this.destroyed) return;
    this.wantsPlayback = true;
    this.pausedForNetwork = false;
    this.adapter?.play();
  }

  pause(): void {
    if (this.destroyed) return;
    this.wantsPlayback = false;
    this.pausedForNetwork = false;
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
    if (this.networkListenersAttached) {
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('online', this.handleOnline);
      this.networkListenersAttached = false;
    }
    this.pendingNetworkResume = null;

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

    if (TizenAVPlayAdapter.isAvailable()) {
      const avplayAdapter = new TizenAVPlayAdapter();
      if (avplayAdapter.canPlay(video.manifestUrl, video.streamFormat)) {
        logger.info('[PlayerEngine] Loading Samsung AVPlay adapter');
        try {
          avplayAdapter.setEventHandlers(this.createAdapterEventHandlers());
          await avplayAdapter.load(
            videoEl,
            video.manifestUrl,
            video.drmConfig,
            this.loadOptions,
          );
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
        if (currentTime > 0) this.lastKnownPosition = currentTime;
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
      if (videoEl.currentTime > 0) this.lastKnownPosition = videoEl.currentTime;
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

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.waitForNetwork(error);
      return;
    }

    this.isRecovering = true;
    try {
      const currentPosition = this.getResumePosition();
      const recoveryStartTime = Date.now();
      
      // Notify UI that we are buffering during recovery attempt
      this.eventBus.emit('BUFFER_START', { position: currentPosition });

      const reload = async () => {
        await this.reloadAt(currentPosition);
        if (currentPosition > 0 || this.wantsPlayback) {
          logger.info('[PlayerEngine] Restoring position on reload', { currentPosition });
          this.adapter?.play();
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

  /** Where to pick up after a failure: the adapter's clock, or the last reported position if that session lost it. */
  private getResumePosition(): number {
    const current = this.getCurrentTime();
    return current > 0 ? current : this.lastKnownPosition;
  }

  /**
   * Reopens the current video at `position` on a fresh adapter session.
   * Starting there (startTime) rather than seeking after load matters on
   * AVPlay: a seek racing the load-time one can fail and loop recovery.
   */
  private async reloadAt(position: number): Promise<void> {
    if (!this.video || !this.videoEl) throw new Error('No video');
    if (this.adapter) {
      const a = this.adapter;
      this.adapter = null;
      await a.destroy();
    }
    // loadAdapter re-attaches the media listeners for Shaka; without this
    // every reload stacked another copy of each (duplicate PLAY/TIME events).
    this.clearNativeListeners();
    this.loadOptions = { ...this.loadOptions, startTime: position > 0 ? position : undefined };
    await this.loadAdapter(this.videoEl, this.video);
  }

  private readonly handleOffline = (): void => {
    if (this.destroyed || !this.adapter || this.adapter.isPaused()) return;
    // The NoInternet screen covers the player — don't play out the buffer under it.
    this.pausedForNetwork = true;
    this.adapter.pause();
  };

  private readonly handleOnline = (): void => {
    if (this.destroyed) return;
    if (this.pendingNetworkResume) {
      void this.resumeAfterNetwork();
      return;
    }
    if (this.pausedForNetwork) {
      this.pausedForNetwork = false;
      if (this.wantsPlayback) this.adapter?.play();
    }
  };

  /** Playback failed while offline: hold the position (no retries, no error screen) until the network returns. */
  private waitForNetwork(error: PlayerError): void {
    if (this.pendingNetworkResume) return;
    const position = this.getResumePosition();
    logger.warn('[PlayerEngine] Playback lost with the network; resuming when back online', { position });
    this.pendingNetworkResume = { position, error };
    this.eventBus.emit('BUFFER_START', { position });
  }

  private async resumeAfterNetwork(): Promise<void> {
    const pending = this.pendingNetworkResume;
    this.pendingNetworkResume = null;
    if (!pending || this.destroyed || this.isRecovering) return;

    this.isRecovering = true;
    const startedAt = Date.now();
    let failed = false;
    try {
      await this.reloadAt(pending.position);
      if (this.wantsPlayback || this.pausedForNetwork) this.adapter?.play();
      this.pausedForNetwork = false;
      this.recoveryManager.reset();
      this.eventBus.emit('BUFFER_END', {
        position: pending.position,
        bufferingDurationMs: Date.now() - startedAt,
      });
    } catch (err) {
      logger.warn('[PlayerEngine] Reopening after network loss failed; handing to recovery', { err });
      failed = true;
    } finally {
      this.isRecovering = false;
    }
    // Outside the finally: handleError skips while isRecovering is set.
    if (failed && !this.destroyed) void this.handleError(pending.error);
  }

  private getActiveQualityLabel(): string {
    if (!this.adapter) return 'unknown';
    const qualities = this.adapter.getQualities();
    const active = qualities.find((q) => !q.isAuto);
    return active?.label ?? 'Auto';
  }
}
