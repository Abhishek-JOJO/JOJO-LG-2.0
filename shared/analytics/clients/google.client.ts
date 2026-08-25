/**
 * Google Tag Client (gtag.js)
 * 
 * Singleton wrapper with:
 * - Domain validation and environment routing
 * - Async non-blocking script injection
 * - Event mapping to GA4 standard events
 * - Dynamic tag assignment (Prod vs Stage)
 */

import { analyticsLogger } from '../utils/logger';
import type { ProviderState } from '../model/provider.types';
import type { AnalyticsEvent } from '../model/common.types';
import { EVENT_NAMES } from '../constants/analytics.constants';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

class GoogleTagClient {
  private state: ProviderState = {
    isInitialized: false,
    isInitializing: false,
  };

  private measurementId: string | null = null;

  /**
   * Initialize Google Tag SDK
   */
  async initialize(): Promise<void> {
    // SSR guard
    if (typeof window === 'undefined') return;

    if (this.state.isInitialized || this.state.isInitializing) return;

    // DOMAIN CHECK AND ROUTING
    const hostname = window.location.hostname;
    const isProductionDomain = hostname === 'jojoapp.in' || hostname === 'www.jojoapp.in';
    const isTestDomain = hostname === 'localhost' || hostname.includes('192.168.') || hostname.includes('stage');

    if (isProductionDomain) {
      this.measurementId = 'G-88PMTCKN2J'; // Production Tag
    } else if (isTestDomain) {
      this.measurementId = 'G-J7HDN3CLD5'; // Stage/Local Tag
    } else {
      analyticsLogger.info(`[GoogleTagClient] Skipped initialization (not on a recognized domain: ${hostname})`);
      return;
    }

    this.state.isInitializing = true;

    try {
      this.injectScript();

      this.state.isInitialized = true;
      this.state.isInitializing = false;
      analyticsLogger.info('[GoogleTagClient] Initialized successfully');
    } catch (error) {
      this.state.isInitializing = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      analyticsLogger.error('[GoogleTagClient] Initialization failed', error);
    }
  }

  /**
   * Track an event using Google Tag
   */
  trackEvent(event: AnalyticsEvent): void {
    if (!this.state.isInitialized) return;
    if (typeof window === 'undefined' || !window.gtag) return;

    try {
      const { name, properties = {} } = event;

      // Map JOJO event names to Google Analytics 4 standard events
      let gaEventName = name;
      const gaParams: Record<string, any> = { ...properties };

      switch (name) {
        case EVENT_NAMES.SIGN_UP_COMPLETED:
          gaEventName = 'sign_up';
          break;
        case EVENT_NAMES.LOGIN_COMPLETED:
          gaEventName = 'login';
          break;
        case EVENT_NAMES.SEARCH_PERFORMED:
          gaEventName = 'search';
          gaParams.search_term = properties.query || properties.searchQuery || '';
          break;
        case EVENT_NAMES.CONTENT_DETAIL_PAGE:
          gaEventName = 'view_item';
          gaParams.items = [{
            item_id: properties.assetId,
            item_name: properties.title || properties.assetTitle,
            item_category: properties.assetType
          }];
          break;
        case EVENT_NAMES.CONTENT_ADDED_TO_WATCHLIST:
          gaEventName = 'add_to_wishlist';
          gaParams.items = [{
            item_id: properties.assetId,
            item_name: properties.title || properties.assetTitle
          }];
          break;
        case EVENT_NAMES.SVOD_PURCHASE_SUCCESS:
        case EVENT_NAMES.TVOD_PURCHASE_SUCCESS:
          gaEventName = 'purchase';
          gaParams.transaction_id = properties.transaction_id;
          gaParams.value = properties.price || properties.value || 0;
          gaParams.currency = properties.currency || 'INR';
          gaParams.items = [{
            item_id: properties.product_id,
            item_name: properties.plan_name || properties.product_id
          }];
          break;
        default:
          // Keep the original name for custom events
          break;
      }

      window.gtag('event', gaEventName, gaParams);
    } catch (error) {
      analyticsLogger.error('[GoogleTagClient] Failed to track event', { error, event });
    }
  }

  /**
   * Injects the gtag.js snippet into the DOM
   */
  private injectScript() {
    if (!this.measurementId) return;
    const document = window.document;

    // Prevent duplicate injection if script already exists
    if (document.querySelector(`script[src*="${this.measurementId}"]`)) {
      return;
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;

    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());

    // Configure the environment-specific measurement ID
    window.gtag('config', this.measurementId, {
      send_page_view: false // We trigger page_view manually via AnalyticsService
    });
  }
}

export const googleTagClient = new GoogleTagClient();
