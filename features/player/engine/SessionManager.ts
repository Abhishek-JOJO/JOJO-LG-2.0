/**
 * Session Manager
 *
 * Tracks playback session metrics: watch duration, completion percentage,
 * session start/end. Provides data for business analytics.
 */

import { logger } from '@lib/logger/logger';
import type { PlaybackSession } from '../model/types';
import type { PlayerEventBus } from './PlayerEventBus';

export class SessionManager {
  private session: PlaybackSession | null = null;
  private accumulatedSeconds = 0;
  private lastTickAt: number | null = null;
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly eventBus: PlayerEventBus) {}

  /**
   * Start a new session for the given content.
   */
  startSession(contentId: string): void {
    this.stopSession();

    const sessionId = `${contentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.session = {
      sessionId,
      contentId,
      startedAt: Date.now(),
      endedAt: null,
      watchDurationSeconds: 0,
      completionPercentage: 0,
      isCompleted: false,
    };

    this.accumulatedSeconds = 0;
    this.lastTickAt = null;

    logger.info('[SessionManager] Session started', { sessionId, contentId });
  }

  /**
   * Call when playback resumes / starts ticking.
   */
  onPlay(): void {
    this.lastTickAt = Date.now();
    this.startTick();
  }

  /**
   * Call when playback pauses / stops ticking.
   */
  onPause(): void {
    this.flushTick();
    this.stopTick();
    this.lastTickAt = null;
  }

  /**
   * Update completion percentage (pass current progress %).
   */
  updateProgress(percentage: number): void {
    if (!this.session) return;
    this.session.completionPercentage = Math.min(100, Math.max(0, percentage));
  }

  /**
   * Mark session as completed.
   */
  markCompleted(): void {
    if (!this.session) return;
    this.session.isCompleted = true;
    this.session.completionPercentage = 100;
    this.stopSession();
  }

  /**
   * End the current session and return session data for analytics.
   */
  stopSession(): PlaybackSession | null {
    if (!this.session) return null;

    this.flushTick();
    this.stopTick();

    this.session.endedAt = Date.now();
    this.session.watchDurationSeconds = Math.floor(this.accumulatedSeconds);

    const snapshot = { ...this.session };

    logger.info('[SessionManager] Session ended', {
      sessionId: snapshot.sessionId,
      watchDurationSeconds: snapshot.watchDurationSeconds,
      completionPercentage: snapshot.completionPercentage,
    });

    this.session = null;
    this.accumulatedSeconds = 0;
    this.lastTickAt = null;

    return snapshot;
  }

  getSession(): PlaybackSession | null {
    return this.session ? { ...this.session } : null;
  }

  getWatchDurationSeconds(): number {
    this.flushTick();
    return Math.floor(this.accumulatedSeconds);
  }

  destroy(): void {
    this.stopSession();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private startTick(): void {
    if (this.tickIntervalId !== null) return;
    this.tickIntervalId = setInterval(() => this.flushTick(), 1000);
  }

  private stopTick(): void {
    if (this.tickIntervalId === null) return;
    clearInterval(this.tickIntervalId);
    this.tickIntervalId = null;
  }

  private flushTick(): void {
    if (this.lastTickAt === null) return;
    const now = Date.now();
    const elapsed = (now - this.lastTickAt) / 1000;
    // Guard against very large values (e.g. tab was backgrounded)
    if (elapsed < 60) {
      this.accumulatedSeconds += elapsed;
    }
    this.lastTickAt = now;
  }
}
