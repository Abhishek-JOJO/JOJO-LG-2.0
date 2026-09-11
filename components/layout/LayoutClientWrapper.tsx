"use client";

import { useActivePathname } from "@/hooks/useActivePathname";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ROUTES } from "@/lib/constants/routes";
import { appConfig } from "@/lib/config/app.config";
import { CookieBanner } from "@components/common/CookieBanner";
import { AssetDetailModal } from "@/features/asset/components/AssetDetailModal";
import { GuestLoginPopup } from "@/features/auth/ui/GuestLoginPopup";
import { SessionExpiredModal } from "@/features/auth/ui/SessionExpiredModal";
import { StatusLine } from "@/components/common/StatusLine";
import { AmbientBackground } from "@/components/common/AmbientBackground";
import { SearchModal } from "@/components/search/SearchModal";
import { usePlayerStore } from "@/store/usePlayerStore";
export function LayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const isSearchOpen = usePlayerStore((s) => s.isSearchOpen);
  const setSearchOpen = usePlayerStore((s) => s.setSearchOpen);
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
      <AmbientBackground />
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
      {showFooter && !hideHeaderFooter && <Footer />}
      <StatusLine />
    </>
  );
}
