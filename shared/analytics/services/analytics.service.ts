"use client";

import { cleverTapClient } from '../clients/clevertap.client';
import { firebaseClient } from '../clients/firebase.client';
import { backendClient } from '../clients/backend.client';
import { metaPixelClient } from '../clients/meta.client';
import { googleTagClient } from '../clients/google.client';
import { isProduction } from '../constants/analytics.constants';
import type { AnalyticsEvent } from '../model/common.types';
import type { EventContext } from '../model/context.types';
import { AnalyticsProvider } from '../model/provider.types';
import { buildDevicePayload } from '../utils/buildDevicePayload';
import { buildUserPayload } from '../utils/buildUserPayload';
import { buildSessionPayload, resetSession } from '../utils/buildSessionPayload';
import { milestoneTracker } from '../utils/milestoneTracker';
import { analyticsLogger } from '../utils/logger';

// Import event builders
import { authEvents } from '../events/auth.events';
import { profileEvents } from '../events/profile.events';
import { playbackEvents } from '../events/playback.events';
import { adEvents } from '../events/ad.events';
import { commonEvents } from '../events/common.events';
import { contentEvents } from '../events/content.events';
import { purchaseEvents } from '../events/purchase.events';
import { cleanProperties, getPresentUrlAttribution } from '../utils/cleanProperties';
import { AttributionManager } from "@/lib/deeplink/attributionManager";
import { appConfig } from '@/lib/config/app.config';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { DEFAULT_HEADER_VALUES } from '@/lib/constants/headers';

class AnalyticsService {
  private isInitialized = false;
  private isEnabled = true;

