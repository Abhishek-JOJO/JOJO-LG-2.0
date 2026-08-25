/**
 * CleverTap Client
 * 
 * Singleton SDK wrapper with:
 * - SSR safety
 * - Queue management
 * - Initialization state tracking
 * - Silent failure in production
 * - Offline queue support
 */

// Lazy import to avoid SSR issues
let clevertap: any = null;
function getClevertap() {
  if (!clevertap && typeof window !== 'undefined') {
    clevertap = require('clevertap-web-sdk');
  }
  return clevertap;
}

import { PROVIDER_CONFIG, QUEUE_LIMITS, ANALYTICS_STORAGE_KEYS } from '../constants/analytics.constants';
import { analyticsLogger } from '../utils/logger';
import type { ProviderState, QueuedEvent, OfflineQueueItem } from '../model/provider.types';
import type { AnalyticsEvent } from '../model/common.types';
import { v4 as uuidv4 } from 'uuid';

class CleverTapClient {
  private state: ProviderState = {
    isInitialized: false,
    isInitializing: false,
  };
  
  private queue: QueuedEvent[] = [];
  private offlineQueue: OfflineQueueItem[] = [];
  private isOnline: boolean = true;
  private isEnabled: boolean = true;
  
  /**
   * Initialize CleverTap SDK
   */
  async initialize(accountId: string, region: string): Promise<void> {
    // SSR guard
    if (typeof window === 'undefined') {
      analyticsLogger.warn('CleverTap: Cannot initialize on server');
      return;
    }
    
    // Already initialized
    if (this.state.isInitialized) {
      analyticsLogger.info('CleverTap: Already initialized');
      return;
    }
    
    // Already initializing
    if (this.state.isInitializing) {
      analyticsLogger.info('CleverTap: Initialization in progress');
      return;
    }
    
    this.state.isInitializing = true;
    
    try {
      analyticsLogger.info('CleverTap: Initializing...', { accountId, region });
      
      // Get CleverTap SDK
      const ct = getClevertap();
      if (!ct) {
        throw new Error('CleverTap SDK not available');
      }
      
      // Initialize CleverTap
      ct.init(accountId, region);
      ct.privacy.push({ optOut: false });
      ct.privacy.push({ useIP: true });
      
      this.state.isInitialized = true;
      this.state.isInitializing = false;
      this.state.error = undefined;
      
      analyticsLogger.info('CleverTap: Initialized successfully');
      
      // Load offline queue
      this.loadOfflineQueue();
      
      // Flush queued events
      this.flushQueue();
      
      // Setup online/offline listeners
      this.setupNetworkListeners();
      
    } catch (error) {
      this.state.isInitializing = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      analyticsLogger.error('CleverTap: Initialization failed', error);
    }
  }
  
  /**
   * Track event
   */
  trackEvent(event: AnalyticsEvent): void {
    // SSR guard
    if (typeof window === 'undefined') return;
    
    // Disabled check
    if (!this.isEnabled) {
      analyticsLogger.debug('CleverTap: Disabled, skipping event', event.name);
      return;
    }
    
    // Queue if not initialized
    if (!this.state.isInitialized) {
      this.queueEvent(event);
      return;
    }
    
    // Queue if offline
    if (!this.isOnline) {
      this.queueOfflineEvent(event);
      return;
    }
    
    // Send event
    this.sendEvent(event);
  }
  
  /**
   * Identify user
   */
  identifyUser(userId: string, properties?: Record<string, any>): void {
    // SSR guard
    if (typeof window === 'undefined') return;
    
    // Disabled check
    if (!this.isEnabled) return;
    
    if (!this.state.isInitialized) {
      analyticsLogger.warn('CleverTap: Not initialized, cannot identify user');
      return;
    }
    
    try {
      analyticsLogger.info('CleverTap: Identifying user', userId);
      
      const ct = getClevertap();
      if (!ct) return;
      
      // Set user identity (strip null/undefined values — CleverTap rejects them)
      ct.onUserLogin.push({
        Site: this.sanitizeProperties({
          Identity: userId,
          ...properties,
        }),
      });
      
    } catch (error) {
      analyticsLogger.error('CleverTap: Failed to identify user', error);
    }
  }
  
  /**
   * Update user profile
   */
  updateUserProfile(properties: Record<string, any>): void {
    // SSR guard
    if (typeof window === 'undefined') return;
    
    // Disabled check
    if (!this.isEnabled) return;
    
    if (!this.state.isInitialized) {
      analyticsLogger.warn('CleverTap: Not initialized, cannot update profile');
      return;
    }
    
    try {
      analyticsLogger.info('CleverTap: Updating user profile', properties);
      
      const ct = getClevertap();
      if (!ct) return;
      
      ct.profile.push({
        Site: this.sanitizeProperties(properties),
      });
      
    } catch (error) {
      analyticsLogger.error('CleverTap: Failed to update profile', error);
    }
  }
  
