/**
 * Provider Types
 * 
 * Analytics provider configuration and state management
 */

/**
 * Supported analytics providers
 */
export enum AnalyticsProvider {
  CLEVERTAP = 'clevertap',
  FIREBASE = 'firebase',
  BACKEND = 'backend',
  META_PIXEL = 'meta_pixel',
  GOOGLE_TAG = 'google_tag',
}

/**
 * Event criticality levels for queue management
 */
export enum EventCriticality {
  LOW = 'low',           // UI interactions - can be lost
  MEDIUM = 'medium',     // Screen views - nice to have
  HIGH = 'high',         // Business events - persist in memory
  CRITICAL = 'critical', // Transactions - persist to localStorage
}

/**
 * Provider initialization state
 */
export interface ProviderState {
  isInitialized: boolean;
  isInitializing: boolean;
  error?: string;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxSize: number;
  overflowStrategy: 'drop_oldest' | 'drop_newest';
}

/**
 * Default queue configurations by criticality
 */
export const QUEUE_CONFIGS: Record<EventCriticality, QueueConfig> = {
  [EventCriticality.LOW]: {
    maxSize: 50,
    overflowStrategy: 'drop_oldest',
  },
  [EventCriticality.MEDIUM]: {
    maxSize: 100,
    overflowStrategy: 'drop_oldest',
  },
  [EventCriticality.HIGH]: {
    maxSize: 100,
    overflowStrategy: 'drop_oldest',
  },
  [EventCriticality.CRITICAL]: {
    maxSize: 200,
    overflowStrategy: 'drop_oldest',
  },
};

/**
 * Queued event (with metadata)
 */
export interface QueuedEvent {
  id: string;
  name: string;
  properties?: Record<string, any>;
  criticality?: EventCriticality;
  providers?: AnalyticsProvider[];
  context?: any;
  timestamp: string;
  retryCount: number;
}

/**
 * Offline queue item
 */
export interface OfflineQueueItem {
  event: QueuedEvent;
  timestamp: string;
  size_bytes: number;
}
