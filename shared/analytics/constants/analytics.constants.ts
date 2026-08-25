/**
 * Analytics Constants
 * 
 * Configuration values for analytics system
 */

import { EventCriticality } from '../model/provider.types';

// ============================================================================
// QUEUE LIMITS
// ============================================================================

export const QUEUE_LIMITS = {
  // Memory queue limits (per criticality level)
  MAX_QUEUE_SIZE: 100,
  MAX_CRITICAL_QUEUE_SIZE: 200,
  MAX_OFFLINE_QUEUE_SIZE: 50,

  // localStorage limits
  MAX_EVENT_SIZE_BYTES: 5 * 1024, // 5KB per event
  MAX_TOTAL_STORAGE_BYTES: 50 * 1024, // 50KB total
} as const;

// ============================================================================
// PLAYBACK TRACKING
// ============================================================================

export const PLAYBACK_CONFIG = {
  // Milestone percentages (immediate tracking)
  MILESTONES: [25, 50, 75, 90, 100] as const,

  // Interval tracking (throttled)
  INTERVAL_SECONDS: 30,

  // Max milestone sessions to track (prevent memory leak)
  MAX_MILESTONE_SESSIONS: 10,
} as const;

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

export const PROVIDER_CONFIG = {
  // Initialization timeout
  INIT_TIMEOUT_MS: 10000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,

  // Queue flush interval
  FLUSH_INTERVAL_MS: 5000,
} as const;

// ============================================================================
// EVENT NAMES
// ============================================================================

