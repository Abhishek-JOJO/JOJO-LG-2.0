/**
 * Playback Recovery Manager
 *
 * Handles error recovery: retry → manifest retry → switch adapter → error screen.
 */

import { logger } from '@lib/logger/logger';
import type { PlayerError } from '../model/types';
import type { PlayerEventBus } from './PlayerEventBus';

interface RecoveryState {
  attempts: number;
  manifestRetries: number;
  lastError: PlayerError | null;
}

const MAX_RETRY_ATTEMPTS = 2;
const MAX_MANIFEST_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

export class PlaybackRecoveryManager {
  private state: RecoveryState = {
    attempts: 0,
    manifestRetries: 0,
    lastError: null,
  };

  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly COOLDOWN_DURATION_MS = 15000; // 15 seconds cooldown
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  constructor(private readonly eventBus: PlayerEventBus) {}

  reset(): void {
    this.state = { attempts: 0, manifestRetries: 0, lastError: null };
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Attempt recovery after a playback error.
   * Returns true if recovery succeeded, false if error screen should be shown.
   */
  async attemptRecovery(
    error: PlayerError,
    currentPosition: number,
    reload: () => Promise<void>
  ): Promise<boolean> {
    this.state.lastError = error;

    // Check internet connection
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      logger.warn('[PlaybackRecoveryManager] Internet is disconnected. Aborting recovery immediately.');
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();
      return false;
    }

    // Check circuit breaker state
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.COOLDOWN_DURATION_MS) {
        const remainingSecs = Math.ceil((this.COOLDOWN_DURATION_MS - timeSinceLastFailure) / 1000);
        logger.warn(
          `[PlaybackRecoveryManager] Circuit breaker active. Cooldown remaining: ${remainingSecs}s. Recovery aborted.`
        );
        return false;
      } else {
        logger.info('[PlaybackRecoveryManager] Circuit breaker cooldown expired. Resetting consecutive failures.');
        this.consecutiveFailures = 0;
      }
    }

    logger.warn('[PlaybackRecoveryManager] Attempting recovery', {
      error: error.code,
      attempts: this.state.attempts,
    });

    // Step 1: Simple retry
    if (this.state.attempts < MAX_RETRY_ATTEMPTS) {
      this.state.attempts++;
      logger.info('[PlaybackRecoveryManager] Retry attempt', {
        attempt: this.state.attempts,
      });
      await this.delay(RETRY_DELAY_MS);
      try {
        await reload();
        this.reset();
        return true;
      } catch {
        return this.attemptRecovery(error, currentPosition, reload);
      }
    }

    // Step 2: Manifest retry
    if (this.state.manifestRetries < MAX_MANIFEST_RETRIES) {
      this.state.manifestRetries++;
      logger.info('[PlaybackRecoveryManager] Manifest retry');
      await this.delay(RETRY_DELAY_MS * 2);
      try {
        await reload();
        this.reset();
        return true;
      } catch {
        // Fall through to unrecoverable error
      }
    }

    // Step 3: Unrecoverable — show error screen
    logger.error('[PlaybackRecoveryManager] Unrecoverable error', {
      error: error.code,
    });
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    return false;
  }

  getLastError(): PlayerError | null {
    return this.state.lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
