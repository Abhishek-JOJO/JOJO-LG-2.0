/**
 * Ad Analytics Events
 *
 * Typed event builders for advertisement tracking
 */

import { EVENT_NAMES } from '../constants/analytics.constants';
import { AdBlockedEvent } from '../model';
import { type AnalyticsEvent } from '../model/common.types';
import { EventCriticality } from '../model/provider.types';

export interface AdStartedEvent {
  ad_id: string;
  content_id?: string;
  ad_type?: string;
}

export interface AdClickedEvent {
  ad_id: string;
  content_id?: string;
  ad_url?: string;
}

export interface AdCompletedEvent {
  ad_id: string;
  content_id?: string;
  duration_seconds?: number;
}

export interface AdSkippedEvent {
  ad_id: string;
  ad_type?: string;
  skip_time_seconds?: number;
  video_id?: string;
}

export const adEvents = {
  adStarted: (data: AdStartedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.AD_STARTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  adClicked: (data: AdClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.AD_CLICKED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  adCompleted: (data: AdCompletedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.AD_COMPLETED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  adSkipped: (data: AdSkippedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.AD_SKIPPED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  adBlocked: (data: AdBlockedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.AD_BLOCKED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),
};