export const EVENT_NAMES = {
  AD_BLOCKED: "ad_blocked",
  PAGE_VIEW: "page_view",
  WEB_OPENED: "web_opened",
  GUEST_WEB_OPEN: "guest_web_open",
  USER_WEB_OPENED: "user_web_opened",
  SIGN_UP_STARTED: "sign_up_started",
  SIGN_UP_COMPLETED: "sign_up_completed",
  LOGIN_STARTED: "login_started",
  LOGIN_COMPLETED: "login_completed",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  GUEST_BROWSING_STARTED: "guest_browsing_started",
  PROFILE_CREATED: "profile_created",
  PROFILE_ADDED: "profile_added",
  PROFILE_SELECTED: "profile_selected",
  PROFILE_EDITED: "profile_edited",
  PROFILE_SWITCHED: "profile_switched",
  CONTENT_CLICKED: "content_clicked",
  ARTIST_CLICKED: "artist_clicked",
  GENRE_CLICKED: "genre_clicked",
  CONTENT_DETAIL_PAGE: "content_detail_page",
  CONTENT_ADDED_TO_WATCHLIST: "content_added_to_watchlist",
  CONTENT_REMOVED_FROM_WATCHLIST: "content_removed_from_watchlist",
  ASSET_CAST_CLICKED: "asset_cast_clicked",
  CONTENT_EPISODE_CLICKED: "content_episode_clicked",
  CONTENT_TRAILER_CLICKED: "content_trailer_clicked",
  SVOD_PURCHASE_STARTED: "svod_purchase_started",
  SVOD_PAYMENT_METHOD_SELECTED: "svod_payment_method_selected",
  SVOD_PURCHASE_SUCCESS: "svod_purchase_success",
  SVOD_PURCHASE_FAILURE: "svod_purchase_failure",
  FREE_TRIAL_POPUP_IMPRESSION: "free_trial_popup_impression",
  FREE_TRIAL_SUBSCRIBE_TAPPED: "free_trial_subscribe_tapped",
  FREE_TRIAL_MAYBE_LATER: "free_trial_maybe_later",
  NEW_TVOD_PLAN_DETAIL_PAGE_POPUP_OPENED: "tvod_plan_detail_page_popup_opened",
  TVOD_PURCHASE_STARTED: "tvod_purchase_started",
  TVOD_FULL_ACCESS_WITH_SVOD_TAPPED: "tvod_full_access_with_svod_tapped",
  TVOD_PAYMENT_METHOD_SELECTED: "tvod_payment_method_selected",
  WEB_PAYMENT_METHOD: "web_payment_method",
  WEB_PAYMENT_METHOD_SUCCESS: "web_payment_method_success",
  WEB_PAYMENT_METHOD_FAILURE: "web_payment_method_failure",
  TVOD_PURCHASE_SUCCESS: "tvod_purchase_success",
  TVOD_PURCHASE_FAILURE: "tvod_purchase_failure",
  HELP_AND_SETTING_OPTION_SELECTED: "help_and_setting_option_selected",
  HAPTIC_FEEDBACK_TOGGLED: "haptic_feedback_toggled",
  WEB_LANGUAGE_CHANGED: "web_language_changed",
  WEB_THEME_CHANGED: "web_theme_changed",
  DELETE_ACCOUNT: "delete_account",
  SEARCH_OPENED: "search_opened",
  SEARCH_CLOSED: "search_closed",
  SEARCH_PERFORMED: "search_performed",
  RESUME_BUTTON_CLICKED: "resume_button_clicked",
  PLAY_BUTTON_CLICKED: "play_button_clicked",
  PLAYBACK_STARTED: "playback_started",
  PLAYBACK_PAUSED: "playback_paused",
  PLAYBACK_END: "playback_end",
  PLAYBACK_RESUMED: "playback_resumed",
  PLAYBACK_COMPLETED: "playback_completed",
  PLAYBACK_SEEKED: "playback_seeked",
  PLAYBACK_BACK_CLICKED: "playback_back_clicked",
  PLAYBACK_SESSION_LIMIT: "playback_session_limit",
  NEXT_EPISODE_STARTED: "next_episode_started",
  RESUME_PLAYBACK: "resume_playback",
  AD_STARTED: "ad_started",
  RATE_CONTENT_SUBMITTED: "rate_content_submitted",
  AD_CLICKED: "ad_clicked",
  AD_COMPLETED: "ad_completed",
  AD_SKIPPED: "ad_skipped",
  CONTENT_SHARED: "content_shared",
  PLAYBACK_ERROR: "playback_error",
  SVOD_PLAN_DETAIL_PAGE_EVENT: "svod_plan_detail_page_event",
  TVOD_PLAN_DETAIL_PAGE_POPUP_OPENED: "tvod_plan_detail_page_popup_opened",
  AVOD_CUMULATIVE_2_3_MIN_PLAYED: "avod_cumulative_2_3_min_played",
  AVOD_CUMULATIVE_8_10_MIN_PLAYED: "avod_cumulative_8_10_min_played",
  CONTENT_WATCH_MILESTONE: "content_watch_milestone",
  OTP_REQUESTED: "otp_requested",
  OTP_VERIFIED_SUCCESS: "otp_verified_success",
  OTP_VERIFIED_FAILED: "otp_verified_failed",
  SPECIAL_USER_BYPASS: "special_user_bypass",
  CANCEL_SUBSCRIPTION: "cancel_subscription",
  SESSION_START: "session_start",
  SESSION_END: "session_end",
  SESSION_ENGAGEMENT: "session_engagement",
  DAILY_ACTIVE_USER: "daily_active_user",
  MONTHLY_ACTIVE_USER: "monthly_active_user",
  SOCKET_CONNECTED: "socket_connected",
  SOCKET_DISCONNECTED: "socket_disconnected",
  SOCKET_CONNECTION_ERROR: "socket_connection_error",
  USER_LOCATION_UPDATE: "user_location_update",
  PROFILE_UPGRADE_TO_GOLD_TAPPED: "profile_upgrade_to_gold_tapped",
  START_WATCHING_CLICKED: "start_watching_clicked",
  WATCH_LATER_CLICKED: "watch_later_clicked",
  // Content detail events
  CONTENT_LIKED: "content_liked",
  CONTENT_DISLIKED: "content_disliked",
  // Player interaction events
  PLAYER_MUTE_TOGGLED: "player_mute_toggled",
  PLAYER_RATE_CLICKED: "player_rate_clicked",
  PLAYER_SETTINGS_OPENED: "player_settings_opened",
  PLAYER_QUALITY_CHANGED: "player_quality_changed",
  PLAYER_SPEED_CHANGED: "player_speed_changed",
  PLAYER_CC_CHANGED: "player_cc_changed",
  // Skip events
  SKIP_INTRO_CLICKED: "skip_intro_clicked",
  SKIP_RECAP_CLICKED: "skip_recap_clicked",
  // TV login events
  TV_LOGIN_STARTED: "tv_login_started",
  TV_LOGIN_SUCCESS: "tv_login_success",
  TV_LOGIN_FAILED: "tv_login_failed",
  // Subscription select event
  SVOD_PLAN_SELECTED: "svod_plan_selected",
  // Deeplink attribution event
  DEEPLINK_WISE_COME: "deeplink_wise_come",
  // BFF IP Tracking event
  WEB_BFF_IP_TRACKING: "web_bff_ip_tracking",
  USER_SPECIFIC_PROPERTIES: "user_specific_properties"
} as const

// ============================================================================
// FIREBASE GA4 LIMITS
// ============================================================================

export const GA4_LIMITS = {
  MAX_EVENT_NAME_LENGTH: 40,
  MAX_PARAM_NAME_LENGTH: 40,
  MAX_PARAM_VALUE_LENGTH: 100,
  MAX_PARAMS_PER_EVENT: 25,
} as const;

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const ANALYTICS_STORAGE_KEYS = {
  OFFLINE_QUEUE: 'analytics_offline_queue',
  SESSION_ID: 'analytics_session_id',
  SESSION_START: 'analytics_session_start',
  // ⚠️  Unified: must match StorageKey.DEVICE_ID ('ott_device_id') in enums/storage.enum.ts
  // so analytics and the rest of the app share a single device identifier.
  DEVICE_ID: 'ott_device_id',
  FIRST_OPEN: 'analytics_first_open',
} as const;

