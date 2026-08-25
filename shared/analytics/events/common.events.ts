/**
 * Common Analytics Events
 *
 * Typed event builders for general app interactions
 */

import { EVENT_NAMES } from '../constants/analytics.constants';
import { EventCriticality } from '../model/provider.types';
import { type AnalyticsEvent } from '../model/common.types';

export interface PageViewEvent {
  page: string;
  page_title?: string;
  referrer?: string;
}

export interface AppOpenedEvent {
  source?: string;
  notification_id?: string;
}

export interface SessionStartEvent {
  session_id: string;
}

export interface SessionEndEvent {
  session_id: string;
  duration_seconds?: number;
}

export interface SessionEngagementEvent {
  session_id: string;
  engagement_time_seconds?: number;
}

export interface DailyActiveUserEvent {
  user_id: string;
  date?: string;
}

export interface MonthlyActiveUserEvent {
  user_id: string;
  month?: string;
}

export interface SocketConnectedEvent {
  socket_id?: string;
}

export interface SocketDisconnectedEvent {
  socket_id?: string;
  reason?: string;
}

export interface SocketConnectionErrorEvent {
  error_message?: string;
  attempt?: number;
}

export interface UserLocationUpdateEvent {
  country?: string;
  city?: string;
  region?: string;
}

export interface HelpAndSettingOptionSelectedEvent {
  option: string;
}

export interface HapticFeedbackToggledEvent {
  enabled: boolean;
}

export interface AppLanguageChangedEvent {
  old_language: string;
  new_language: string;
}

export interface AppThemeChangedEvent {
  old_theme: string;
  new_theme: string;
}

export interface DeleteAccountEvent {
  user_id: string;
  reason?: string;
}

export interface CancelSubscriptionEvent {
  subscription_id: string;
  reason?: string;
}

export interface SearchOpenedEvent {
  source?: string;
}

export interface SearchClosedEvent {
  duration_seconds?: number;
}

export interface SearchPerformedEvent {
  search_query: string;
  result_count?: number;
  has_results?: boolean;
}

export interface DeeplinkWiseComeEvent {
  deeplink_url: string;
  data_param: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  source?: string;
  [key: string]: string | undefined;
}

export interface WebBffIpTrackingEvent {
  client_ip?: string;
  forwarded_for?: string;
  route_path?: string;
  http_method?: string;
  user_agent?: string;
  correlation_id?: string;
  [key: string]: unknown;
}

export const commonEvents = {
  webBffIpTracking: (data: WebBffIpTrackingEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.WEB_BFF_IP_TRACKING,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  pageView: (data: PageViewEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PAGE_VIEW,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  appOpened: (data: AppOpenedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.WEB_OPENED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  guestWebOpen: (data: AppOpenedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.GUEST_WEB_OPEN,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  userWebOpened: (data: AppOpenedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.USER_WEB_OPENED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  sessionStart: (data: SessionStartEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SESSION_START,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  sessionEnd: (data: SessionEndEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SESSION_END,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  sessionEngagement: (data: SessionEngagementEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SESSION_ENGAGEMENT,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  dailyActiveUser: (data: DailyActiveUserEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.DAILY_ACTIVE_USER,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  monthlyActiveUser: (data: MonthlyActiveUserEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.MONTHLY_ACTIVE_USER,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  socketConnected: (data: SocketConnectedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.SOCKET_CONNECTED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  socketDisconnected: (data: SocketDisconnectedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.SOCKET_DISCONNECTED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  socketConnectionError: (data: SocketConnectionErrorEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.SOCKET_CONNECTION_ERROR,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  userLocationUpdate: (data: UserLocationUpdateEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.USER_LOCATION_UPDATE,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  helpAndSettingOptionSelected: (data: HelpAndSettingOptionSelectedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.HELP_AND_SETTING_OPTION_SELECTED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  hapticFeedbackToggled: (data: HapticFeedbackToggledEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.HAPTIC_FEEDBACK_TOGGLED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  appLanguageChanged: (data: AppLanguageChangedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.WEB_LANGUAGE_CHANGED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  appThemeChanged: (data: AppThemeChangedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.WEB_THEME_CHANGED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  deleteAccount: (data: DeleteAccountEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.DELETE_ACCOUNT,
    properties: data,
    criticality: EventCriticality.CRITICAL,
  }),

  cancelSubscription: (data: CancelSubscriptionEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CANCEL_SUBSCRIPTION,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  searchOpened: (data: SearchOpenedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.SEARCH_OPENED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  searchClosed: (data: SearchClosedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.SEARCH_CLOSED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  searchPerformed: (data: SearchPerformedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SEARCH_PERFORMED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  deeplinkWiseCome: (data: DeeplinkWiseComeEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.DEEPLINK_WISE_COME,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),
};
