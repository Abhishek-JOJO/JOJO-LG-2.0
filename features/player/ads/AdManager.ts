/**
 * AdManager — Abstract Ad Provider Interface
 *
 * The player never depends on IMA directly.
 * New providers (VMAX, GAM, custom VAST) just implement this interface.
 */

import type { AdType } from '../model/types';
import type { PlayerEventBus } from '../engine/PlayerEventBus';

export interface AdManagerConfig {
  /** VAST ad tag URL — used for single ad request (pre/mid/post manual) */
  adTagUrl: string;
  /** VMAP URL — when provided, IMA handles all ad breaks automatically.
   *  Takes priority over adTagUrl. */
  vmapUrl?: string;
  /** Pre-fetched raw VMAP XML — passed inline via adsResponse to bypass CORS.
   *  Takes priority over vmapUrl. */
  vmapXml?: string;
  /** Dedicated ad <video> element — IMA renders creatives here.
   *  Must be separate from the content video element (Shaka owns that one). */
  videoElement: HTMLVideoElement;
  /** Content <video> element managed by Shaka — paused/resumed around ad breaks. */
  contentVideoElement: HTMLVideoElement;
  adContainer: HTMLDivElement;
  eventBus: PlayerEventBus;
  /** Mid-roll cue points in seconds */
  cuePoints: number[];
}

export interface AdManager {
  readonly providerName: string;
  initialize(config: AdManagerConfig): Promise<void>;
  requestAds(adType: AdType): void;
  resume(): void;
  pause(): void;
  skip(): void;
  setVolume?(volume: number): void;
  setMuted?(muted: boolean): void;
  resize(width: number, height: number): void;
  destroy(): void;
  isAdPlaying(): boolean;
  contentComplete?(): void;
  getClickThroughUrl?(): string | null;
}