  /**
   * Reset user (logout)
   */
  resetUser(): void {
    // SSR guard
    if (typeof window === 'undefined') return;
    
    if (!this.state.isInitialized) return;
    
    try {
      analyticsLogger.info('CleverTap: Resetting user');
      
      const ct = getClevertap();
      if (!ct) return;
      
      // Clear user data
      ct.logout();
      
      // Clear queues
      this.clearQueues();
      
    } catch (error) {
      analyticsLogger.error('CleverTap: Failed to reset user', error);
    }
  }
  
  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    analyticsLogger.info('CleverTap: Enabled =', enabled);
  }
  
  /**
   * Get initialization state
   */
  getState(): ProviderState {
    return { ...this.state };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  /**
   * Recursively strip null and undefined values from a properties object.
   * CleverTap SDK logs warning 545 for ANY null value, including nested keys
   * like `user.email` that come from auto-injected event context.
   */
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.sanitizeProperties(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  
  /**
   * Send event to CleverTap (direct SDK call with try-catch)
   */
  private sendEvent(event: AnalyticsEvent): void {
    try {
      analyticsLogger.debug('CleverTap: Sending event', event.name, event.properties);
      
      const ct = getClevertap();
      if (!ct) return;
      
      // Merge properties with context and strip null/undefined values
      const payload = this.sanitizeProperties({
        ...event.properties,
        ...event.context,
      });
      
      // Send to CleverTap
      ct.event.push(event.name, payload);
      
    } catch (error) {
      analyticsLogger.error('CleverTap: Failed to send event', error);
    }
  }
  
  /**
   * Queue event (memory)
   */
  private queueEvent(event: AnalyticsEvent): void {
    const queuedEvent: QueuedEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    
    // Check queue size
    if (this.queue.length >= QUEUE_LIMITS.MAX_QUEUE_SIZE) {
      // Drop oldest
      this.queue.shift();
      analyticsLogger.warn('CleverTap: Queue full, dropped oldest event');
    }
    
    this.queue.push(queuedEvent);
    analyticsLogger.debug('CleverTap: Event queued', event.name);
  }
  
  /**
   * Queue offline event (localStorage)
   */
  private queueOfflineEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined') return;
    
    const queuedEvent: QueuedEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    
    const item: OfflineQueueItem = {
      event: queuedEvent,
      timestamp: new Date().toISOString(),
      size_bytes: JSON.stringify(queuedEvent).length,
    };
    
    // Check event size
    if (item.size_bytes > QUEUE_LIMITS.MAX_EVENT_SIZE_BYTES) {
      analyticsLogger.warn('CleverTap: Event too large, skipping offline queue', event.name);
      return;
    }
    
    // Check queue size
    if (this.offlineQueue.length >= QUEUE_LIMITS.MAX_OFFLINE_QUEUE_SIZE) {
      // Drop oldest
      this.offlineQueue.shift();
      analyticsLogger.warn('CleverTap: Offline queue full, dropped oldest event');
    }
    
    this.offlineQueue.push(item);
    this.saveOfflineQueue();
    
    analyticsLogger.debug('CleverTap: Event queued offline', event.name);
  }
  
  /**
   * Flush memory queue
   */
  private flushQueue(): void {
    if (this.queue.length === 0) return;
    
    analyticsLogger.info('CleverTap: Flushing queue', this.queue.length, 'events');
    
    // Sort by timestamp (chronological order)
    this.queue.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Send all queued events
    const events = [...this.queue];
    this.queue = [];
    
    events.forEach(event => this.sendEvent(event));
  }
  
  /**
   * Flush offline queue
   */
  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;
    
    analyticsLogger.info('CleverTap: Flushing offline queue', this.offlineQueue.length, 'events');
    
    // Sort by timestamp (chronological order)
    this.offlineQueue.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Send all offline events
    const items = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();
    
    items.forEach(item => this.sendEvent(item.event));
  }
  
  /**
   * Clear all queues
   */
  private clearQueues(): void {
    this.queue = [];
    this.offlineQueue = [];
    this.saveOfflineQueue();
    analyticsLogger.info('CleverTap: Queues cleared');
  }
  
  /**
   * Save offline queue to localStorage
   */
  private saveOfflineQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const json = JSON.stringify(this.offlineQueue);
      const size = json.length;
      
      // Check total storage size
      if (size > QUEUE_LIMITS.MAX_TOTAL_STORAGE_BYTES) {
        analyticsLogger.warn('CleverTap: Offline queue too large, truncating');
        // Keep only most recent events that fit
        while (this.offlineQueue.length > 0 && JSON.stringify(this.offlineQueue).length > QUEUE_LIMITS.MAX_TOTAL_STORAGE_BYTES) {
          this.offlineQueue.shift();
        }
      }
      
      localStorage.setItem(ANALYTICS_STORAGE_KEYS.OFFLINE_QUEUE + '_clevertap', JSON.stringify(this.offlineQueue));
    } catch (error) {
      analyticsLogger.error('CleverTap: Failed to save offline queue', error);
    }
  }
  
  /**
   * Load offline queue from localStorage
   */
  private loadOfflineQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const json = localStorage.getItem(ANALYTICS_STORAGE_KEYS.OFFLINE_QUEUE + '_clevertap');
      if (json) {
        this.offlineQueue = JSON.parse(json);
        analyticsLogger.info('CleverTap: Loaded offline queue', this.offlineQueue.length, 'events');
        
        // Flush offline queue
        this.flushOfflineQueue();
      }
    } catch (error) {
      analyticsLogger.error('CleverTap: Failed to load offline queue', error);
    }
  }
  
  /**
   * Setup network listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      analyticsLogger.info('CleverTap: Network online');
      this.isOnline = true;
      this.flushOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      analyticsLogger.info('CleverTap: Network offline');
      this.isOnline = false;
    });
    
    // Initial state
    this.isOnline = navigator.onLine;
  }
}

// Singleton instance
export const cleverTapClient = new CleverTapClient();
