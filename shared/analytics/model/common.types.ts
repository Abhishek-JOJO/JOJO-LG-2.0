/**
 * Common Event Types
 * 
 * General application events (screens, interactions, errors, lifecycle)
 */

import type { AnalyticsProvider, EventCriticality } from './provider.types';
import type { EventContext } from './context.types';

/**
 * Base analytics event
 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  criticality?: EventCriticality;
  providers?: AnalyticsProvider[]; // If specified, only send to these providers
  context?: Partial<EventContext>; // Additional context (merged with auto-context)
}

/**
 * Screen view event
 */
export interface ScreenViewedEvent {
  screen_name: string;
  screen_path: string;
  referrer?: string;
  previous_screen?: string;
}

/**
 * Button click event
 */
export interface ButtonClickedEvent {
  button_name: string;
  button_location: string;
  screen_name: string;
}

/**
 * Error event
 * 
 * SECURITY NOTE: Never include raw error.stack in analytics.
 * Only send sanitized error information.
 */
export interface ErrorOccurredEvent {
  error_type: string;
  error_code?: string;
  error_message: string;
  screen_name?: string;
  component_name?: string;
}

/**
 * App opened event
 */
export interface AppOpenedEvent {
  is_first_open: boolean;
  referrer?: string;
}

/**
 * App backgrounded event
 */
export interface AppBackgroundedEvent {
  session_duration_seconds: number;
}
