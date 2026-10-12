/**
 * Samsung Tizen AVPlay adapter.
 *
 * AVPlay owns a native video plane rather than the HTMLVideoElement. This
 * adapter translates that native lifecycle into the same contract used by
 * Shaka so controls, analytics, recovery, and ads stay platform-agnostic.
 */

import { logger } from '@lib/logger/logger';
import type { SamsungAVPlay, SamsungAVPlayTrack } from '@/src/platform/types';
import type {
  AdapterName,
  AudioTrack,
  DrmConfig,
  PlaybackSpeed,
  PlayerAdapter,
  PlayerAdapterEventHandlers,
  PlayerLoadOptions,
  QualityOption,
  StreamFormat,
  SubtitleTrack,
} from '../model/types';

const TIZEN_LOGICAL_WIDTH = 1920;
const TIZEN_LOGICAL_HEIGHT = 1080;

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
  private currentTimeSeconds = 0;
  private durationSeconds = 0;
  private bufferedSeconds = 0;
  private ended = false;
  private previousVideoVisibility = '';
  private selectedAudioIndex: number | null = null;
  private selectedTextIndex: number | null = null;
  private destroyed = false;

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
    this.container = options?.videoContainer ?? videoEl.parentElement;
    if (!this.container) throw new Error('AVPlay requires a video container');

    this.createNativeVideoObject();
    this.previousVideoVisibility = videoEl.style.visibility;
    videoEl.style.visibility = 'hidden';
    window.addEventListener('resize', this.updateDisplayRect);
    document.addEventListener('fullscreenchange', this.updateDisplayRect);

    try {
      this.safeCloseExistingSession();
      avplay.open(manifestUrl);
      avplay.setListener(this.createListener());
      avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
      this.updateDisplayRect();
      this.configureDrm(drmConfig);

      await new Promise<void>((resolve, reject) => {
        avplay.prepareAsync(
          () => {
            if (this.destroyed) {
              reject(new Error('AVPlay was destroyed while preparing'));
              return;
            }
            this.durationSeconds = Math.max(0, avplay.getDuration() / 1000);
            this.tracks = avplay.getTotalTrackInfo() ?? [];
            this.syncSelectedTracks();
            this.handlers?.onDurationChange(this.durationSeconds);

            const startTime = options?.startTime ?? 0;
            if (startTime > 0) this.seek(startTime);
            resolve();
          },
          (error) => reject(new Error(`AVPlay prepare failed: ${errorMessage(error)}`)),
        );
      });

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

  seek(seconds: number): void {
    if (!this.avplay || !Number.isFinite(seconds) || seconds < 0) return;
    const target = this.durationSeconds > 0
      ? Math.min(seconds, Math.max(0, this.durationSeconds - 0.1))
      : seconds;
    try {
      this.avplay.seekTo(
        Math.round(target * 1000),
        () => { this.currentTimeSeconds = target; },
        (error) => this.reportError('AVPLAY_SEEK_FAILED', error, true),
      );
    } catch (error) {
      this.reportError('AVPLAY_SEEK_FAILED', error, true);
    }
  }

  setQuality(qualityId: number): void {
    // AVPlay performs native adaptive bitrate selection. A stable manual-quality
    // API is not exposed across the supported Tizen generations.
    if (qualityId !== -1) {
      logger.warn('[TizenAVPlayAdapter] Manual quality selection is unavailable; keeping Auto');
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
    if (!this.avplay) return;
    try {
      if (trackId === -1) {
        this.avplay.setSilentSubtitle?.(true);
        this.selectedTextIndex = null;
        return;
      }
      const track = this.tracks.find((item) => item.type === 'TEXT' && item.index === trackId);
      if (!track) return;
      this.avplay.setSelectTrack('TEXT', track.index);
      this.avplay.setSilentSubtitle?.(false);
      this.selectedTextIndex = track.index;
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] Unable to select subtitle track', { trackId, error });
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
      audio.setMute(normalized === 0);
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] TV audio control failed', { error });
    }
  }

  setPlaybackSpeed(speed: PlaybackSpeed): void {
    if (!this.avplay?.setSpeed) return;
    try {
      // AVPlay support varies by model; unsupported rates throw and leave 1x intact.
      this.avplay.setSpeed(speed);
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] Playback speed is unsupported on this TV', { speed, error });
    }
  }

  getQualities(): QualityOption[] {
    return [{ id: -1, label: 'Auto', height: null, bitrate: null, isAuto: true }];
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
    if (!this.avplay) return this.currentTimeSeconds;
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

  async destroy(): Promise<void> {
    this.destroyed = true;
    window.removeEventListener('resize', this.updateDisplayRect);
    document.removeEventListener('fullscreenchange', this.updateDisplayRect);

    if (this.avplay) {
      try {
        const state = this.avplay.getState();
        if (state === 'PLAYING' || state === 'PAUSED' || state === 'READY') this.avplay.stop();
      } catch (error) {
        logger.warn('[TizenAVPlayAdapter] AVPlay stop failed during cleanup', { error });
      }
      try {
        if (this.avplay.getState() !== 'NONE') this.avplay.close();
      } catch (error) {
        logger.warn('[TizenAVPlayAdapter] AVPlay close failed during cleanup', { error });
      }
    }

    this.objectEl?.remove();
    if (this.videoEl) this.videoEl.style.visibility = this.previousVideoVisibility;
    this.avplay = null;
    this.videoEl = null;
    this.container = null;
    this.objectEl = null;
    this.handlers = null;
    this.tracks = [];
    logger.info('[TizenAVPlayAdapter] Destroyed');
  }

  private createNativeVideoObject(): void {
    if (!this.container) return;
    const object = document.createElement('object');
    object.type = 'application/avplayer';
    object.tabIndex = -1;
    Object.assign(object.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      pointerEvents: 'none',
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
    const x = Math.max(0, Math.round((rect.left / viewportWidth) * TIZEN_LOGICAL_WIDTH));
    const y = Math.max(0, Math.round((rect.top / viewportHeight) * TIZEN_LOGICAL_HEIGHT));
    const width = Math.max(1, Math.round((rect.width / viewportWidth) * TIZEN_LOGICAL_WIDTH));
    const height = Math.max(1, Math.round((rect.height / viewportHeight) * TIZEN_LOGICAL_HEIGHT));
    try {
      this.avplay.setDisplayRect(x, y, width, height);
    } catch (error) {
      logger.warn('[TizenAVPlayAdapter] setDisplayRect failed', { error });
    }
  };

  private createListener() {
    return {
      onbufferingstart: () => this.handlers?.onBufferingStart(this.getCurrentTime()),
      onbufferingprogress: (percent: number) => {
        this.bufferedSeconds = this.durationSeconds * Math.max(0, Math.min(100, percent)) / 100;
      },
      onbufferingcomplete: () => this.handlers?.onBufferingEnd(this.getCurrentTime()),
      oncurrentplaytime: (milliseconds: number) => {
        this.currentTimeSeconds = milliseconds / 1000;
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
