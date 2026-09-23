"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
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
    const handleReopen = () => {
      const pending = consumePendingAssetDetailOpen();
      if (pending) {
        useAssetDetailStore.getState().openAssetDetail(
          pending.id,
          pending.contentType,
          pending.title,
          pending.cachedAsset
        );
      }
    };

    handleReopen();
    window.addEventListener("pageshow", handleReopen);
    return () => window.removeEventListener("pageshow", handleReopen);
  }, []);
  const { showNavbar, showFooter } = appConfig?.flags;
  const pathname = usePathname();
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
  const isAccountSettingsPage =
    normalizedPath === ROUTES.ACCOUNT_SETTINGS ||
    normalizedPath.startsWith(ROUTES.ACCOUNT_SETTINGS + "/");

  const isAssetDetailOpen = useAssetDetailStore((s) => s.isOpen);
  const hideBrowseChrome = isStandalonePage || isAssetDetailOpen;
  const hideHeaderFooter = hideBrowseChrome || isMobileLegalPage;
  const hideAmbientGlow = hideBrowseChrome || isAccountSettingsPage;

  let mainClassName = "min-h-screen flex flex-col max-lg:pb-20";
  if (isMobileLegalPage) {
    mainClassName = "min-h-screen flex flex-col";
  } else if (isStandalonePage) {
    mainClassName = "h-screen h-[100dvh] w-full flex flex-col overflow-hidden";
  }

  return (
    <>
      {/* Warm hover/focus-tinted glow meant to sit behind browse/home rail
          content — on standalone pages, account settings, and full-screen modal overlays,
          hide it completely to prevent gradient bleed-through. */}
      {!hideAmbientGlow && <AmbientBackground />}
      {showNavbar && !hideHeaderFooter && !hideBrowseChrome && <Navbar />}
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
