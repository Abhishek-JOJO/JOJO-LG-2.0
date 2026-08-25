/**
 * Meta Pixel Client (Facebook Pixel)
 * 
 * Production-ready singleton wrapper following official Meta Pixel documentation:
 * - https://developers.facebook.com/docs/meta-pixel/
 * - https://www.facebook.com/business/help/402791146561655?id=1205376682832142
 * 
 * Features:
 * - Singleton architecture with strict load guards
 * - Async, non-blocking script injection & Promise-based script load waiting
 * - SSR safety (`typeof window !== 'undefined'`)
 * - Environment validation (no hardcoded production domains)
 * - Next.js App Router SPA PageView handling & deduplication
 * - Official Meta Standard Event mapping with exact casing
 * - Custom event automatic fallback (`trackCustom`)
 * - Event queueing while SDK initializes
 * - Strict payload sanitization (removes null, undefined, empty strings, NaN)
 * - Specialized transformers for Purchase, ViewContent, Search, and Registration events
 * - Zero usage of `any` (100% type safe)
 * - Safe error handling (fail silently in production, log in development)
 */

import { analyticsLogger } from '../utils/logger';
import type { ProviderState } from '../model/provider.types';
import type { AnalyticsEvent } from '../model/common.types';
import { EVENT_NAMES, isDevelopment } from '../constants/analytics.constants';

/**
 * Official Meta Pixel Standard Event Names (Case-Sensitive)
 */
export type MetaStandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'CompleteRegistration'
  | 'Purchase'
  | 'AddToWishlist'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Subscribe'
  | 'StartTrial'
  | 'Lead'
  | 'Contact'
  | 'Schedule'
  | 'Donate'
  | 'FindLocation'
  | 'CustomizeProduct'
  | 'SubmitApplication';

/**
 * Strongly typed Meta Pixel payload parameters
 */
export interface MetaPayload extends Record<string, unknown> {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: Array<string | number>;
  content_type?: string;
  order_id?: string | number;
  num_items?: number;
  search_string?: string;
  status?: string;
}

/**
 * Strongly typed window.fbq interface according to Meta Pixel JS SDK
 */
export interface FbqArguments {
  (command: 'init', pixelId: string, userData?: Record<string, unknown>): void;
  (command: 'track', eventName: MetaStandardEvent, payload?: MetaPayload): void;
  (command: 'trackCustom', eventName: string, payload?: Record<string, unknown>): void;
}

export interface FbqFunction extends FbqArguments {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: FbqFunction;
}

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

/**
 * Direct mapping from internal analytics event names to official Meta Standard Events
 */
const META_STANDARD_EVENTS: Record<string, MetaStandardEvent> = {
  [EVENT_NAMES.PAGE_VIEW]: 'PageView',
  [EVENT_NAMES.CONTENT_DETAIL_PAGE]: 'ViewContent',
  [EVENT_NAMES.SEARCH_PERFORMED]: 'Search',
  [EVENT_NAMES.SIGN_UP_COMPLETED]: 'CompleteRegistration',
  [EVENT_NAMES.SVOD_PURCHASE_SUCCESS]: 'Purchase',
  [EVENT_NAMES.TVOD_PURCHASE_SUCCESS]: 'Purchase',
  [EVENT_NAMES.CONTENT_ADDED_TO_WATCHLIST]: 'AddToWishlist',
  [EVENT_NAMES.SVOD_PURCHASE_STARTED]: 'InitiateCheckout',
  [EVENT_NAMES.TVOD_PURCHASE_STARTED]: 'InitiateCheckout',
  [EVENT_NAMES.SVOD_PAYMENT_METHOD_SELECTED]: 'AddPaymentInfo',
  [EVENT_NAMES.TVOD_PAYMENT_METHOD_SELECTED]: 'AddPaymentInfo',
  [EVENT_NAMES.WEB_PAYMENT_METHOD]: 'AddPaymentInfo',
  [EVENT_NAMES.FREE_TRIAL_SUBSCRIBE_TAPPED]: 'StartTrial',
  [EVENT_NAMES.SVOD_PLAN_SELECTED]: 'Subscribe',
};

const DEFAULT_PIXEL_ID = '643613694636024';

class MetaPixelClient {
  private state: ProviderState = {
    isInitialized: false,
    isInitializing: false,
  };

  private pixelId: string = DEFAULT_PIXEL_ID;
  private eventQueue: AnalyticsEvent[] = [];
  private lastTrackedPageViewUrl: string | null = null;

  /**
   * Validates environment settings to determine if Meta Pixel is enabled.
   */
  isMetaEnabled(): boolean {
    if (typeof window === 'undefined') return false;

    // Direct environment control flag override
    const enableFlag = process.env.NEXT_PUBLIC_ENABLE_META_PIXEL;
    if (enableFlag === 'false') return false;
    if (enableFlag === 'true') return true;

    // Default: enable in production environment
    const envType = process.env.NEXT_PUBLIC_ENV_TYPE || process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV;
    return envType === 'prod' || envType === 'production';
  }

