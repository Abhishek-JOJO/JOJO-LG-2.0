/**
 * Analytics Provider
 *
 * Responsibilities:
 * - Initialize analytics only when useConsentStatus().canTrack is true
 * - Listen reactively — consent changes trigger init without page reload
 * - Auto-track screen views (route changes)
 * - Sync user identity and profile with analytics providers
 * - Deduplicate route tracking (prevent hydration duplicates)
 *
 * ─── Consent strategy ────────────────────────────────────────────────────────
 * All consent logic lives in useConsentStatus().
 * This component has ONE rule: if canTrack is false → do nothing.
 * Configure bypassJurisdictions in lib/consent/consentConfig.ts
 * to manage jurisdiction-specific behavior without touching this file.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsService } from '../services/analytics.service';
import { analyticsLogger } from '../utils/logger';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useConsentStatus } from '@/lib/consent/useConsentStatus';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const lastPathname = useRef<string | null>(null);
  const { user, isAuthenticated } = useAuthStore();
  const { selectedProfile } = useProfileStore();

  // ─── Consent-gated initialization ────────────────────────────────────────
  const { canTrack, reason } = useConsentStatus();

  useEffect(() => {
    // canTrack becomes true via ONE of two paths:
    //   1. User explicitly accepted (reason = 'explicit_accept')
    //   2. India geo-bypass is ON  (reason = 'geo_bypass')
    // Either way, the logic below is identical — just initialize.
    if (!canTrack) {
      analyticsLogger.info('AnalyticsProvider: canTrack=false – skipping init', { reason });
      return;
    }

    if (isInitialized) return; // already running, no double-init

    const initAnalytics = async () => {
      try {
        analyticsLogger.info('AnalyticsProvider: Initializing...', { reason });

        await analyticsService.initialize({
          clevertap: process.env.NEXT_PUBLIC_CLEVERTAP_ACCOUNT_ID
            ? {
                accountId: process.env.NEXT_PUBLIC_CLEVERTAP_ACCOUNT_ID,
                region: process.env.NEXT_PUBLIC_CLEVERTAP_REGION || 'in1',
              }
            : undefined,
          firebase: process.env.NEXT_PUBLIC_FIREBASE_API_KEY
            ? {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
                measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
              }
            : undefined,
        });

        setIsInitialized(true);
        analyticsLogger.info('AnalyticsProvider: Initialized ✓', { reason });
      } catch (error) {
        analyticsLogger.error('AnalyticsProvider: Initialization failed', error);
      }
    };

    initAnalytics();
  }, [canTrack, isInitialized, reason]);

  // ─── Sync user identity ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated || !user) return;

    analyticsLogger.info('AnalyticsProvider: Identifying user...');
    analyticsService.identifyUser(user.id, {
      ...(user.phone != null && { phone: user.phone }),
      ...(user.email != null && { email: user.email }),
      is_guest: user.isGuest,
      created_at: user.createdAt,
    });
  }, [isInitialized, isAuthenticated, user]);

  // ─── Sync profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitialized || !selectedProfile) return;

    analyticsLogger.info('AnalyticsProvider: Updating profile properties...');
    analyticsService.updateUserProperties({
      profile_id: selectedProfile.profile_id,
      profile_name: selectedProfile.profile_name,
      is_kid: selectedProfile.is_kid,
    });
  }, [isInitialized, selectedProfile]);

  // ─── Auto-track screen views (with deduplication) ─────────────────────────
  useEffect(() => {
    if (!isInitialized) return;

    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    const fullPath = `${pathname}${currentSearch}`;

    if (fullPath === lastPathname.current) {
      analyticsLogger.debug('AnalyticsProvider: Duplicate route, skipping', fullPath);
      return;
    }

    lastPathname.current = fullPath;

    analyticsLogger.info('AnalyticsProvider: Route changed', fullPath);

    const extraProps: Record<string, any> = {};
    if (currentSearch) {
      const searchParams = new URLSearchParams(currentSearch);
      const assetId = searchParams.get("assetId") || searchParams.get("asset_id");
      if (assetId) {
        extraProps.asset_id = assetId;
      }
    }

    analyticsService.trackPageView({
      page: getScreenName(pathname),
      page_title: getScreenName(pathname),
      referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : undefined,
      ...extraProps,
    });
  }, [isInitialized, pathname]);

  return <>{children}</>;
}

/**
 * Convert pathname to human-readable screen name
 * /login          → Login
 * /register/otp   → Register Otp
 */
function getScreenName(pathname: string): string {
  if (pathname === '/') return 'Home';
  return pathname
    .slice(1)
    .split('/')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
