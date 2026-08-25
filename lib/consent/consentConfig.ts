/**
 * Consent Configuration
 *
 * ─── PURPOSE ──────────────────────────────────────────────────────────────────
 * Single source of truth for all consent-bypass flags.
 * When legal requirements change for any jurisdiction, only THIS file changes.
 * AnalyticsProvider and CookieBanner both read from useConsentStatus() which
 * reads from here — no consent logic is scattered across components.
 *
 * ─── GEOGRAPHICAL BYPASS ──────────────────────────────────────────────────────
 * Map of country codes (case-sensitive, e.g., 'IN', 'US') to their bypass status.
 *
 *  - true  → Users in this country bypass consent. Analytics initialize immediately,
 *            and the cookie consent banner is not shown.
 *  - false → Users in this country must go through the standard consent banner flow.
 *
 * ─── HOW TO TOGGLE ───────────────────────────────────────────────────────────
 * Just change the booleans inside bypassJurisdictions.
 */

export const CONSENT_CONFIG = {
  /**
   * Map of country codes to their bypass status.
   * Key: Country code (must match what geo API returns).
   * Value: Boolean flag to enable/disable bypass.
   *
   * @default {} ← DPDP-safe default (no bypasses).
   */
  bypassJurisdictions: {
    IN: true,
    US: false,
  } as Record<string, boolean>,
} as const;

/** Type exported so useConsentStatus can be fully typed */
export type ConsentConfig = typeof CONSENT_CONFIG;