  /**
   * Initialize Meta Pixel SDK.
   * Loads the SDK script asynchronously and queues any events fired during script download.
   */
  async initialize(pixelId?: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.state.isInitialized || this.state.isInitializing) return;

    if (pixelId) {
      this.pixelId = pixelId;
    } else if (process.env.NEXT_PUBLIC_META_PIXEL_ID) {
      this.pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    }

    if (!this.isMetaEnabled()) {
      if (isDevelopment()) {
        analyticsLogger.info('[MetaPixelClient] Skipped initialization (disabled in current environment)');
      }
      return;
    }

    this.state.isInitializing = true;

    try {
      await this.loadScript(this.pixelId);
      this.state.isInitialized = true;
      this.state.isInitializing = false;

      if (isDevelopment()) {
        analyticsLogger.info('[MetaPixelClient] Initialized successfully with Pixel ID:', this.pixelId);
      }

      this.flushQueue();
    } catch (error) {
      this.state.isInitializing = false;
      this.state.error = error instanceof Error ? error.message : 'Meta Pixel Script load failed';
      if (isDevelopment()) {
        analyticsLogger.error('[MetaPixelClient] Initialization failed', error);
      }
    }
  }

  /**
   * Injects and loads the Facebook Pixel script, waiting asynchronously for script onload.
   */
  private loadScript(pixelId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Setup window.fbq queue stub if not present
      if (!window.fbq) {
        const fbqStub: FbqFunction = function (...args: unknown[]) {
          if (fbqStub.callMethod) {
            fbqStub.callMethod(...args);
          } else if (fbqStub.queue) {
            fbqStub.queue.push(args);
          }
        };

        fbqStub.queue = [];
        fbqStub.loaded = true;
        fbqStub.version = '2.0';

        window.fbq = fbqStub;
        if (!window._fbq) {
          window._fbq = fbqStub;
        }
      }

      // Check if script element is already present in DOM
      const existingScript = document.querySelector('script[src="https://connect.facebook.net/en_US/fbevents.js"]');
      if (existingScript) {
        window.fbq?.('init', pixelId);
        resolve();
        return;
      }

      const scriptElement = this.injectScript();

      scriptElement.onload = () => {
        try {
          window.fbq?.('init', pixelId);
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      scriptElement.onerror = (event) => {
        reject(new Error(`Failed to load Meta Pixel script from ${scriptElement.src}: ${String(event)}`));
      };
    });
  }

  /**
   * Helper to create and insert the `<script>` tag into DOM head/body
   */
  private injectScript(): HTMLScriptElement {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      (document.head || document.body).appendChild(script);
    }

    return script;
  }

  /**
   * Maps an internal event name to a Meta Standard Event name (if exists)
   */
  mapEvent(eventName: string): MetaStandardEvent | null {
    return META_STANDARD_EVENTS[eventName] || null;
  }

  /**
   * Tracks an incoming analytics event via Meta Pixel SDK.
   */
  trackEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined' || !this.isMetaEnabled()) return;

    if (!this.state.isInitialized) {
      if (this.state.isInitializing) {
        this.eventQueue.push(event);
      }
      return;
    }

    if (!window.fbq) {
      if (isDevelopment()) {
        analyticsLogger.warn('[MetaPixelClient] window.fbq missing when tracking event', event.name);
      }
      return;
    }

    try {
      const { name, properties = {} } = event;
      const standardEvent = this.mapEvent(name);

      if (standardEvent) {
        this.trackStandardEvent(standardEvent, properties);
      } else {
        this.trackCustomEvent(name, properties);
      }
    } catch (error) {
      if (isDevelopment()) {
        analyticsLogger.error('[MetaPixelClient] Failed to track event', { error, event });
      }
    }
  }

  /**
   * Sends a Meta Standard Event with official payload structure
   */
  trackStandardEvent(eventName: MetaStandardEvent, payload: Record<string, unknown> = {}): void {
    if (!window.fbq) return;

    try {
      // Special handling for PageView in Next.js SPA to avoid duplicate route events
      if (eventName === 'PageView') {
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
        if (currentUrl && currentUrl === this.lastTrackedPageViewUrl) {
          if (isDevelopment()) {
            analyticsLogger.info('[MetaPixelClient] Duplicate PageView skipped for URL:', currentUrl);
          }
          return;
        }
        this.lastTrackedPageViewUrl = currentUrl;
        window.fbq('track', 'PageView', this.sanitizePayload(payload));
        return;
      }

      const transformedPayload = this.transformStandardPayload(eventName, payload);
      const sanitized = this.sanitizePayload(transformedPayload);

      window.fbq('track', eventName, sanitized);

      if (isDevelopment()) {
        analyticsLogger.info(`[MetaPixelClient] fbq('track', '${eventName}')`, sanitized);
      }
    } catch (error) {
      if (isDevelopment()) {
        analyticsLogger.error(`[MetaPixelClient] Error tracking standard event '${eventName}'`, error);
      }
    }
  }

  /**
   * Sends a Custom Meta Pixel Event
   */
  trackCustomEvent(eventName: string, payload: Record<string, unknown> = {}): void {
    if (!window.fbq) return;

    try {
      const sanitized = this.sanitizePayload(payload);
      window.fbq('trackCustom', eventName, sanitized);

      if (isDevelopment()) {
        analyticsLogger.info(`[MetaPixelClient] fbq('trackCustom', '${eventName}')`, sanitized);
      }
    } catch (error) {
      if (isDevelopment()) {
        analyticsLogger.error(`[MetaPixelClient] Error tracking custom event '${eventName}'`, error);
      }
    }
  }

  /**
   * Normalizes specific standard event payloads to conform strictly with official Meta Pixel specs
   */
  private transformStandardPayload(
    eventName: MetaStandardEvent,
    properties: Record<string, unknown>
  ): MetaPayload {
    const payload: MetaPayload = { ...properties };

    switch (eventName) {
      case 'Purchase': {
        const priceVal = properties.price ?? properties.amount ?? properties.value;
        const numericVal = typeof priceVal === 'number' ? priceVal : parseFloat(String(priceVal || 0));
        payload.value = isNaN(numericVal) ? 0 : numericVal;
        payload.currency = (properties.currency as string) || 'INR';

        const assetId = properties.assetId ?? properties.content_id ?? properties.package_id ?? properties.plan_id;
        if (assetId !== undefined && assetId !== null) {
          payload.content_ids = Array.isArray(assetId) ? assetId : [String(assetId)];
        } else {
          payload.content_ids = [];
        }

        payload.content_type = (properties.content_type as string) || (properties.assetType as string) || 'product';
        if (properties.title || properties.assetTitle || properties.plan_name) {
          payload.content_name = String(properties.title || properties.assetTitle || properties.plan_name);
        }
        break;
      }

      case 'ViewContent': {
        payload.content_name = String(
          properties.content_name || properties.title || properties.assetTitle || ''
        );
        payload.content_type = String(
          properties.content_type || properties.assetType || ''
        );

        const assetId = properties.assetId ?? properties.content_id ?? properties.asset_id;
        if (assetId !== undefined && assetId !== null) {
          payload.content_ids = Array.isArray(assetId) ? assetId : [String(assetId)];
        } else if (Array.isArray(properties.content_ids)) {
          payload.content_ids = properties.content_ids;
        } else {
          payload.content_ids = [];
        }
        break;
      }

      case 'Search': {
        const queryStr = properties.search_string || properties.query || properties.searchQuery || '';
        payload.search_string = String(queryStr);
        break;
      }

      case 'CompleteRegistration': {
        if (properties.status) {
          payload.status = String(properties.status);
        }
        break;
      }

      default:
        break;
    }

    return payload;
  }

  /**
   * Sanitizes payloads by recursively removing undefined, null, empty strings (""), and NaN values
   */
  sanitizePayload(payload?: Record<string, unknown>): MetaPayload {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const cleaned: MetaPayload = {};

    for (const key of Object.keys(payload)) {
      const val = payload[key];

      if (val === undefined || val === null || val === '') {
        continue;
      }

      if (typeof val === 'number' && isNaN(val)) {
        continue;
      }

      if (Array.isArray(val)) {
        const cleanArr = val.filter((item) => item !== undefined && item !== null && item !== '');
        if (cleanArr.length > 0) {
          cleaned[key] = cleanArr;
        }
        continue;
      }

      if (typeof val === 'object' && val.constructor === Object) {
        const cleanNested = this.sanitizePayload(val as Record<string, unknown>);
        if (Object.keys(cleanNested).length > 0) {
          cleaned[key] = cleanNested;
        }
        continue;
      }

      cleaned[key] = val;
    }

    return cleaned;
  }

  /**
   * Flushes all queued events accumulated while the SDK script was downloading
   */
  private flushQueue(): void {
    if (this.eventQueue.length === 0) return;

    if (isDevelopment()) {
      analyticsLogger.info(`[MetaPixelClient] Flushing ${this.eventQueue.length} queued events`);
    }

    const queueToProcess = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of queueToProcess) {
      this.trackEvent(event);
    }
  }

  /**
   * Resets client state and queues (useful for testing or teardown)
   */
  destroy(): void {
    this.state = {
      isInitialized: false,
      isInitializing: false,
    };
    this.eventQueue = [];
    this.lastTrackedPageViewUrl = null;
  }
}

export const metaPixelClient = new MetaPixelClient();
