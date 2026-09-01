/**
 * Centralized route constants
 * Single source of truth for all application routes
 */
export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  PROFILE: '/profile',
  AUTH_REGISTER_TO_OTP_SCREEN_NAVIGATE: '/register/otp?',
  AUTH_LOGIN_TO_OTP_SCREEN_NAVIGATE: '/login/otp?',
  HOMEPAGE: "/home",
  WATCH: (id: string) => `/watch?v=${id}`,

  // Public routes
  LANDING: '/landing',
  LOGIN: '/login',
  LOGIN_OTP: '/login/otp',
  REGISTER: '/register',
  REGISTER_OTP: '/register/otp',
  REGISTER_CREATE_ACCOUNT: '/register/create-account',
  ADD_PROFILE: '/profile/add-profile',
  AVATAR: '/profile/avtar',
  DOWNLOAD_APP: '/download-app',
  APP_INSTALL: '/appInstall',
  FORGOT_PASSWORD: '/forgot-password',
  TERMS: '/terms-conditions',
  PRIVACY: '/privacy-policy',
  KIDS: '/kids',
  HOT_AND_NEW: '/hot-and-new',
  MOVIES: "/movies",
  SHOWS: "/shows",
  NATAK: "/nataks",
  WATCHLIST: "/watchlist",
  SUBSCRIPTION: "/subscription",
  ACCOUNT_SETTINGS: "/account-settings",
  PAYMENT: "/payment",
  PAYMENT_SUCCESS: "/payment-success",
  PAYMENT_FAILED: "/payment-failed",

  // SSO Callback routes
  APPLE_CALLBACK: '/auth/apple/callback',
  GOOGLE_CALLBACK: '/auth/google/callback',
  FACEBOOK_CALLBACK: '/auth/facebook/callback',


  // Demo & Debugger
  PLAYER_DEMO: '/watch/demo',
  CRYPTO_DEBUG: '/crypto-debug',

  // Protected routes
  WATCHING: '/watching',
  MANAGE_PROFILE: "/account-settings?tab=profile",

  // Player
  WATCH_BASE: '/watch',
  GENRE: "/genre",
  BROWSE: "/browse"
} as const;

/**
 * Where unauthenticated users are sent (e.g. after cache clear or visiting HOME).
 */
export const UNAUTHENTICATED_ENTRY_ROUTE = ROUTES.LOGIN;

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  ROUTES.LANDING,
  ROUTES.LOGIN,
  ROUTES.LOGIN_OTP,
  ROUTES.REGISTER,
  ROUTES.REGISTER_OTP,
  ROUTES.REGISTER_CREATE_ACCOUNT,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.TERMS,
  ROUTES.PRIVACY,
  ROUTES.DOWNLOAD_APP,
  ROUTES.APP_INSTALL,
  '/app-install',
  ROUTES.APPLE_CALLBACK,
  ROUTES.GOOGLE_CALLBACK,
  ROUTES.FACEBOOK_CALLBACK,
  ROUTES.PLAYER_DEMO,
  ROUTES.CRYPTO_DEBUG,
] as const;

/**
 * Auth-only routes — logged-in users must be redirected AWAY from these.
 * These are routes that only make sense when a user is NOT authenticated.
 */
export const AUTH_ONLY_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.LOGIN_OTP,
  ROUTES.REGISTER,
  ROUTES.REGISTER_OTP,
  ROUTES.LANDING,
] as const;

/**
 * Protected routes that require authentication
 */
export const PROTECTED_ROUTES = [
  ROUTES.HOME,
  ROUTES.REGISTER_CREATE_ACCOUNT,
  ROUTES.ADD_PROFILE,
  ROUTES.AVATAR,
  ROUTES.WATCHING,
  ROUTES.ACCOUNT_SETTINGS,
  ROUTES.SEARCH,
  ROUTES.WATCH_BASE,
  ROUTES.PAYMENT,
  ROUTES.PAYMENT_SUCCESS,
  ROUTES.PAYMENT_FAILED,
] as const;

/**
 * Routes always reachable on mobile even when both mobile flags are false.
 */
export const MOBILE_LOGIN_ALLOWED_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.LOGIN_OTP,
  ROUTES.APPLE_CALLBACK,
  ROUTES.GOOGLE_CALLBACK,
  ROUTES.FACEBOOK_CALLBACK,
] as const;

/**
 * Routes reachable on mobile when MOBILE_RESPONSIVE_WITH_AUTH is enabled.
 */
export const MOBILE_AUTH_ALLOWED_ROUTES = [
  ROUTES.LANDING,
  ROUTES.LOGIN,
  ROUTES.LOGIN_OTP,
  ROUTES.REGISTER,
  ROUTES.REGISTER_OTP,
  ROUTES.REGISTER_CREATE_ACCOUNT,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.ADD_PROFILE,
  ROUTES.AVATAR,
  ROUTES.WATCHING,
  ROUTES.WATCH_BASE,
  ROUTES.APPLE_CALLBACK,
  ROUTES.GOOGLE_CALLBACK,
  ROUTES.FACEBOOK_CALLBACK,
  ROUTES.TERMS,
  ROUTES.PRIVACY,
] as const;

/**
 * Check if route is public
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if route is allowed for guests
 */
export function isGuestAllowedRoute(pathname: string): boolean {
  const guestAllowedExact = [
    ROUTES.HOME,
    ROUTES.MOVIES,
    ROUTES.SHOWS,
    ROUTES.NATAK,
    ROUTES.KIDS,
    ROUTES.SUBSCRIPTION,
    ROUTES.BROWSE,
    ROUTES.GENRE,
    ROUTES.HOT_AND_NEW,
    ROUTES.PAYMENT,
    ROUTES.SEARCH,
    ROUTES.CRYPTO_DEBUG,
    ROUTES.WATCH_BASE,
    "/live",
    "/kidz"
  ];

  if (guestAllowedExact.includes(pathname as any)) return true;

  const prefixes = [
    ROUTES.MOVIES,
    ROUTES.SHOWS,
    ROUTES.NATAK,
    ROUTES.KIDS,
    ROUTES.BROWSE,
    ROUTES.GENRE,
    ROUTES.HOT_AND_NEW,
    ROUTES.WATCH_BASE,
    '/live',
    '/kidz'
  ];
  return prefixes.some(prefix => pathname.startsWith(`${prefix}/`) || pathname === prefix);
}
