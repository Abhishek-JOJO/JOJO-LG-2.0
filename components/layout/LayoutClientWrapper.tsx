"use client";

import { useEffect } from "react";
import { useActivePathname } from "@/hooks/useActivePathname";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ROUTES } from "@/lib/constants/routes";
import { appConfig } from "@/lib/config/app.config";
import { CookieBanner } from "@components/common/CookieBanner";
import { AssetDetailModal } from "@/features/asset/components/AssetDetailModal";
import { useAssetDetailStore, consumePendingAssetDetailOpen } from "@/features/asset/store/useAssetDetailStore";
import { GuestLoginPopup } from "@/features/auth/ui/GuestLoginPopup";
import { SessionExpiredModal } from "@/features/auth/ui/SessionExpiredModal";
import { StatusLine } from "@/components/common/StatusLine";
import { AmbientBackground } from "@/components/common/AmbientBackground";
import { SearchModal } from "@/components/search/SearchModal";
import { ExitConfirmModal } from "@/components/layout/ExitConfirmModal";
import { usePlayerStore } from "@/store/usePlayerStore";
export function LayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const isSearchOpen = usePlayerStore((s) => s.isSearchOpen);
  const setSearchOpen = usePlayerStore((s) => s.setSearchOpen);

  // Reopens the asset-detail modal for whatever show/movie a page scheduled
  // before doing a hard navigation away from itself — see
  // schedulePendingAssetDetailOpen's own comment for why this two-step
  // hand-off exists instead of navigating straight to the asset's URL.
  // This wrapper mounts fresh exactly once per real page load, which is
  // exactly the "did we just land here from that kind of navigation?" check
  // this needs — a no-op on every load that didn't schedule anything.
  useEffect(() => {
    const pending = consumePendingAssetDetailOpen();
    if (pending) {
      useAssetDetailStore.getState().openAssetDetail(pending.id, pending.contentType, pending.title);
    }
  }, []);
  const { showNavbar, showFooter } = appConfig?.flags;
  const pathname = useActivePathname();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  const isLegalPage = pathname === ROUTES.TERMS || pathname === ROUTES.PRIVACY;
  const isMobileDevice = searchParams?.get("device") === "mobile";
  const isMobileLegalPage = isLegalPage && isMobileDevice;

  const normalizedPath = pathname ? (pathname.replace(/\/$/, "") || "/") : "/";

  const isAuthPage =
    normalizedPath.startsWith(ROUTES.LOGIN) ||
    normalizedPath.startsWith(ROUTES.REGISTER);

  const isStandalonePage =
    isAuthPage ||
    normalizedPath === ROUTES.DOWNLOAD_APP ||
    normalizedPath === ROUTES.APP_INSTALL ||
    normalizedPath === "/appInstall" ||
    normalizedPath === "/app-install" ||
    normalizedPath === ROUTES.WATCH_BASE ||
    normalizedPath.startsWith(ROUTES.WATCH_BASE + "/");

  const isKidsPage = normalizedPath === ROUTES.KIDS;
  const isHotAndNewPage = normalizedPath === ROUTES.HOT_AND_NEW;

  const hideHeaderFooter = isStandalonePage || isMobileLegalPage;

  let mainClassName = "min-h-screen flex flex-col max-lg:pb-20";
  if (isMobileLegalPage) {
    mainClassName = "min-h-screen flex flex-col";
  } else if (isStandalonePage) {
    mainClassName = "h-screen h-[100dvh] w-full flex flex-col overflow-hidden";
  }

  return (
    <>
      {/* Warm hover/focus-tinted glow meant to sit behind browse/home rail
          content — on standalone pages (the video player chief among them)
          there's no card to tint it from, so it was just the last color left
          over from whatever was focused before navigating here, showing
          through as an unexplained gradient flash during the brief gap
          before that page's own opaque loading UI paints over it. */}
      {!isStandalonePage && <AmbientBackground />}
      {showNavbar && !hideHeaderFooter && <Navbar />}
      <main
        className={`${mainClassName} bg-transparent`}
      >
        {children}
      </main>
      <CookieBanner />
      <AssetDetailModal />
      <SearchModal isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />
      <GuestLoginPopup />
      <SessionExpiredModal />
      <ExitConfirmModal />
      {showFooter && !hideHeaderFooter && <Footer />}
      <StatusLine />
    </>
  );
}
