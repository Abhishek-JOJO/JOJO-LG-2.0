/**
 * useConsentStatus Hook
 *
 * ─── PURPOSE ──────────────────────────────────────────────────────────────────
 * THE single hook that answers two questions for the entire app:
 *
 *   1. canTrack   — Is analytics allowed to run RIGHT NOW?
 *   2. showBanner — Should the cookie consent banner be rendered?
 *
 * Both AnalyticsProvider and CookieBanner consume this hook.
 * Zero consent decision logic exists anywhere else.
 *
 * ─── DECISION TREE ───────────────────────────────────────────────────────────
 *
 *  Is user in a geo-bypass country (e.g., India/US)?
 *  ├─ YES → canTrack = true,  showBanner = false   (bypass path)
 *  └─ NO  ↓
 *         Has user explicitly accepted the cookie banner?
 *         ├─ YES (cookie=true)  → canTrack = true,  showBanner = false
 *         ├─ NO  (cookie=false) → canTrack = false, showBanner = false
 *         └─ NOT SET (null)     → canTrack = false, showBanner = true
 *
 * ─── REACTIVITY ──────────────────────────────────────────────────────────────
 * The hook re-evaluates when:
 *   - The component mounts (covers returning visitors)
 *   - The 'cookie-consent-changed' event fires (covers new choices)
 *   - The geo data changes in localStorage (covers late geo resolution)
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *   const { canTrack, showBanner } = useConsentStatus();
 *
 *   // AnalyticsProvider: initialize only when canTrack
 *   // CookieBanner: render only when showBanner
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { cookieConsent, CONSENT_CHANGED_EVENT } from '@/lib/storage/cookieConsent';
import { CONSENT_CONFIG } from './consentConfig';
import { logger } from '@/lib/logger/logger';
import { StorageKey } from '@/enums/storage.enum';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsentStatus {
  /** True when analytics events are allowed to fire */
  canTrack: boolean;

  /** True when the cookie banner should be rendered */
  showBanner: boolean;

  /**
   * How the canTrack=true decision was reached.
   * Useful for logging and debugging.
   */
  reason:
  | 'geo_bypass'        // Geo-bypass is active for the user's country
  | 'explicit_accept'   // User clicked Accept on the banner
  | 'explicit_decline'  // User clicked Decline
  | 'pending'           // No choice made yet
  | 'unknown';          // Geo not yet resolved (initial SSR state)
}

// ─── Geo helper ───────────────────────────────────────────────────────────────

/**
 * Read the user's country code from the geo cache in localStorage.
 * Returns null on SSR or when geo hasn't been resolved yet.
 */
function readCountryCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(StorageKey.GEO_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.geoData?.country_code ?? null;
  } catch {
    return null;
  }
}

// ─── Core resolver ────────────────────────────────────────────────────────────

/**
 * Pure function — resolves ConsentStatus from current runtime state.
 * Called on mount and on every event that could change consent status.
 */
function resolveConsentStatus(): ConsentStatus {
  const countryCode = readCountryCode();

  // ── Path 1: Geo-bypass checks ─────────────────────────────────────────────
  if (countryCode) {
    const isBypassed = CONSENT_CONFIG.bypassJurisdictions[
      countryCode as keyof typeof CONSENT_CONFIG.bypassJurisdictions
    ];
    if (isBypassed) {
      logger.info(`[ConsentStatus] Geo-bypass active for ${countryCode}`);
      return { canTrack: true, showBanner: false, reason: 'geo_bypass' };
    }
  }

  // ── Path 2: Explicit consent cookie ──────────────────────────────────────
  const cookieValue = cookieConsent.getValue();

  if (cookieValue === 'true') {
    return { canTrack: true, showBanner: false, reason: 'explicit_accept' };
  }

  if (cookieValue === 'false') {
    return { canTrack: false, showBanner: false, reason: 'explicit_decline' };
  }

  // ── Path 3: No choice made yet ────────────────────────────────────────────
  // Geo not resolved → use 'unknown' so caller can decide to wait or show banner
  if (countryCode === null) {
    return { canTrack: false, showBanner: false, reason: 'unknown' };
  }

  // Geo resolved, not India (or bypass off), no cookie → show the banner
  return { canTrack: false, showBanner: true, reason: 'pending' };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConsentStatus(): ConsentStatus {
  const [status, setStatus] = useState<ConsentStatus>(() => {
    // Server-safe initial state — resolved properly after mount
    if (typeof window === 'undefined') {
      return { canTrack: false, showBanner: false, reason: 'unknown' };
    }
    return resolveConsentStatus();
  });

  const refresh = useCallback(() => {
    const next = resolveConsentStatus();
    setStatus((prev) => {
      // Only trigger re-render if something actually changed
      if (
        prev.canTrack === next.canTrack &&
        prev.showBanner === next.showBanner &&
        prev.reason === next.reason
      ) {
        return prev;
      }
      logger.info('[ConsentStatus] Status changed', {
        from: prev.reason,
        to: next.reason,
        canTrack: next.canTrack,
        showBanner: next.showBanner,
      });
      return next;
    });
  }, []);

  useEffect(() => {
    // Resolve immediately on mount (covers SSR hydration gap)
    refresh();

    // Re-evaluate when user clicks Accept/Decline
    window.addEventListener(CONSENT_CHANGED_EVENT, refresh);

    // Re-evaluate when geo data arrives (BootstrapProvider writes it async)
    window.addEventListener('geo-cache-updated', refresh);

    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, refresh);
      window.removeEventListener('geo-cache-updated', refresh);
    };
  }, [refresh]);

  return status;
}
