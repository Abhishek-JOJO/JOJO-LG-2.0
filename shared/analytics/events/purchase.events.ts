/**
 * Purchase Analytics Events
 *
 * Typed event builders for SVOD/TVOD purchase and subscription flows
 */

import { EVENT_NAMES } from '../constants/analytics.constants';
import { EventCriticality } from '../model/provider.types';
import { type AnalyticsEvent } from '../model/common.types';

export interface SvodPurchaseStartedEvent {
  plan_id: string;
  plan_name?: string;
  price?: number;
  currency?: string;
}

export interface SvodPaymentMethodSelectedEvent {
  plan_id: string;
  payment_method: string;
}

export interface SvodPurchaseSuccessEvent {
  plan_id: string;
  plan_name?: string;
  price?: number;
  currency?: string;
  transaction_id?: string;
}

export interface SvodPurchaseFailureEvent {
  plan_id: string;
  error_code?: string;
  error_message?: string;
}

export interface FreeTrialPopupImpressionEvent {
  source?: string;
}

export interface FreeTrialSubscribeTappedEvent {
  plan_id?: string;
  source?: string;
}

export interface FreeTrialMaybeLaterEvent {
  source?: string;
}

export interface TvodPlanDetailPagePopupOpenedEvent {
  content_id: string;
  plan_id?: string;
}

export interface TvodPurchaseStartedEvent {
  content_id: string;
  plan_id: string;
  price?: number;
  currency?: string;
}

export interface TvodFullAccessWithSvodTappedEvent {
  content_id: string;
  source?: string;
}

export interface TvodPaymentMethodSelectedEvent {
  content_id: string;
  plan_id: string;
  payment_method: string;
}

export interface TvodPurchaseSuccessEvent {
  content_id: string;
  plan_id: string;
  price?: number;
  currency?: string;
  transaction_id?: string;
}

export interface TvodPurchaseFailureEvent {
  content_id: string;
  plan_id: string;
  error_code?: string;
  error_message?: string;
}

export interface SvodPlanDetailPageEvent {
  plan_id?: string;
  source?: string;
}

export interface WebPaymentMethodEvent {
  intent_name: string;
  payment_method?: string;
  plan_type?: string;
  plan_id?: string;
  plan_name?: string;
  price?: number;
  currency?: string;
  validity_days?: number;
  content_id?: string;
  content_title?: string;
  content_type?: string;
  release_date?: string;
  certification?: string;
  duration_seconds?: number;
  tvod_info_items?: any[];
  [key: string]: any;
}

export interface WebPaymentMethodSuccessEvent extends WebPaymentMethodEvent {
  transaction_id?: string;
  order_id?: string;
  payment_id?: string;
}

export interface WebPaymentMethodFailureEvent extends WebPaymentMethodEvent {
  error_message?: string;
  error_code?: string;
}

export const purchaseEvents = {
  svodPurchaseStarted: (data: SvodPurchaseStartedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SVOD_PURCHASE_STARTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  svodPaymentMethodSelected: (data: SvodPaymentMethodSelectedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SVOD_PAYMENT_METHOD_SELECTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  svodPurchaseSuccess: (data: SvodPurchaseSuccessEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SVOD_PURCHASE_SUCCESS,
    properties: data,
    criticality: EventCriticality.CRITICAL,
  }),

  svodPurchaseFailure: (data: SvodPurchaseFailureEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SVOD_PURCHASE_FAILURE,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  freeTrialPopupImpression: (data: FreeTrialPopupImpressionEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.FREE_TRIAL_POPUP_IMPRESSION,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  freeTrialSubscribeTapped: (data: FreeTrialSubscribeTappedEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.FREE_TRIAL_SUBSCRIBE_TAPPED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  freeTrialMaybeLater: (data: FreeTrialMaybeLaterEvent = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.FREE_TRIAL_MAYBE_LATER,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  tvodPlanDetailPagePopupOpened: (data: TvodPlanDetailPagePopupOpenedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.TVOD_PLAN_DETAIL_PAGE_POPUP_OPENED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  tvodPurchaseStarted: (data: TvodPurchaseStartedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.TVOD_PURCHASE_STARTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  tvodFullAccessWithSvodTapped: (data: TvodFullAccessWithSvodTappedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.TVOD_FULL_ACCESS_WITH_SVOD_TAPPED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  tvodPaymentMethodSelected: (data: TvodPaymentMethodSelectedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.TVOD_PAYMENT_METHOD_SELECTED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  webPaymentMethod: (data: WebPaymentMethodEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.WEB_PAYMENT_METHOD,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  webPaymentMethodSuccess: (data: WebPaymentMethodSuccessEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.WEB_PAYMENT_METHOD_SUCCESS,
    properties: data,
    criticality: EventCriticality.CRITICAL,
  }),

  webPaymentMethodFailure: (data: WebPaymentMethodFailureEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.WEB_PAYMENT_METHOD_FAILURE,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  tvodPurchaseSuccess: (data: TvodPurchaseSuccessEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.TVOD_PURCHASE_SUCCESS,
    properties: data,
    criticality: EventCriticality.CRITICAL,
  }),

  tvodPurchaseFailure: (data: TvodPurchaseFailureEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.TVOD_PURCHASE_FAILURE,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  svodPlanDetailPageEvent: (data: Record<string, any> = {}): AnalyticsEvent => ({
    name: EVENT_NAMES.SVOD_PLAN_DETAIL_PAGE_EVENT,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),
};