  async initialize(config: {
    clevertap?: {
      accountId: string;
      region: string;
    };
    firebase?: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
      measurementId: string;
    };
  }): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (config.clevertap && process.env.NEXT_PUBLIC_ENABLE_CLEVERTAP) {
        await cleverTapClient.initialize(
          config.clevertap.accountId,
          config.clevertap.region
        );
      }
      if (config.firebase && process.env.NEXT_PUBLIC_ENABLE_FIREBASE) {
        await firebaseClient.initialize(config.firebase);
      }
      if (process.env.NEXT_PUBLIC_ENABLE_BACKEND_ANALYTICS) {
        backendClient.initialize();
      }

      // Meta Pixel autonomously checks for the production domain (jojoapp.in) before injecting scripts
      await metaPixelClient.initialize();

      // Google Tag autonomously checks for the production domain before injecting scripts
      await googleTagClient.initialize();

      this.isInitialized = true;
      analyticsLogger.info("AnalyticsService initialized successfully");
    } catch (error) {
      analyticsLogger.error('AnalyticsService init failed', error);
    }
  }

  track(event: AnalyticsEvent | string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;
    // Guard: if event is undefined/null (e.g. EVENT_NAMES key doesn't exist), skip silently
    if (!event) {
      analyticsLogger.warn('[Analytics] track() called with undefined/null event — skipped');
      return;
    }
    try {
      let enrichedEvent: AnalyticsEvent;
      const urlAttribution = getPresentUrlAttribution();

      const authState = useAuthStore.getState();
      const profileState = useProfileStore.getState();

      const defaultProperties = {
        custom_platform: appConfig.CUSTOME_PLATFORM_EVENT_NAME,
        version: process.env.NEXT_PUBLIC_APP_VERSION,
        profile_id: profileState.selectedProfile?.profile_id || "",
        user_id: authState.user?.id ? String(authState.user.id) : "",
        sessionid: authState.token || "",
        deviceTypeCode: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
        timestamp: new Date().toISOString(),
      };

      if (typeof event === 'string') {
        enrichedEvent = {
          name: event,
          properties: cleanProperties({
            ...defaultProperties,
            ...urlAttribution,
            ...properties,
          }),
          context: this.buildContext(),
        };
      } else {
        enrichedEvent = {
          ...event,
          properties: cleanProperties({
            ...defaultProperties,
            ...urlAttribution,
            ...event.properties,
          }),
          context: this.buildContext(event.context),
        };
      }

      analyticsLogger.info(`[Analytics] ${enrichedEvent.name}`, {
        properties: enrichedEvent.properties,
        context: enrichedEvent.context
      });

      // Determine which active providers are enabled in env
      const activeProviders: AnalyticsProvider[] = [];
      if (process.env.NEXT_PUBLIC_ENABLE_CLEVERTAP === 'true') {
        activeProviders.push(AnalyticsProvider.CLEVERTAP);
      }
      if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
        activeProviders.push(AnalyticsProvider.FIREBASE);
      }
      if (process.env.NEXT_PUBLIC_ENABLE_BACKEND_ANALYTICS !== 'false') {
        activeProviders.push(AnalyticsProvider.BACKEND);
      }
      // Always add META_PIXEL; the client internally guards against inactive or non-production tracking
      activeProviders.push(AnalyticsProvider.META_PIXEL);
      // Always add GOOGLE_TAG; the client internally guards against inactive or non-production tracking
      activeProviders.push(AnalyticsProvider.GOOGLE_TAG);

      // Intersect with event-specific providers if they are defined
      const providers = enrichedEvent.providers
        ? enrichedEvent.providers.filter(p => activeProviders.includes(p))
        : activeProviders;

      // Broadcast event for the internal Chrome Extension helper using postMessage
      // Security: Only broadcast in non-production environments (stage or local)
      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENV_TYPE !== 'prod') {
        window.postMessage(
          {
            type: "JOJO_ANALYTICS_EVENT",
            payload: {
              event: enrichedEvent,
              providers,
              timestamp: Date.now()
            }
          },
          "*"
        );
      }

      // Send to providers
      if (providers.includes(AnalyticsProvider.CLEVERTAP)) {
        cleverTapClient.trackEvent(enrichedEvent);
      }

      if (providers.includes(AnalyticsProvider.FIREBASE)) {
        firebaseClient.trackEvent(enrichedEvent);
      }

      if (providers.includes(AnalyticsProvider.BACKEND)) {
        backendClient.trackEvent(enrichedEvent);
      }

      if (providers.includes(AnalyticsProvider.META_PIXEL)) {
        metaPixelClient.trackEvent(enrichedEvent);
      }

      if (providers.includes(AnalyticsProvider.GOOGLE_TAG)) {
        googleTagClient.trackEvent(enrichedEvent);
      }
    } catch (error) {
      analyticsLogger.error('Analytics: Failed to track event', error);
    }
  }

  // ============================================================================
  // AUTH EVENTS
  // ============================================================================

  trackSignUpStarted(data: Parameters<typeof authEvents.signUpStarted>[0] = {}): void {
    this.track(authEvents.signUpStarted(data));
  }

  trackSignUpCompleted(data: Parameters<typeof authEvents.signUpCompleted>[0]): void {
    this.track(authEvents.signUpCompleted(data));
  }

  trackLoginStarted(data: Parameters<typeof authEvents.loginStarted>[0] = {}): void {
    this.track(authEvents.loginStarted(data));
  }

  trackLoginCompleted(data: Parameters<typeof authEvents.loginCompleted>[0]): void {
    this.track(authEvents.loginCompleted(data));
  }

  trackLoginFailed(data: Parameters<typeof authEvents.loginFailed>[0] = {}): void {
    this.track(authEvents.loginFailed(data));
  }

  trackLogout(data: Parameters<typeof authEvents.logout>[0] = {}): void {
    this.track(authEvents.logout(data));
  }

  trackWebBffIpTracking(data: Parameters<typeof commonEvents.webBffIpTracking>[0] = {}): void {
    this.track(commonEvents.webBffIpTracking(data));
  }

  trackGuestBrowsingStarted(data: Parameters<typeof authEvents.guestBrowsingStarted>[0] = {}): void {
    this.track(authEvents.guestBrowsingStarted(data));
  }

  trackOtpRequested(data: Parameters<typeof authEvents.otpRequested>[0] = {}): void {
    this.track(authEvents.otpRequested(data));
  }

  trackOtpVerifiedSuccess(data: Parameters<typeof authEvents.otpVerifiedSuccess>[0] = {}): void {
    this.track(authEvents.otpVerifiedSuccess(data));
  }

  trackOtpVerifiedFailed(data: Parameters<typeof authEvents.otpVerifiedFailed>[0] = {}): void {
    analyticsLogger.info('[Analytics] Tracking OTP verification failed', { reason: data.reason });
    this.track(authEvents.otpVerifiedFailed(data));
  }

  trackSpecialUserBypass(data: Parameters<typeof authEvents.specialUserBypass>[0]): void {
    this.track(authEvents.specialUserBypass(data));
  }

  // ============================================================================
  // PROFILE EVENTS
  // ============================================================================

  trackProfileCreated(data: Parameters<typeof profileEvents.profileCreated>[0]): void {
    this.track(profileEvents.profileCreated(data));
  }

  trackProfileAdded(data: Parameters<typeof profileEvents.profileAdded>[0]): void {
    this.track(profileEvents.profileAdded(data));
  }

  trackProfileSelected(data: Parameters<typeof profileEvents.profileSelected>[0]): void {
    this.track(profileEvents.profileSelected(data));
  }

  trackProfileEdited(data: Parameters<typeof profileEvents.profileEdited>[0]): void {
    this.track(profileEvents.profileEdited(data));
  }

  trackProfileSwitched(data: Parameters<typeof profileEvents.profileSwitched>[0]): void {
    this.track(profileEvents.profileSwitched(data));
  }

  trackProfileUpgradeToGoldTapped(data: Parameters<typeof profileEvents.profileUpgradeToGoldTapped>[0]): void {
    this.track(profileEvents.profileUpgradeToGoldTapped(data));
  }

  // ============================================================================
  // CONTENT EVENTS
  // ============================================================================

  trackContentClicked(data: Parameters<typeof contentEvents.contentClicked>[0]): void {
    this.track(contentEvents.contentClicked(data));
  }

  trackArtistClicked(data: Parameters<typeof contentEvents.artistClicked>[0]): void {
    this.track(contentEvents.artistClicked(data));
  }

  trackGenreClicked(data: Parameters<typeof contentEvents.genreClicked>[0]): void {
    this.track(contentEvents.genreClicked(data));
  }

  trackContentDetailPage(data: Parameters<typeof contentEvents.contentDetailPage>[0]): void {
    this.track(contentEvents.contentDetailPage(data));
  }

  trackContentAddedToWatchlist(data: Parameters<typeof contentEvents.contentAddedToWatchlist>[0]): void {
    this.track(contentEvents.contentAddedToWatchlist(data));
  }

  trackContentRemovedFromWatchlist(data: Parameters<typeof contentEvents.contentRemovedFromWatchlist>[0]): void {
    this.track(contentEvents.contentRemovedFromWatchlist(data));
  }

  // ============================================================================
  // SEARCH EVENTS
  // ============================================================================

  trackSearchOpened(data: Parameters<typeof commonEvents.searchOpened>[0] = {}): void {
    this.track(commonEvents.searchOpened(data));
  }

  trackSearchClosed(data: Parameters<typeof commonEvents.searchClosed>[0] = {}): void {
    this.track(commonEvents.searchClosed(data));
  }

  trackSearchPerformed(data: Parameters<typeof commonEvents.searchPerformed>[0]): void {
    this.track(commonEvents.searchPerformed(data));
  }

  trackAssetCastClicked(data: Parameters<typeof contentEvents.assetCastClicked>[0]): void {
    this.track(contentEvents.assetCastClicked(data));
  }

  trackContentEpisodeClicked(data: Parameters<typeof contentEvents.contentEpisodeClicked>[0]): void {
    this.track(contentEvents.contentEpisodeClicked(data));
  }

  trackContentTrailerClicked(data: Parameters<typeof contentEvents.contentTrailerClicked>[0]): void {
    this.track(contentEvents.contentTrailerClicked(data));
  }

  trackContentShared(data: Parameters<typeof contentEvents.contentShared>[0]): void {
    this.track(contentEvents.contentShared(data));
  }

  trackStartWatchingClicked(data: Parameters<typeof contentEvents.startWatchingClicked>[0]): void {
    this.track(contentEvents.startWatchingClicked(data));
  }

  trackWatchLaterClicked(data: Parameters<typeof contentEvents.watchLaterClicked>[0]): void {
    this.track(contentEvents.watchLaterClicked(data));
  }

  // ============================================================================
  // PLAYBACK EVENTS
  // ============================================================================

  trackPlayButtonClicked(data: Parameters<typeof playbackEvents.playButtonClicked>[0]): void {
    this.track(playbackEvents.playButtonClicked(data));
  }

  trackResumeButtonClicked(data: Parameters<typeof playbackEvents.resumeButtonClicked>[0]): void {
    this.track(playbackEvents.resumeButtonClicked(data));
  }

  trackPlaybackStarted(data: Parameters<typeof playbackEvents.playbackStarted>[0]): void {
    if (data.content_id || data.asset_id) {
      milestoneTracker.startTracking(String(data.content_id || data.asset_id));
    }
    this.track(playbackEvents.playbackStarted(data));
  }

  trackPlaybackPaused(data: Parameters<typeof playbackEvents.playbackPaused>[0]): void {
    this.track(playbackEvents.playbackPaused(data));
  }

  trackPlaybackEnd(data: Parameters<typeof playbackEvents.playbackEnd>[0]): void {
    this.track(playbackEvents.playbackEnd(data));
  }

  trackPlaybackResumed(data: Parameters<typeof playbackEvents.playbackResumed>[0]): void {
    this.track(playbackEvents.playbackResumed(data));
  }

  trackPlaybackCompleted(data: Parameters<typeof playbackEvents.playbackCompleted>[0]): void {
    milestoneTracker.stopTracking(data.content_id);
    this.track(playbackEvents.playbackCompleted(data));
  }

  trackPlaybackSeeked(data: Parameters<typeof playbackEvents.playbackSeeked>[0]): void {
    this.track(playbackEvents.playbackSeeked(data));
  }

  trackPlaybackBackClicked(data: Parameters<typeof playbackEvents.playbackBackClicked>[0]): void {
    this.track(playbackEvents.playbackBackClicked(data));
  }

  trackPlaybackSessionLimit(data: Parameters<typeof playbackEvents.playbackSessionLimit>[0]): void {
    this.track(playbackEvents.playbackSessionLimit(data));
  }

  trackPlaybackError(data: Parameters<typeof playbackEvents.playbackError>[0]): void {
    this.track(playbackEvents.playbackError(data));
  }

  trackContentWatchMilestone(data: Parameters<typeof playbackEvents.contentWatchMilestone>[0]): void {
    this.track(playbackEvents.contentWatchMilestone(data));
  }

  trackAvodCumulative23MinPlayed(data: Parameters<typeof playbackEvents.avodCumulative23MinPlayed>[0]): void {
    this.track(playbackEvents.avodCumulative23MinPlayed(data));
  }

  trackAvodCumulative810MinPlayed(data: Parameters<typeof playbackEvents.avodCumulative810MinPlayed>[0]): void {
    this.track(playbackEvents.avodCumulative810MinPlayed(data));
  }

  trackRateContentSubmitted(data: Parameters<typeof playbackEvents.rateContentSubmitted>[0]): void {
    this.track(playbackEvents.rateContentSubmitted(data));
  }

  trackNextEpisodeStarted(data: Parameters<typeof playbackEvents.nextEpisodeStarted>[0]): void {
    this.track(playbackEvents.nextEpisodeStarted(data));
  }

  trackResumePlayback(data: Parameters<typeof playbackEvents.resumePlayback>[0]): void {
    this.track(playbackEvents.resumePlayback(data));
  }

  // ============================================================================
  // AD EVENTS
  // ============================================================================

  trackAdStarted(data: Parameters<typeof adEvents.adStarted>[0]): void {
    this.track(adEvents.adStarted(data));
  }

  trackAdClicked(data: Parameters<typeof adEvents.adClicked>[0]): void {
    this.track(adEvents.adClicked(data));
  }

  trackAdCompleted(data: Parameters<typeof adEvents.adCompleted>[0]): void {
    this.track(adEvents.adCompleted(data));
  }

  trackAdSkipped(data: Parameters<typeof adEvents.adSkipped>[0]): void {
    this.track(adEvents.adSkipped(data));
  }

  trackAdBlocked(data: Parameters<typeof adEvents.adBlocked>[0]): void {
    this.track(adEvents.adBlocked(data));
  }

  // ============================================================================
  // PURCHASE / SUBSCRIPTION EVENTS
  // ============================================================================

  trackSvodPurchaseStarted(data: Parameters<typeof purchaseEvents.svodPurchaseStarted>[0]): void {
    this.track(purchaseEvents.svodPurchaseStarted(data));
  }

  trackSvodPaymentMethodSelected(data: Parameters<typeof purchaseEvents.svodPaymentMethodSelected>[0]): void {
    this.track(purchaseEvents.svodPaymentMethodSelected(data));
  }

  trackSvodPurchaseSuccess(data: Parameters<typeof purchaseEvents.svodPurchaseSuccess>[0]): void {
    this.track(purchaseEvents.svodPurchaseSuccess(data));
  }

  trackSvodPurchaseFailure(data: Parameters<typeof purchaseEvents.svodPurchaseFailure>[0]): void {
    this.track(purchaseEvents.svodPurchaseFailure(data));
  }

  trackFreeTrialPopupImpression(data: Parameters<typeof purchaseEvents.freeTrialPopupImpression>[0] = {}): void {
    this.track(purchaseEvents.freeTrialPopupImpression(data));
  }

  trackFreeTrialSubscribeTapped(data: Parameters<typeof purchaseEvents.freeTrialSubscribeTapped>[0] = {}): void {
    this.track(purchaseEvents.freeTrialSubscribeTapped(data));
  }

  trackFreeTrialMaybeLater(data: Parameters<typeof purchaseEvents.freeTrialMaybeLater>[0] = {}): void {
    this.track(purchaseEvents.freeTrialMaybeLater(data));
  }

  trackTvodPlanDetailPagePopupOpened(data: Parameters<typeof purchaseEvents.tvodPlanDetailPagePopupOpened>[0]): void {
    this.track(purchaseEvents.tvodPlanDetailPagePopupOpened(data));
  }

  trackTvodPurchaseStarted(data: Parameters<typeof purchaseEvents.tvodPurchaseStarted>[0]): void {
    this.track(purchaseEvents.tvodPurchaseStarted(data));
  }

  trackTvodFullAccessWithSvodTapped(data: Parameters<typeof purchaseEvents.tvodFullAccessWithSvodTapped>[0]): void {
    this.track(purchaseEvents.tvodFullAccessWithSvodTapped(data));
  }

  trackTvodPaymentMethodSelected(data: Parameters<typeof purchaseEvents.tvodPaymentMethodSelected>[0]): void {
    this.track(purchaseEvents.tvodPaymentMethodSelected(data));
  }

  trackWebPaymentMethod(data: Parameters<typeof purchaseEvents.webPaymentMethod>[0]): void {
    this.track(purchaseEvents.webPaymentMethod(data));
  }

  trackWebPaymentMethodSuccess(data: Parameters<typeof purchaseEvents.webPaymentMethodSuccess>[0]): void {
    this.track(purchaseEvents.webPaymentMethodSuccess(data));
  }

  trackWebPaymentMethodFailure(data: Parameters<typeof purchaseEvents.webPaymentMethodFailure>[0]): void {
    this.track(purchaseEvents.webPaymentMethodFailure(data));
  }

  trackTvodPurchaseSuccess(data: Parameters<typeof purchaseEvents.tvodPurchaseSuccess>[0]): void {
    this.track(purchaseEvents.tvodPurchaseSuccess(data));
  }

  trackTvodPurchaseFailure(data: Parameters<typeof purchaseEvents.tvodPurchaseFailure>[0]): void {
    this.track(purchaseEvents.tvodPurchaseFailure(data));
  }

  trackSvodPlanDetailPageEvent(data: Parameters<typeof purchaseEvents.svodPlanDetailPageEvent>[0] = {}): void {
    this.track(purchaseEvents.svodPlanDetailPageEvent(data));
  }

  trackCancelSubscription(data: Parameters<typeof commonEvents.cancelSubscription>[0]): void {
    this.track(commonEvents.cancelSubscription(data));
  }

  // ============================================================================
  // COMMON / APP EVENTS
  // ============================================================================

  trackPageView(data: Parameters<typeof commonEvents.pageView>[0]): void {
    this.track(commonEvents.pageView(data));
  }

  private getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  trackGuestWebOpen(data: Parameters<typeof commonEvents.guestWebOpen>[0] = {}): void {
    if (typeof window === 'undefined') return;
    const todayStr = this.getTodayDateString();
    const storageKey = 'jojo_guest_web_open_date';
    if (localStorage.getItem(storageKey) === todayStr) {
      analyticsLogger.info(`[Analytics] Guest_web_open already tracked for today (${todayStr}), skipping.`);
      return;
    }
    this.track(commonEvents.guestWebOpen(data));
    try {
      localStorage.setItem(storageKey, todayStr);
    } catch (e) { }
  }

  /**
   * Track User Web Opened Event (Rate-Limited to Once Per Day)
   * 
   * CRITICAL RULES:
   * - Fires ONLY ONCE per calendar day per logged-in user
   * - Uses localStorage key 'jojo_user_web_opened_date' with date string (YYYY-MM-DD)
   * - Subsequent calls on the same day are skipped
   * - Resets at midnight (when the date changes)
   * 
   * EXPECTED FLOW:
   * 1. OTP Success → Navigate to Home or Watching
   * 2. Profile Selected (initial selection from /watching)
   * 3. Navigate to Home Page
   * 4. useDeepLinkHandler in AppProvider triggers this event ONCE
   * 5. All subsequent refreshes/navigations on the same day → NO EVENT
   * 
   * DO NOT call this from:
   * - /watching route
   * - Individual page components
   * - Profile selection handlers
   * 
   * ONLY call from:
   * - useDeepLinkHandler (already implemented)
   */
  trackUserWebOpened(data: Parameters<typeof commonEvents.userWebOpened>[0] = {}): void {
    if (typeof window === 'undefined') return;
    const todayStr = this.getTodayDateString();
    const storageKey = 'jojo_user_web_opened_date';
    if (localStorage.getItem(storageKey) === todayStr) {
      analyticsLogger.info(`[Analytics] User_web_opened already tracked for today (${todayStr}), skipping.`);
      return;
    }
    this.track(commonEvents.userWebOpened(data));
    try {
      localStorage.setItem(storageKey, todayStr);
    } catch (e) { }
  }

  trackWebOpened(data: Parameters<typeof commonEvents.guestWebOpen>[0] = {}, isGuest: boolean = false): void {
    if (isGuest) {
      this.trackGuestWebOpen(data);
    } else {
      this.trackUserWebOpened(data);
    }
  }

  trackAppOpened(data: Parameters<typeof commonEvents.appOpened>[0] = {}, isGuest?: boolean): void {
    if (typeof isGuest === 'boolean') {
      this.trackWebOpened(data, isGuest);
    } else {
      const todayStr = this.getTodayDateString();
      const storageKey = 'jojo_web_opened_date';
      if (typeof window !== 'undefined' && localStorage.getItem(storageKey) === todayStr) {
        analyticsLogger.info(`[Analytics] WEB_OPENED already tracked for today (${todayStr}), skipping.`);
        return;
      }
      this.track(commonEvents.appOpened(data));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, todayStr);
        } catch (e) { }
      }
    }
  }

  trackSessionStart(data: Parameters<typeof commonEvents.sessionStart>[0]): void {
    this.track(commonEvents.sessionStart(data));
  }

  trackSessionEnd(data: Parameters<typeof commonEvents.sessionEnd>[0]): void {
    this.track(commonEvents.sessionEnd(data));
  }

  trackSessionEngagement(data: Parameters<typeof commonEvents.sessionEngagement>[0]): void {
    this.track(commonEvents.sessionEngagement(data));
  }

  trackDailyActiveUser(data: Parameters<typeof commonEvents.dailyActiveUser>[0]): void {
    this.track(commonEvents.dailyActiveUser(data));
  }

  trackMonthlyActiveUser(data: Parameters<typeof commonEvents.monthlyActiveUser>[0]): void {
    this.track(commonEvents.monthlyActiveUser(data));
  }

  trackSocketConnected(data: Parameters<typeof commonEvents.socketConnected>[0] = {}): void {
    this.track(commonEvents.socketConnected(data));
  }

  trackSocketDisconnected(data: Parameters<typeof commonEvents.socketDisconnected>[0] = {}): void {
    this.track(commonEvents.socketDisconnected(data));
  }

  trackSocketConnectionError(data: Parameters<typeof commonEvents.socketConnectionError>[0] = {}): void {
    this.track(commonEvents.socketConnectionError(data));
  }

  trackUserLocationUpdate(data: Parameters<typeof commonEvents.userLocationUpdate>[0]): void {
    this.track(commonEvents.userLocationUpdate(data));
  }

  trackHelpAndSettingOptionSelected(data: Parameters<typeof commonEvents.helpAndSettingOptionSelected>[0]): void {
    this.track(commonEvents.helpAndSettingOptionSelected(data));
  }

  trackHapticFeedbackToggled(data: Parameters<typeof commonEvents.hapticFeedbackToggled>[0]): void {
    this.track(commonEvents.hapticFeedbackToggled(data));
  }

  trackAppLanguageChanged(data: Parameters<typeof commonEvents.appLanguageChanged>[0]): void {
    this.track(commonEvents.appLanguageChanged(data));
  }

  trackAppThemeChanged(data: Parameters<typeof commonEvents.appThemeChanged>[0]): void {
    this.track(commonEvents.appThemeChanged(data));
  }

  trackDeleteAccount(data: Parameters<typeof commonEvents.deleteAccount>[0]): void {
    this.track(commonEvents.deleteAccount(data));
  }

  // ============================================================================
  // USER IDENTIFICATION
  // ============================================================================

  identifyUser(userId: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;
    try {
      analyticsLogger.info('Analytics: Identifying user', userId);
      const enrichedProperties = {
        ...properties,
        ...AttributionManager.getInstallParams(),
      };
      cleverTapClient.identifyUser(userId, enrichedProperties);
      if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
        firebaseClient.identifyUser(userId, enrichedProperties);
      }
    } catch (error) {
      analyticsLogger.error('Analytics: Failed to identify user', error);
    }
  }

  updateUserProperties(properties: Record<string, any>): void {
    if (!this.isEnabled) return;
    try {
      analyticsLogger.info('Analytics: Updating user properties', properties);
      const enrichedProperties = {
        ...properties,
        ...AttributionManager.getInstallParams(),
      };
      cleverTapClient.updateUserProfile(enrichedProperties);
      if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
        const user = buildUserPayload();
        if (user?.user_id) {
          firebaseClient.identifyUser(user.user_id, enrichedProperties);
        } else {
          firebaseClient.identifyUser('', enrichedProperties);
        }
      }
    } catch (error) {
      analyticsLogger.error('Analytics: Failed to update user properties', error);
    }
  }

  resetUser(): void {
    if (!this.isEnabled) return;
    try {
      analyticsLogger.info('Analytics: Resetting user');
      cleverTapClient.resetUser();
      if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
        firebaseClient.resetUser();
      }
      resetSession();
      milestoneTracker.clearAll();
    } catch (error) {
      analyticsLogger.error('Analytics: Failed to reset user', error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    cleverTapClient.setEnabled(enabled);
    if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true') {
      firebaseClient.setEnabled(enabled);
    }
    analyticsLogger.info('Analytics: Enabled =', enabled);
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  private buildContext(additionalContext?: Partial<EventContext>): EventContext {
    return {
      session: buildSessionPayload(),
      device: buildDevicePayload(),
      user: buildUserPayload(),
      timestamp: new Date().toISOString(),
      suffix: "JOJO App",
      environment: isProduction() ? 'production' : 'development',
      self_link: typeof window !== 'undefined' ? window.location.href : "https://jojoapp.in",
      ...additionalContext
    };
  }
}

export const analyticsService = new AnalyticsService();