// ============================================================================
// DEFAULT CRITICALITY MAPPING
// ============================================================================

export const DEFAULT_EVENT_CRITICALITY: Record<string, EventCriticality> = {
  // CRITICAL - Transactions
  [EVENT_NAMES.LOGIN_COMPLETED]: EventCriticality.CRITICAL,
  [EVENT_NAMES.SIGN_UP_COMPLETED]: EventCriticality.CRITICAL,
  [EVENT_NAMES.PROFILE_CREATED]: EventCriticality.CRITICAL,
  [EVENT_NAMES.SVOD_PURCHASE_SUCCESS]: EventCriticality.CRITICAL,
  [EVENT_NAMES.TVOD_PURCHASE_SUCCESS]: EventCriticality.CRITICAL,
  [EVENT_NAMES.DELETE_ACCOUNT]: EventCriticality.CRITICAL,

  // HIGH - Business events
  [EVENT_NAMES.OTP_REQUESTED]: EventCriticality.HIGH,
  [EVENT_NAMES.OTP_VERIFIED_SUCCESS]: EventCriticality.HIGH,
  [EVENT_NAMES.OTP_VERIFIED_FAILED]: EventCriticality.HIGH,
  [EVENT_NAMES.PROFILE_SELECTED]: EventCriticality.HIGH,
  [EVENT_NAMES.PLAYBACK_STARTED]: EventCriticality.HIGH,
  [EVENT_NAMES.PLAYBACK_COMPLETED]: EventCriticality.HIGH,
  [EVENT_NAMES.PLAYBACK_ERROR]: EventCriticality.HIGH,
  [EVENT_NAMES.PLAYBACK_SESSION_LIMIT]: EventCriticality.HIGH,
  [EVENT_NAMES.CONTENT_WATCH_MILESTONE]: EventCriticality.HIGH,
  [EVENT_NAMES.SVOD_PURCHASE_STARTED]: EventCriticality.HIGH,
  [EVENT_NAMES.TVOD_PURCHASE_STARTED]: EventCriticality.HIGH,
  [EVENT_NAMES.WEB_PAYMENT_METHOD]: EventCriticality.HIGH,
  [EVENT_NAMES.WEB_PAYMENT_METHOD_SUCCESS]: EventCriticality.CRITICAL,
  [EVENT_NAMES.WEB_PAYMENT_METHOD_FAILURE]: EventCriticality.HIGH,
  [EVENT_NAMES.SVOD_PURCHASE_FAILURE]: EventCriticality.HIGH,
  [EVENT_NAMES.TVOD_PURCHASE_FAILURE]: EventCriticality.HIGH,
  [EVENT_NAMES.CANCEL_SUBSCRIPTION]: EventCriticality.HIGH,
  [EVENT_NAMES.CONTENT_ADDED_TO_WATCHLIST]: EventCriticality.HIGH,
  [EVENT_NAMES.LOGOUT]: EventCriticality.HIGH,
  [EVENT_NAMES.SOCKET_CONNECTION_ERROR]: EventCriticality.HIGH,

  // MEDIUM - Page views & content interactions
  [EVENT_NAMES.PAGE_VIEW]: EventCriticality.MEDIUM,
  [EVENT_NAMES.CONTENT_DETAIL_PAGE]: EventCriticality.MEDIUM,
  [EVENT_NAMES.SEARCH_PERFORMED]: EventCriticality.MEDIUM,
  [EVENT_NAMES.CONTENT_SHARED]: EventCriticality.MEDIUM,
  [EVENT_NAMES.DEEPLINK_WISE_COME]: EventCriticality.MEDIUM,
  [EVENT_NAMES.PLAYBACK_END]: EventCriticality.MEDIUM,
  [EVENT_NAMES.SESSION_START]: EventCriticality.MEDIUM,
  [EVENT_NAMES.SESSION_END]: EventCriticality.MEDIUM,
  [EVENT_NAMES.WEB_LANGUAGE_CHANGED]: EventCriticality.MEDIUM,

  // LOW - UI interactions
  [EVENT_NAMES.PLAYBACK_PAUSED]: EventCriticality.LOW,
  [EVENT_NAMES.PLAYBACK_RESUMED]: EventCriticality.LOW,
  [EVENT_NAMES.PLAYBACK_SEEKED]: EventCriticality.LOW,
  [EVENT_NAMES.PLAYBACK_BACK_CLICKED]: EventCriticality.LOW,
  [EVENT_NAMES.CONTENT_CLICKED]: EventCriticality.LOW,
  [EVENT_NAMES.ARTIST_CLICKED]: EventCriticality.LOW,
  [EVENT_NAMES.GENRE_CLICKED]: EventCriticality.LOW,
  [EVENT_NAMES.SESSION_ENGAGEMENT]: EventCriticality.LOW,
  [EVENT_NAMES.HAPTIC_FEEDBACK_TOGGLED]: EventCriticality.LOW,
  [EVENT_NAMES.WEB_THEME_CHANGED]: EventCriticality.LOW,
} as const;

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};
