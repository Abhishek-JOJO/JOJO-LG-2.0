/**
 * Picture-in-Picture Manager
 *
 * Manages PiP lifecycle with proper cleanup and event forwarding.
 */

import { logger } from '@lib/logger/logger';
import type { PlayerEventBus } from './PlayerEventBus';

export class PipManager {
  private pipWindow: PictureInPictureWindow | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private readonly unsubscribers: (() => void)[] = [];

  constructor(private readonly eventBus: PlayerEventBus) {}

  /**
   * Whether PiP is supported in this browser.
   */
  static isSupported(): boolean {
    return (
      typeof document !== 'undefined' &&
      document.pictureInPictureEnabled === true
    );
  }

  /**
   * Whether currently in PiP mode.
   */
  isActive(): boolean {
    return (
      typeof document !== 'undefined' &&
      document.pictureInPictureElement !== null
    );
  }

  attach(videoEl: HTMLVideoElement): void {
    this.videoEl = videoEl;
  }

  async enter(currentTime: number): Promise<void> {
    if (!PipManager.isSupported()) {
      throw new Error('Picture-in-Picture is not supported in this browser');
    }
    if (!this.videoEl) {
      throw new Error('PipManager: no video element attached');
    }
    if (this.isActive()) return;

    try {
      this.pipWindow = await this.videoEl.requestPictureInPicture();

      this.pipWindow.addEventListener('resize', this.onResize);

      this.eventBus.emit('PIP_ENTER', { position: currentTime });

      logger.info('[PipManager] Entered PiP');
    } catch (err) {
      logger.error('[PipManager] Failed to enter PiP', { err });
      throw err;
    }
  }

  async exit(currentTime: number): Promise<void> {
    if (!this.isActive()) return;

    try {
      await document.exitPictureInPicture();
      this.detachResizeListener();
      this.eventBus.emit('PIP_EXIT', { position: currentTime });
      logger.info('[PipManager] Exited PiP');
    } catch (err) {
      logger.error('[PipManager] Failed to exit PiP', { err });
      throw err;
    }
  }

  async toggle(currentTime: number): Promise<void> {
    if (this.isActive()) {
      await this.exit(currentTime);
    } else {
      await this.enter(currentTime);
    }
  }

  destroy(): void {
    this.detachResizeListener();
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers.length = 0;
    this.videoEl = null;
  }

  private detachResizeListener(): void {
    this.pipWindow?.removeEventListener('resize', this.onResize);
    this.pipWindow = null;
  }

  private readonly onResize = (): void => {
    // Can emit resize events in future if needed
  };
}
