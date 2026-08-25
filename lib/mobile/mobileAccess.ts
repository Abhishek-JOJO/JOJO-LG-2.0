import { appConfig } from "@/lib/config/app.config";
import { MOBILE_AUTH_ALLOWED_ROUTES, ROUTES } from "@/lib/constants/routes";
import { normalizePathname } from "@/lib/utils/pathname";

function matchesRoute(pathname: string, route: string): boolean {
  if (route === ROUTES.HOME) {
    return pathname === ROUTES.HOME;
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isMobileAuthAllowedRoute(pathname: string): boolean {
  const normalized = normalizePathname(pathname);

  return MOBILE_AUTH_ALLOWED_ROUTES.some((route) =>
    matchesRoute(normalized, route)
  );
}

/**
 * Whether the full website (e.g. HOME) is available on mobile.
 */
export function isFullMobileSiteEnabled(): boolean {
  return appConfig.flags.MOBILE_RESPONSIVE_WITHOUT_AUTH;
}

/**
 * Whether AppProvider should send authenticated users to HOME.
 */
export function shouldRedirectAuthenticatedUsersToHome(isMobile: boolean): boolean {
  if (!isMobile) {
    return true;
  }

  return isFullMobileSiteEnabled();
}

/**
 * After a profile is chosen on mobile (auth-only mode), send users to the download screen.
 */
export function shouldShowDownloadAppAfterProfileSelection(isMobile: boolean): boolean {
  return isMobile && !isFullMobileSiteEnabled();
}

/**
 * When mobile blocks the normal website (both flags false), the /watching profile
 * selection screen is also blocked. AppProvider should redirect directly to
 * /download-app instead of bouncing through /watching → /download-app.
 *
 * WITH_AUTH=true  → /watching is allowed on mobile, use it for profile selection.
 * WITH_AUTH=false → /watching is blocked on mobile, go straight to /download-app.
 */
export function getProfileSelectionRoute(isMobile: boolean): string {
  if (!isMobile) {
    return ROUTES.WATCHING;
  }

  const { MOBILE_RESPONSIVE_WITH_AUTH } = appConfig.flags;

  // /watching is only accessible on mobile when WITH_AUTH is enabled.
  // When WITH_AUTH is false, skip /watching and send directly to download page.
  return MOBILE_RESPONSIVE_WITH_AUTH ? ROUTES.WATCHING : getMobileDownloadAppRoute();
}

export function getMobileDownloadAppRoute(pathname?: string): string {
  const current = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  if (current) {
    const normalized = normalizePathname(current);
    if (
      normalized === ROUTES.APP_INSTALL ||
      normalized === "/appInstall" ||
      normalized === "/app-install"
    ) {
      return ROUTES.APP_INSTALL;
    }
  }

  return ROUTES.DOWNLOAD_APP;
}

/**
 * Decides if the normal website should render for the current viewport/route.
 * Tablet and desktop are always allowed; mobile follows the two feature flags.
 *
 * Flag combinations and their behaviour:
 *
 *  WITH_AUTH | WITHOUT_AUTH | Result
 *  ----------|--------------|-------------------------------------------------------
 *   true     | false        | Auth/onboarding routes allowed; all other routes → download screen.
 *   true     | true         | Auth/onboarding routes allowed + full site accessible on mobile.
 *   false    | false        | Only /download-app is reachable; everything else → download screen.
 *   false    | true         | Full site accessible on mobile (auth routes are included naturally).
 */
export function canRenderWebsiteOnMobile(pathname: string, isMobile: boolean): boolean {
  if (!isMobile) {
    return true;
  }

  const normalized = normalizePathname(pathname);

  // The download-app / appInstall page is always reachable on mobile regardless of flags.
  if (
    matchesRoute(normalized, ROUTES.DOWNLOAD_APP) ||
    matchesRoute(normalized, ROUTES.APP_INSTALL) ||
    matchesRoute(normalized, "/app-install")
  ) {
    return true;
  }

  const {
    MOBILE_RESPONSIVE_WITH_AUTH,
    MOBILE_RESPONSIVE_WITHOUT_AUTH,
  } = appConfig.flags;

  // When WITH_AUTH is enabled, allow the auth/onboarding flow on mobile
  // (login → register → create-account → add-profile → avatar → watching).
  // This check runs before the WITHOUT_AUTH block so that the onboarding
  // routes are never accidentally blocked even when WITHOUT_AUTH is false.
  if (MOBILE_RESPONSIVE_WITH_AUTH && isMobileAuthAllowedRoute(normalized)) {
    return true;
  }

  // When both flags are false, the entire website is blocked on mobile.
  // Only /download-app is reachable (already returned true above).
  // Do NOT allow login routes here — if we did, desktop→mobile resize would
  // land the user on /login instead of /download-app (AppProvider sends
  // unauthenticated users from / to /login, and then MobileAccessGuard
  // would pass /login through, skipping the download screen entirely).
  if (!MOBILE_RESPONSIVE_WITH_AUTH && !MOBILE_RESPONSIVE_WITHOUT_AUTH) {
    return false;
  }

  // If the full-site mobile flag is off, block everything that wasn't
  // explicitly allowed above (non-auth routes, or auth routes when
  // WITH_AUTH is also false).
  if (!MOBILE_RESPONSIVE_WITHOUT_AUTH) {
    return false;
  }

  // Full site is open on mobile.
  return true;
}
