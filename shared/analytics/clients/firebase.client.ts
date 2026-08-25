/**
 * Firebase Analytics Client (GA4)
 * 
 * Singleton SDK wrapper with:
 * - SSR safety
 * - Queue management
 * - Initialization state tracking
 * - Silent failure in production
 * - GA4 payload normalization
 * - Offline queue support
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties, type Analytics } from 'firebase/analytics';
import { PROVIDER_CONFIG, QUEUE_LIMITS, ANALYTICS_STORAGE_KEYS } from '../constants/analytics.constants';
import { analyticsLogger } from '../utils/logger';
import { normalizeEventName, normalizeEventParams } from '../utils/normalizeForGA4';
import type { ProviderState, QueuedEvent, OfflineQueueItem } from '../model/provider.types';
import type { AnalyticsEvent } from '../model/common.types';
import { v4 as uuidv4 } from 'uuid';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

class FirebaseClient {
  private app: FirebaseApp | null = null;
  private analytics: Analytics | null = null;
  
  private state: ProviderState = {
    isInitialized: false,
    isInitializing: false,
  };
  
  private queue: QueuedEvent[] = [];
  private offlineQueue: OfflineQueueItem[] = [];
  private isOnline: boolean = true;
  private isEnabled: boolean = true;
  
  /**
   * Initialize Firebase SDK
   */
  async initialize(config: FirebaseConfig): Promise<void> {
    // SSR guard
    if (typeof window === 'undefined') {
      analyticsLogger.warn('Firebase: Cannot initialize on server');
      return;
    }
    
    // Already initialized
    if (this.state.isInitialized) {
      analyticsLogger.info('Firebase: Already initialized');
      return;
    }
    
    // Already initializing
    if (this.state.isInitializing) {
      analyticsLogger.info('Firebase: Initialization in progress');
      return;
    }
    
    this.state.isInitializing = true;
    
    try {
      analyticsLogger.info('Firebase: Initializing...', { projectId: config.projectId });
      
      // Initialize Firebase
      this.app = initializeApp(config);
      this.analytics = getAnalytics(this.app);
      
      this.state.isInitialized = true;
      this.state.isInitializing = false;
      this.state.error = undefined;
      
      analyticsLogger.info('Firebase: Initialized successfully');
      
      // Load offline queue
      this.loadOfflineQueue();
      
      // Flush queued events
      this.flushQueue();
      
      // Setup online/offline listeners
      this.setupNetworkListeners();
      
    } catch (error) {
      this.state.isInitializing = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      analyticsLogger.error('Firebase: Initialization failed', error);
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
      analyticsLogger.debug('Firebase: Disabled, skipping event', event.name);
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
    
    if (!this.state.isInitialized || !this.analytics) {
      analyticsLogger.warn('Firebase: Not initialized, cannot identify user');
      return;
    }
    
    try {
      analyticsLogger.info('Firebase: Identifying user', userId);
      
      // Set user ID
      setUserId(this.analytics, userId);
      
      // Set user properties
      if (properties) {
        const normalized = normalizeEventParams(properties);
        setUserProperties(this.analytics, normalized);
      }
      
    } catch (error) {
      analyticsLogger.error('Firebase: Failed to identify user', error);
    }
  }
  
  /**
   * Update user properties
   */
  updateUserProperties(properties: Record<string, any>): void {
    // SSR guard
    if (typeof window === 'undefined') return;
    
    // Disabled check
    if (!this.isEnabled) return;
    
    if (!this.state.isInitialized || !this.analytics) {
      analyticsLogger.warn('Firebase: Not initialized, cannot update properties');
      return;
    }
    
    try {
      analyticsLogger.info('Firebase: Updating user properties', properties);
      
      const normalized = normalizeEventParams(properties);
      setUserProperties(this.analytics, normalized);
      
    } catch (error) {
      analyticsLogger.error('Firebase: Failed to update properties', error);
    }
  }
  
  /**
   * Reset user (logout)
   */
  resetUser(): void {
    // SSR guard
    if (typeof window === 'undefined') return;
    
    if (!this.state.isInitialized || !this.analytics) return;
    
    try {
      analyticsLogger.info('Firebase: Resetting user');
      
      // Clear user ID
      setUserId(this.analytics, null);
      
      // Clear queues
      this.clearQueues();
      
    } catch (error) {
      analyticsLogger.error('Firebase: Failed to reset user', error);
    }
  }
  
  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    analyticsLogger.info('Firebase: Enabled =', enabled);
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
   * Send event to Firebase (direct SDK call with try-catch)
   */
  private sendEvent(event: AnalyticsEvent): void {
    if (!this.analytics) return;
    
    try {
      analyticsLogger.debug('Firebase: Sending event', event.name, event.properties);
      
      // Normalize event name for GA4
      const eventName = normalizeEventName(event.name);
      
      // Merge properties with context
      const payload = {
        ...event.properties,
        ...event.context,
      };
      
      // Normalize parameters for GA4
      const normalizedParams = normalizeEventParams(payload);
      
      // Send to Firebase
      logEvent(this.analytics, eventName, normalizedParams);
      
    } catch (error) {
      analyticsLogger.error('Firebase: Failed to send event', error);
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
      analyticsLogger.warn('Firebase: Queue full, dropped oldest event');
    }
    
    this.queue.push(queuedEvent);
    analyticsLogger.debug('Firebase: Event queued', event.name);
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
      analyticsLogger.warn('Firebase: Event too large, skipping offline queue', event.name);
      return;
    }
    
    // Check queue size
    if (this.offlineQueue.length >= QUEUE_LIMITS.MAX_OFFLINE_QUEUE_SIZE) {
      // Drop oldest
      this.offlineQueue.shift();
      analyticsLogger.warn('Firebase: Offline queue full, dropped oldest event');
    }
    
    this.offlineQueue.push(item);
    this.saveOfflineQueue();
    
    analyticsLogger.debug('Firebase: Event queued offline', event.name);
  }
  
  /**
   * Flush memory queue
   */
  private flushQueue(): void {
    if (this.queue.length === 0) return;
    
    analyticsLogger.info('Firebase: Flushing queue', this.queue.length, 'events');
    
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
    
    analyticsLogger.info('Firebase: Flushing offline queue', this.offlineQueue.length, 'events');
    
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
    analyticsLogger.info('Firebase: Queues cleared');
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
        analyticsLogger.warn('Firebase: Offline queue too large, truncating');
        // Keep only most recent events that fit
        while (this.offlineQueue.length > 0 && JSON.stringify(this.offlineQueue).length > QUEUE_LIMITS.MAX_TOTAL_STORAGE_BYTES) {
          this.offlineQueue.shift();
        }
      }
      
      localStorage.setItem(ANALYTICS_STORAGE_KEYS.OFFLINE_QUEUE + '_firebase', JSON.stringify(this.offlineQueue));
    } catch (error) {
      analyticsLogger.error('Firebase: Failed to save offline queue', error);
    }
  }
  
  /**
   * Load offline queue from localStorage
   */
  private loadOfflineQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const json = localStorage.getItem(ANALYTICS_STORAGE_KEYS.OFFLINE_QUEUE + '_firebase');
      if (json) {
        this.offlineQueue = JSON.parse(json);
        analyticsLogger.info('Firebase: Loaded offline queue', this.offlineQueue.length, 'events');
        
        // Flush offline queue
        this.flushOfflineQueue();
      }
    } catch (error) {
      analyticsLogger.error('Firebase: Failed to load offline queue', error);
    }
  }
  
  /**
   * Setup network listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      analyticsLogger.info('Firebase: Network online');
      this.isOnline = true;
      this.flushOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      analyticsLogger.info('Firebase: Network offline');
      this.isOnline = false;
    });
    
    // Initial state
    this.isOnline = navigator.onLine;
  }
}

// Singleton instance
export const firebaseClient = new FirebaseClient();
