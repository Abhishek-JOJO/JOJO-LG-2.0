/**
 * Playback Event Types
 * 
 * Video playback, ads, and content discovery event definitions
 */

// ============================================================================
// VIDEO EVENTS
// ============================================================================

export interface VideoViewedEvent {
  video_id: string;
  video_title: string;
  video_type: 'movie' | 'series' | 'episode' | 'live';
  genre?: string[];
  duration_seconds?: number;
  content_rating?: string;
}

export interface VideoSearchedEvent {
  search_query: string;
  results_count: number;
  search_duration_ms: number;
}

export interface VideoAddedToWatchlistEvent {
  video_id: string;
  video_title: string;
  video_type: 'movie' | 'series' | 'episode';
}

export interface VideoRemovedFromWatchlistEvent {
  video_id: string;
  video_title: string;
}

// ============================================================================
// PLAYBACK EVENTS
// ============================================================================

export interface PlaybackStartedEvent {
  video_id: string;
  video_title: string;
  video_type: 'movie' | 'series' | 'episode' | 'live';
  quality: string;
  is_resume: boolean;
  resume_position_seconds?: number;
}

export interface PlaybackProgressEvent {
  video_id: string;
  video_title: string;
  current_position_seconds: number;
  duration_seconds: number;
  progress_percentage: number;
  quality: string;
  is_milestone: boolean; // true for 25%, 50%, 75%, 90%, 100%
  milestone?: number; // 25, 50, 75, 90, 100
}

export interface PlaybackCompletedEvent {
  video_id: string;
  video_title: string;
  watch_duration_seconds: number;
  completion_percentage: number;
}

export interface PlaybackPausedEvent {
  video_id: string;
  current_position_seconds: number;
  duration_seconds: number;
}

export interface PlaybackResumedEvent {
  video_id: string;
  current_position_seconds: number;
  duration_seconds: number;
}

export interface PlaybackStoppedEvent {
  video_id: string;
  current_position_seconds: number;
  duration_seconds: number;
  watch_duration_seconds: number;
  reason: 'user_stopped' | 'error' | 'completed';
}

export interface PlaybackQualityChangedEvent {
  video_id: string;
  old_quality: string;
  new_quality: string;
  is_auto: boolean;
}

export interface PlaybackBufferingEvent {
  video_id: string;
  current_position_seconds: number;
  buffering_duration_ms: number;
}

export interface PlaybackErrorEvent {
  video_id: string;
  error_code: string;
  error_message: string;
  current_position_seconds: number;
}

// ============================================================================
// AD EVENTS
// ============================================================================

export interface AdImpressionEvent {
  ad_id: string;
  ad_type: 'pre_roll' | 'mid_roll' | 'post_roll' | 'banner';
  video_id?: string;
  position_seconds?: number;
}

export interface AdClickedEvent {
  ad_id: string;
  ad_type: 'pre_roll' | 'mid_roll' | 'post_roll' | 'banner';
  video_id?: string;
}

export interface AdSkippedEvent {
  ad_id: string;
  ad_type: 'pre_roll' | 'mid_roll' | 'post_roll';
  skip_time_seconds: number;
  video_id?: string;
}

export interface AdCompletedEvent {
  ad_id: string;
  ad_type: 'pre_roll' | 'mid_roll' | 'post_roll';
  video_id?: string;
}

export interface AdBlockedEvent {
  video_id: string;
  reason: string;
}

// ============================================================================
// MILESTONE TRACKING
// ============================================================================

/**
 * Playback milestone tracker (scoped per video_id)
 */
export interface MilestoneTracker {
  video_id: string;
  milestones_reached: Set<number>; // 25, 50, 75, 90, 100
  last_interval_time: number; // For 30s interval tracking
  start_time: number;
  last_percentage: number; // For threshold-crossing detection
}
