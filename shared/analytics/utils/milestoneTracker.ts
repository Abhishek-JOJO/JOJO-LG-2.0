/**
 * Milestone Tracker
 *
 * Tracks playback milestones per video_id with:
 * - Milestone tracking (25%, 50%, 75%, 90%, 100%) using threshold-crossing
 *   so a milestone fires exactly once when playback passes that percentage,
 *   regardless of how fast TIME_UPDATE events arrive.
 * - Automatic cleanup (max 10 sessions)
 */

import { PLAYBACK_CONFIG } from '../constants/analytics.constants';
import { analyticsLogger } from './logger';
import type { MilestoneTracker } from '../model/playback.types';

class MilestoneTrackerManager {
  private trackers: Map<string, MilestoneTracker> = new Map();

  /**
   * Start tracking for a video.
   * Safe to call multiple times — resets milestones if already exists.
   */
  startTracking(videoId: string): void {
    // Cleanup old sessions if needed
    if (!this.trackers.has(videoId) && this.trackers.size >= PLAYBACK_CONFIG.MAX_MILESTONE_SESSIONS) {
      this.cleanupOldest();
    }

    // Always reset so switching back to the same video works correctly
    this.trackers.set(videoId, {
      video_id: videoId,
      milestones_reached: new Set(),
      last_interval_time: Date.now(),
      start_time: Date.now(),
      last_percentage: 0,
    });

    analyticsLogger.debug('MilestoneTracker: Started tracking', videoId);
  }

  /**
   * Check which milestones have been crossed since the last call.
   * Uses threshold-crossing logic: fires when playback moves FROM below
   * a milestone TO at-or-above it, so it never misses a milestone even
   * if TIME_UPDATE skips over the exact percentage point.
   *
   * Returns the list of newly crossed milestone values (e.g. [25, 50]).
   */
  checkMilestones(videoId: string, currentPct: number): number[] {
    const tracker = this.trackers.get(videoId);
    if (!tracker) return [];

    const crossed: number[] = [];

    for (const milestone of PLAYBACK_CONFIG.MILESTONES) {
      if (
        !tracker.milestones_reached.has(milestone) &&
        tracker.last_percentage < milestone &&
        currentPct >= milestone
      ) {
        tracker.milestones_reached.add(milestone);
        crossed.push(milestone);
        analyticsLogger.debug('MilestoneTracker: Milestone crossed', videoId, milestone + '%');
      }
    }

    // Update last seen percentage (only move forward — ignore seeks backward)
    if (currentPct > tracker.last_percentage) {
      tracker.last_percentage = currentPct;
    }

    return crossed;
  }

  /**
   * @deprecated Use checkMilestones() instead.
   * Kept for backward compatibility only.
   */
  shouldTrackMilestone(videoId: string, percentage: number): boolean {
    const tracker = this.trackers.get(videoId);
    if (!tracker) return false;

    const milestone = PLAYBACK_CONFIG.MILESTONES.find(m => m === percentage);
    if (!milestone) return false;
    if (tracker.milestones_reached.has(milestone)) return false;

    tracker.milestones_reached.add(milestone);
    analyticsLogger.debug('MilestoneTracker: Milestone reached (compat)', videoId, milestone + '%');
    return true;
  }

  /**
   * Check if interval should be tracked (30s minimum)
   */
  shouldTrackInterval(videoId: string): boolean {
    const tracker = this.trackers.get(videoId);
    if (!tracker) return false;

    const now = Date.now();
    const elapsed = (now - tracker.last_interval_time) / 1000;

    if (elapsed >= PLAYBACK_CONFIG.INTERVAL_SECONDS) {
      tracker.last_interval_time = now;
      analyticsLogger.debug('MilestoneTracker: Interval reached', videoId, elapsed + 's');
      return true;
    }

    return false;
  }

  /**
   * Stop tracking for a video
   */
  stopTracking(videoId: string): void {
    this.trackers.delete(videoId);
    analyticsLogger.debug('MilestoneTracker: Stopped tracking', videoId);
  }

  /**
   * Reset tracker for a video (when video changes)
   */
  resetTracking(videoId: string): void {
    this.stopTracking(videoId);
    this.startTracking(videoId);
  }

  /**
   * Get tracker for a video
   */
  getTracker(videoId: string): MilestoneTracker | undefined {
    return this.trackers.get(videoId);
  }

  /**
   * Clear all trackers (call on logout)
   */
  clearAll(): void {
    this.trackers.clear();
    analyticsLogger.debug('MilestoneTracker: Cleared all trackers');
  }

  /**
   * Cleanup oldest tracker
   */
  private cleanupOldest(): void {
    if (this.trackers.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, tracker] of this.trackers.entries()) {
      if (tracker.start_time < oldestTime) {
        oldestTime = tracker.start_time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.trackers.delete(oldestKey);
      analyticsLogger.debug('MilestoneTracker: Cleaned up oldest tracker', oldestKey);
    }
  }
}

// Singleton instance
export const milestoneTracker = new MilestoneTrackerManager();
