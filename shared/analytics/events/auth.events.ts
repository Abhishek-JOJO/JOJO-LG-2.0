/**
 * Auth Analytics Events
 *
 * Typed event builders for authentication flows
 */

import { EVENT_NAMES } from '../constants/analytics.constants';
import { EventCriticality } from '../model/provider.types';
import { type AnalyticsEvent } from '../model/common.types';

export interface LoginStartedEvent {
  method?: string;
  session_id?: string;
  source_link?: string;
  value?: string;
  user_id?: string;
}

export interface LoginCompletedEvent {
  user_id: string;
  method?: string;
  session_id?: string;
  source_link?: string;
  value?: string;
  phoneOnly?: string;
  phoneCode?: string;
  otp?: string;
}

export interface LoginFailedEvent {
  method?: string;
  error_code?: string;
  error_message?: string;
  phone_code?: string;
  phoneCode?: string;
  value?: string;
  source_link?: string;
}

export interface SignUpStartedEvent {
  method?: string;
}

export interface SignUpCompletedEvent {
  user_id: string;
  method?: string;
}

export interface OtpRequestedEvent {
  phone?: string;
  phone_number?: string;
  phone_code?: string;
  phoneCode?: string;
  email?: string;
  source?: string;
}

export interface OtpVerifiedSuccessEvent {
  user_id?: string;
}

export interface OtpVerifiedFailedEvent {
  reason?: string;
}

export interface GuestBrowsingStartedEvent {
  source?: string;
}

export interface SpecialUserBypassEvent {
  user_id: string;
}

export const authEvents = {
  signUpStarted: (data: SignUpStartedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.SIGN_UP_STARTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  signUpCompleted: (data: SignUpCompletedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SIGN_UP_COMPLETED,
    properties: data,
    criticality: EventCriticality.CRITICAL,
  }),

  loginStarted: (data: LoginStartedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.LOGIN_STARTED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  loginCompleted: (data: LoginCompletedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.LOGIN_COMPLETED,
    properties: data,
    criticality: EventCriticality.CRITICAL,
  }),

  loginFailed: (data: LoginFailedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.LOGIN_FAILED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  logout: (data: Record<string, unknown> = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.LOGOUT,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  guestBrowsingStarted: (data: GuestBrowsingStartedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.GUEST_BROWSING_STARTED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  otpRequested: (data: OtpRequestedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.OTP_REQUESTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  otpVerifiedSuccess: (data: OtpVerifiedSuccessEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.OTP_VERIFIED_SUCCESS,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  otpVerifiedFailed: (data: OtpVerifiedFailedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.OTP_VERIFIED_FAILED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  specialUserBypass: (data: SpecialUserBypassEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SPECIAL_USER_BYPASS,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  userSpecificProperties: (subData?: any): AnalyticsEvent => ({
    name: EVENT_NAMES.USER_SPECIFIC_PROPERTIES,
    properties: subData || {},
    criticality: EventCriticality.HIGH,
  }),
};
