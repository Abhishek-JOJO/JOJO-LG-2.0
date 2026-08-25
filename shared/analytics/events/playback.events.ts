/**
 * Playback Analytics Events
 *
 * Typed event builders for video playback tracking
 */

import { EVENT_NAMES } from '../constants/analytics.constants';
import { EventCriticality } from '../model/provider.types';
import { type AnalyticsEvent } from '../model/common.types';

export interface PlayButtonClickedEvent {
  content_id: string;
  content_type?: string;
  source?: string;
}

export interface ResumeButtonClickedEvent {
  content_id: string;
  resume_position_seconds?: number;
}

export interface PlaybackStartedEvent {
  content_id?: string;
  asset_id?: string | number;
  asset_name?: string;
  title?: string;
  asset_category?: string;
  asset_certificate?: string | null;
  certification?: string | null;
  in_top_10?: boolean;
  season_id?: string | number | null;
  number_in_top_10?: number | null;
  asset_type?: string;
  content_type?: string;
  position_seconds?: number;
}

export interface PlaybackPausedEvent {
  content_id: string;
  position_seconds?: number;
}

export interface PlaybackEndEvent {
  content_id: string;
  position_seconds?: number;
  total_duration_seconds?: number;
}

export interface PlaybackResumedEvent {
  content_id: string;
  position_seconds?: number;
}

export interface PlaybackCompletedEvent {
  content_id: string;
  total_duration_seconds?: number;
}

export interface PlaybackSeekedEvent {
  content_id: string;
  from_seconds: number;
  to_seconds: number;
}

export interface PlaybackBackClickedEvent {
  content_id: string;
  position_seconds?: number;
}

export interface PlaybackSessionLimitEvent {
  content_id: string;
  reason?: string;
}

export interface PlaybackErrorEvent {
  content_id: string;
  error_code?: string;
  error_message?: string;
}

export interface ContentWatchMilestoneEvent {
  content_id: string;
  milestone_percent: number;
  position_seconds?: number;
}

export interface AvodCumulative23MinPlayedEvent {
  content_id: string;
  cumulative_minutes: number;
}

export interface AvodCumulative810MinPlayedEvent {
  content_id: string;
  cumulative_minutes: number;
}

export interface RateContentSubmittedEvent {
  content_id: string;
  rating: number;
}

export interface NextEpisodeStartedEvent {
  video_id: string;
  next_video_id: string;
  triggered_by: string;
}

export interface ResumePlaybackEvent {
  video_id: string;
  resume_position_seconds: number;
}

export const playbackEvents = {
  playButtonClicked: (data: PlayButtonClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAY_BUTTON_CLICKED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  resumeButtonClicked: (data: ResumeButtonClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.RESUME_BUTTON_CLICKED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  playbackStarted: (data: PlaybackStartedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_STARTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  playbackPaused: (data: PlaybackPausedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_PAUSED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  playbackEnd: (data: PlaybackEndEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_END,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  playbackResumed: (data: PlaybackResumedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_RESUMED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  playbackCompleted: (data: PlaybackCompletedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_COMPLETED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  playbackSeeked: (data: PlaybackSeekedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_SEEKED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  playbackBackClicked: (data: PlaybackBackClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_BACK_CLICKED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  playbackSessionLimit: (data: PlaybackSessionLimitEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_SESSION_LIMIT,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  playbackError: (data: PlaybackErrorEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PLAYBACK_ERROR,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  contentWatchMilestone: (data: ContentWatchMilestoneEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CONTENT_WATCH_MILESTONE,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  avodCumulative23MinPlayed: (data: AvodCumulative23MinPlayedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.AVOD_CUMULATIVE_2_3_MIN_PLAYED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  avodCumulative810MinPlayed: (data: AvodCumulative810MinPlayedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.AVOD_CUMULATIVE_8_10_MIN_PLAYED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  rateContentSubmitted: (data: RateContentSubmittedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.RATE_CONTENT_SUBMITTED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  nextEpisodeStarted: (data: NextEpisodeStartedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.NEXT_EPISODE_STARTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  resumePlayback: (data: ResumePlaybackEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.RESUME_PLAYBACK,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),
};
