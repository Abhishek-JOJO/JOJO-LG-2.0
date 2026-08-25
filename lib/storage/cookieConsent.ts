const CONSENT_KEY = "cookie_consent";
const CONSENT_CHANGED_EVENT = "cookie-consent-changed";

/** Determines whether we're on HTTPS (to apply the Secure flag) */
const isSecure = (): boolean =>
  typeof window !== "undefined" && window.location.protocol === "https:";

function getValue(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_KEY}=`));

  return match ? match.split("=")[1] : null;
}

/** Build the base cookie string (1 year max-age) */
function buildCookieString(value: string): string {
  const base = `${CONSENT_KEY}=${value};path=/;max-age=31536000;SameSite=Lax`;
  return isSecure() ? `${base};Secure` : base;
}

/** Dispatch a custom DOM event so any listener (e.g. AnalyticsProvider) reacts immediately */
function dispatchConsentChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
}

export const cookieConsent = {
  /** Raw string value of the consent cookie, or null if not set */
  getValue,

  /** True once the user has made ANY choice (accept or decline) */
  hasConsent(): boolean {
    return getValue() !== null;
  },

  /** True only when the user explicitly accepted */
  isAccepted(): boolean {
    return getValue() === "true";
  },

  accept(): void {
    if (typeof document === "undefined") return;
    document.cookie = buildCookieString("true");
    dispatchConsentChanged();
  },

  decline(): void {
    if (typeof document === "undefined") return;
    document.cookie = buildCookieString("false");
    dispatchConsentChanged();
  },
};

/** Name of the custom event fired after any consent change */
export { CONSENT_CHANGED_EVENT };
