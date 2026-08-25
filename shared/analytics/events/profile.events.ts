/**
 * Profile Analytics Events
 *
 * Typed event builders for profile management
 */

import { EVENT_NAMES } from '../constants/analytics.constants';
import { EventCriticality } from '../model/provider.types';
import { type AnalyticsEvent } from '../model/common.types';

export interface ProfileCreatedEvent {
  profile_id: string;
  profile_name?: string;
  is_kid?: boolean;
}

export interface ProfileAddedEvent {
  profile_id: string;
  profile_name?: string;
}

export interface ProfileSelectedEvent {
  profile_id: string;
  profile_name?: string;
  is_kid?: boolean
}

export interface ProfileEditedEvent {
  profile_id: string;
  fields_changed?: string[];
}

export interface ProfileSwitchedEvent {
  from_profile_id: string;
  from_profile_name?: string;
  to_profile_id: string;
  to_profile_name?: string;
}

export interface ProfileUpgradeToGoldTappedEvent {
  profile_id: string;
  source?: string;
}

export const profileEvents = {
  profileCreated: (data: ProfileCreatedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PROFILE_CREATED,
    properties: data,
    criticality: EventCriticality.CRITICAL,
  }),

  profileAdded: (data: ProfileAddedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PROFILE_ADDED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  profileSelected: (data: ProfileSelectedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PROFILE_SELECTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  profileEdited: (data: ProfileEditedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PROFILE_EDITED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  profileSwitched: (data: ProfileSwitchedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PROFILE_SWITCHED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  profileUpgradeToGoldTapped: (data: ProfileUpgradeToGoldTappedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.PROFILE_UPGRADE_TO_GOLD_TAPPED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),
};
