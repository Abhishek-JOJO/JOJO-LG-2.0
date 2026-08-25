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
export function LayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const { showNavbar, showFooter } = appConfig?.flags;
  const pathname = useActivePathname();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  const isLegalPage = pathname === ROUTES.TERMS || pathname === ROUTES.PRIVACY;
  const isMobileDevice = searchParams?.get("device") === "mobile";
  const isMobileLegalPage = isLegalPage && isMobileDevice;

  const isStandalonePage =
    pathname === ROUTES.DOWNLOAD_APP ||
    pathname === ROUTES.APP_INSTALL ||
    pathname === "/appInstall" ||
    pathname === "/app-install" ||
    pathname === ROUTES.WATCH_BASE ||
    pathname.startsWith(ROUTES.WATCH_BASE + "/") ||
    pathname === ROUTES.LOGIN ||
    pathname === ROUTES.LOGIN_OTP;

  const isKidsPage = pathname === ROUTES.KIDS;
  const isHotAndNewPage = pathname === ROUTES.HOT_AND_NEW;

  const hideHeaderFooter = isStandalonePage || isMobileLegalPage;

  let mainClassName = "min-h-screen flex flex-col max-lg:pb-20";
  if (isMobileLegalPage) {
    mainClassName = "min-h-screen flex flex-col";
  } else if (isStandalonePage) {
    mainClassName = "h-screen h-[100dvh] w-full flex flex-col overflow-hidden";
  }

  return (
    <>
      {showNavbar && !hideHeaderFooter && <Navbar />}
      <main
        className={mainClassName}
        style={{ background: "var(--theme_12)" }}
      >
        {children}
      </main>
      <CookieBanner />
      <AssetDetailModal />
      <GuestLoginPopup />
      <SessionExpiredModal />
      {showFooter && !hideHeaderFooter && <Footer />}
      <StatusLine />
    </>
  );
}
