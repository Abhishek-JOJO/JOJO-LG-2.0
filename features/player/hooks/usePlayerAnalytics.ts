"use client";

/**
 * usePlayerAnalytics
 *
 * Subscribes to player events and calls analyticsService.
 * Pure analytics wiring — no UI logic.
 * Reuses existing analyticsService and playback.events.ts.
 */

import { useEffect } from 'react';
import { analyticsService } from '@/shared/analytics';
import { milestoneTracker } from '@/shared/analytics/utils/milestoneTracker';
import type { PlayerEngine } from '../engine/PlayerEngine';
import type { VideoDetails } from '../model/types';
import { logger } from '@lib/logger/logger';

interface UsePlayerAnalyticsOptions {
  engine: PlayerEngine | null;
  video: VideoDetails | null;
  isEnabled: boolean;
}

export function usePlayerAnalytics({
  engine,
  video,
  isEnabled,
}: UsePlayerAnalyticsOptions) {
  useEffect(() => {
    if (!engine || !video || !isEnabled) return;

    const bus = engine.eventBus;
    const unsubs: Array<() => void> = [];

    // Initialize milestone tracking for this video
    milestoneTracker.startTracking(video.contentId);

    unsubs.push(
      bus.on('PLAY', ({ position }) => {
        analyticsService.trackPlaybackStarted({
          content_id: video.contentId,
          asset_id: video.contentId,
          asset_name: video.title,
          title: video.title,
          asset_category: video.assetCategory || 'avod',
          asset_certificate: video.certification || video.assetCertificate || null,
          in_top_10: video.inTop10 ?? false,
          season_id: video.seasonId ?? video.seriesInfo?.seriesId ?? null,
          number_in_top_10: video.numberInTop10 ?? null,
          asset_type: video.assetTypeName || video.contentType || 'movie',
          content_type: video.contentType,
          position_seconds: Math.floor(position),
        });
        logger.info('[usePlayerAnalytics] PLAY tracked');
      })
    );

    unsubs.push(
      bus.on('PAUSE', ({ position }) => {
        analyticsService.trackPlaybackPaused({
          content_id: video.contentId,
          position_seconds: Math.floor(position),
        });
      })
    );

    unsubs.push(
      bus.on('SEEK', ({ from, to }) => {
        analyticsService.trackPlaybackSeeked({
          content_id: video.contentId,
          from_seconds: Math.floor(from),
          to_seconds: Math.floor(to),
        });
      })
    );

    unsubs.push(
      bus.on('ENDED', ({ durationSeconds }) => {
        analyticsService.trackPlaybackCompleted({
          content_id: video.contentId,
          total_duration_seconds: durationSeconds,
        });
      })
    );

    unsubs.push(
      bus.on('ERROR', ({ error }) => {
        analyticsService.trackPlaybackError({
          content_id: video.contentId,
          error_code: error.code,
          error_message: error.message,
        });
      })
    );

    unsubs.push(
      bus.on('AD_STARTED', ({ adId, adType }) => {
        analyticsService.trackAdStarted({
          ad_id: adId,
          ad_type: adType,
          content_id: video.contentId,
        });
      })
    );

    unsubs.push(
      bus.on('AD_COMPLETED', ({ adId }) => {
        analyticsService.trackAdCompleted({
          ad_id: adId,
          content_id: video.contentId,
        });
      })
    );

    // Progress tracking (milestones)
    unsubs.push(
      bus.on('AD_SKIPPED', ({ adId, adType, skipTimeSeconds }) => {
        analyticsService.trackAdSkipped({
          ad_id: adId,
          ad_type: adType,
          skip_time_seconds: skipTimeSeconds,
          video_id: video.contentId,
        });
      })
    );

    unsubs.push(
      bus.on('AD_BLOCKED', ({ reason }) => {
        analyticsService.trackAdBlocked({
          video_id: video.contentId,
          reason,
        });
        logger.info('[usePlayerAnalytics] AD_BLOCKED tracked', { reason });
      })
    );

    unsubs.push(
      bus.on('AD_CLICKED', ({ adId, clickThroughUrl }) => {
        analyticsService.trackAdClicked({
          ad_id: adId,
          content_id: video.contentId,
          ad_url: clickThroughUrl,
        });
        logger.info('[usePlayerAnalytics] AD_CLICKED tracked', { adId, clickThroughUrl });
      })
    );

    unsubs.push(
      bus.on('NEXT_EPISODE', ({ triggeredBy, nextContentId }) => {
        analyticsService.trackNextEpisodeStarted({
          video_id: video.contentId,
          next_video_id: nextContentId,
          triggered_by: triggeredBy,
        });
      })
    );

    unsubs.push(
      bus.on('RESUME_PLAYBACK', ({ resumePositionSeconds }) => {
        analyticsService.trackResumePlayback({
          video_id: video.contentId,
          resume_position_seconds: resumePositionSeconds,
        });
      })
    );

    // Progress tracking: Check for milestone crossings
    unsubs.push(
      bus.on('TIME_UPDATE', ({ currentTime, duration }) => {
        if (duration <= 0) return;
        
        const pct = (currentTime / duration) * 100;
        
        // Check which milestones were crossed since last update
        const crossed = milestoneTracker.checkMilestones(video.contentId, pct);
        
        // Fire event for each newly crossed milestone
        for (const milestone of crossed) {
          analyticsService.trackContentWatchMilestone({
            content_id: video.contentId,
            milestone_percent: milestone,
            position_seconds: Math.floor(currentTime),
          });
        }
      })
    );

    return () => {
      for (const unsub of unsubs) unsub();
      // Stop tracking milestones for this video when component unmounts or video changes
      milestoneTracker.stopTracking(video.contentId);
    };
  }, [engine, video, isEnabled]);
}
