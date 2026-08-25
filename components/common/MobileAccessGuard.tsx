"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { canRenderWebsiteOnMobile, getMobileDownloadAppRoute } from "@/lib/mobile/mobileAccess";
import { ROUTES } from "@/lib/constants/routes";
import { normalizePathname } from "@/lib/utils/pathname";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export function MobileAccessGuard({ children, isMobileServer }: { children: ReactNode; isMobileServer?: boolean }) {
  const pathname = normalizePathname(usePathname());
  const { isMobile, isReady } = useIsMobile(isMobileServer);
  const router = useRouter();

  const downloadAppRoute = getMobileDownloadAppRoute(pathname);
  const isOnDownloadApp =
    pathname === downloadAppRoute ||
    pathname === ROUTES.APP_INSTALL ||
    pathname === "/appInstall" ||
    pathname === "/app-install";

  // ── Decision 1 ────────────────────────────────────────────────────────────
  // Mobile viewport + current route is blocked by flags → redirect to /download-app.
  // canRenderWebsiteOnMobile returns true for non-mobile, so this only fires on mobile.
  const blockedOnMobile =
    isReady && isMobile && !canRenderWebsiteOnMobile(pathname, isMobile);

  // ── Decision 2 ────────────────────────────────────────────────────────────
  // Desktop/tablet viewport + on /download-app.
  // /download-app is a mobile-only page; desktop should not stay here.
  const blockedOnDesktop = isReady && !isMobile && isOnDownloadApp;

  // ── Effect ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;

    if (blockedOnMobile) {
      // Already on /download-app — nothing to do (avoid redundant replace).
      if (isOnDownloadApp) return;
      router.replace(downloadAppRoute);
      return;
    }

    if (blockedOnDesktop) {
      // On desktop but on the mobile-only /download-app page.
      // Redirect to home; AppProvider will handle auth redirects from there.
      router.replace("/");
    }
  }, [
    isReady,
    isMobile,
    blockedOnMobile,
    blockedOnDesktop,
    isOnDownloadApp,
    downloadAppRoute,
    router,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  // We no longer block on !isReady since the server passes the initial viewport.

  // Blank screen while redirect is in flight.
  if (blockedOnMobile || blockedOnDesktop) {
    return <div className="min-h-screen bg-theme_12" />;
  }

  return <>{children}</>;
}
