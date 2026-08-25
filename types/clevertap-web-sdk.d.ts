/**
 * Type declarations for clevertap-web-sdk
 * The package ships no TypeScript types and has no @types/ package.
 * This covers all methods used in clevertap.client.ts.
 */

declare module 'clevertap-web-sdk' {
  interface CleverTapPrivacyItem {
    optOut?: boolean;
    useIP?: boolean;
  }

  interface CleverTapSiteProfile {
    Identity?: string | number;
    Name?: string;
    Email?: string;
    Phone?: string;
    Gender?: string;
    DOB?: Date | string;
    [key: string]: unknown;
  }

  interface CleverTapOnUserLoginPayload {
    Site: CleverTapSiteProfile;
  }

  interface CleverTapProfilePayload {
    Site: Record<string, unknown>;
  }

  interface CleverTap {
    /** Initialise the SDK with your account ID and optional region */
    init(accountId: string, region?: string, targetDomain?: string): void;

    /** Push privacy settings */
    privacy: { push(item: CleverTapPrivacyItem): void };

    /** Track a named event with optional properties */
    event: { push(eventName: string, properties?: Record<string, unknown>): void };

    /** Identify / login a user */
    onUserLogin: { push(payload: CleverTapOnUserLoginPayload): void };

    /** Update the current user's profile */
    profile: { push(payload: CleverTapProfilePayload): void };

    /** Log the current user out and clear their data */
    logout(): void;

    /** Notification permission helpers */
    notifications?: {
      push(payload: Record<string, unknown>): void;
    };
  }

  const clevertap: CleverTap;
  export default clevertap;
}
