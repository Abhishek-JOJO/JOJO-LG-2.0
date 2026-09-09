"use client";

import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { LogoutButton } from "@/features/auth/ui/LogoutButton";
import { appConfig } from "@/lib/config/app.config";
import { LOGOS } from "@/lib/constants/assets";
import { ROUTES } from "@/lib/constants/routes";
import { themeColors } from "@/tailwind.config";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LanguageSwitcher from "../language-dropdown/LanguageDropdown";
import { NavMenuListSkeleton } from "../skeletons/NavMenuListSkeleton";
import { JOJOButton, JOJOCustomButton } from "../ui/JOJOButton";
import { ProfileDropdown } from "./ProfileDropdown";
import { BottomNav } from "./BottomNav";
import { FocusableNavLink } from "./FocusableNavLink";
import { MobileSidebar } from "./MobileSidebar";
import { useNavbar } from "./hooks/useNavbar";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function FocusableGetGold({ totalNavItems, isAuthenticated }: { totalNavItems: number; isAuthenticated: boolean }) {
  const router = useRouter();

  const handleArrowPress = (direction: string) => {
    if (direction === 'up') return false;
    if (direction === 'left') {
      if (totalNavItems > 0) {
        setFocus(`nav-link-${totalNavItems - 1}`);
      } else {
        setFocus('navbar-search');
      }
      return false;
    }
    if (direction === 'right') {
      setFocus(isAuthenticated ? 'navbar-profile-trigger' : 'navbar-login');
      return false;
    }
    if (direction === 'down') {
      if (document.getElementById('hero-carousel-container')) {
        setFocus('hero-carousel');
        return false;
      }
    }
    return true;
  };

  const { ref, focused } = useFocusable({
    focusKey: 'navbar-get-gold',
    onArrowPress: handleArrowPress,
    onEnterPress: () => router.push(ROUTES.SUBSCRIPTION),
  });

  return (
    <div
      ref={ref as any}
      onClick={() => router.push(ROUTES.SUBSCRIPTION)}
      className={`cursor-pointer px-5 sm:px-6 py-2 sm:py-2.5 text-base sm:text-lg font-bold whitespace-nowrap rounded-full transition-all duration-200 shrink-0 ${focused
          ? "scale-105 ring-2 ring-white text-black bg-gradient-to-r from-[#FAAF3F] via-[#FFD691] to-[#FAAF3F] shadow-[0_0_18px_rgba(250,175,63,0.7)]"
          : "text-[#FAAF3F] hover:text-[#FFD691] hover:bg-amber-500/10"
        }`}
    >
      Get Gold
    </div>
  );
}

function FocusableSearch({ totalNavItems }: { totalNavItems: number }) {
  const router = useRouter();

  const handleArrowPress = (direction: string) => {
    if (direction === 'up') return false;
    if (direction === 'left') return false;
    if (direction === 'right') {
      if (totalNavItems > 0) {
        setFocus('nav-link-0');
      } else {
        setFocus('navbar-get-gold');
      }
      return false;
    }
    if (direction === 'down') {
      if (document.getElementById('hero-carousel-container')) {
        setFocus('hero-carousel');
        return false;
      }
    }
    return true;
  };

  const { ref, focused } = useFocusable({
    focusKey: 'navbar-search',
    onArrowPress: handleArrowPress,
    onEnterPress: () => router.push(`${ROUTES.SEARCH}?from=app`),
  });

  return (
    <div
      ref={ref as any}
      onClick={() => router.push(`${ROUTES.SEARCH}?from=app`)}
      className={`p-2.5 rounded-full cursor-pointer flex items-center justify-center transition-all duration-200 shrink-0 ${focused
          ? "bg-white text-black scale-110 shadow-[0_0_14px_rgba(255,255,255,0.6)] ring-2 ring-white"
          : "text-white/90 hover:text-white hover:bg-white/10"
        }`}
      aria-label="Search"
    >
      <Search className="w-5 h-5 sm:w-6 sm:h-6" />
    </div>
  );
}

function FocusableLoginButton({ t, router, totalNavItems, isGold }: { t: any; router: any; totalNavItems: number; isGold: boolean }) {
  const handleArrowPress = (direction: string) => {
    if (direction === 'up') return false;
    if (direction === 'left') {
      if (!isGold) {
        setFocus('navbar-get-gold');
      } else if (totalNavItems > 0) {
        setFocus(`nav-link-${totalNavItems - 1}`);
      } else {
        setFocus('navbar-search');
      }
      return false;
    }
    if (direction === 'down') {
      if (document.getElementById('hero-carousel-container')) {
        setFocus('hero-carousel');
        return false;
      }
    }
    return true;
  };

  const { ref, focused } = useFocusable({
    focusKey: 'navbar-login',
    onArrowPress: handleArrowPress,
    onEnterPress: () => router.push(ROUTES.LOGIN),
  });

  return (
    <div ref={ref as any} className={`transition-transform duration-200 ${focused ? "scale-105 ring-2 ring-white rounded-[100px]" : ""}`}>
      <JOJOCustomButton
        size={JOJOButton.Size.M}
        hoverColor={themeColors.theme_13_samecolour}
        state={JOJOButton.State.ACTIVE}
        onClick={() => router.push(ROUTES.LOGIN)}
        className="rounded-[100px] body-xs-medium sm:body-sm-medium h-8 sm:h-10 px-4 ml-1 cursor-pointer"
      >
        {t("login")}
      </JOJOCustomButton>
    </div>
  );
}

export function Navbar() {
  const t = useTranslations("loginPage");
  const { showLanguageDropdown, isShowLanguageDropdown } = appConfig?.flags;

  const {
    pathname,
    router,
    isScrolled,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isGold,
    navItems,
    visibleNavItems,
    isLanding,
    isHome,
    isCreateAccount,
    isAddProfile,
    showActions,
    showNavLogin,
    isAuthenticated,
    isGuest,
    handleExplore,
    isBrowsingMode,
    guestLoginPending
  } = useNavbar();

  return (
    <header
      className="z-[999] overflow-visible transition-all duration-500 sticky top-0 left-0 right-0 w-full"
      style={{
        background: "transparent",
        WebkitBackdropFilter: "none",
        backdropFilter: "none",
        boxShadow: "none",
      }}
    >

      {isBrowsingMode ? (
        <div className="relative py-4 sm:py-5 lg:py-6 px-6 sm:px-12 lg:px-16 w-full flex items-center justify-between z-50">
          {/* 1. Left JOJO Logo */}
          <div className="flex items-center shrink-0">
            <Link
              href={ROUTES.HOME}
              aria-label="JOJO Home"
              className="flex items-center shrink-0"
            >
              <div className="w-[95px] h-[42px] sm:w-[135px] sm:h-[54px] relative flex items-center">
                <JOJOCommonImage
                  src={isGold ? LOGOS.JOJO_GOLD : LOGOS.JOJO_LOGO}
                  alt="JOJO"
                  fill
                  preset={JOJOImagePreset.Logo}
                  wrapperClassName="w-full h-full cursor-pointer animate-fade-in"
                />
              </div>
            </Link>
          </div>

          {/* 2. Center Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            {navItems?.length === 0 ? (
              <NavMenuListSkeleton />
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-5">
                <FocusableSearch totalNavItems={visibleNavItems.length} />
                {visibleNavItems.map((item, index) => {
                  const targetUrl = item?.url === ROUTES.HOMEPAGE ? ROUTES.HOME : item?.url;
                  const isItemActive = pathname === targetUrl;

                  return (
                    <FocusableNavLink
                      key={`${item?.url}-${item?.title}`}
                      item={item}
                      isItemActive={isItemActive}
                      targetUrl={targetUrl}
                      index={index}
                      totalNavItems={visibleNavItems.length}
                      isGold={isGold}
                      isAuthenticated={isAuthenticated}
                    />
                  );
                })}
                {!isGold && (
                  <FocusableGetGold
                    totalNavItems={visibleNavItems.length}
                    isAuthenticated={isAuthenticated}
                  />
                )}
              </div>
            )}
          </div>

          {/* 3. Right User Avatar Profile / Login */}
          <div className="flex items-center gap-3 shrink-0">
            {isShowLanguageDropdown && (
              <LanguageSwitcher className="h-9! bg-theme_9!" />
            )}
            {!isGuest ? (
              <ProfileDropdown totalNavItems={visibleNavItems.length} isGold={isGold} />
            ) : (
              <FocusableLoginButton t={t} router={router} totalNavItems={visibleNavItems.length} isGold={isGold} />
            )}
          </div>
        </div>
      ) : (
        <div className="relative py-5 flex items-center justify-between px-4 sm:px-6 lg:px-16 overflow-visible">
          <div>
            <Link
              href={ROUTES.HOME}
              aria-label="JOJO Home"
              className="flex items-center shrink-0"
            >
              <div className="w-[80px] h-[38px] sm:w-[120px] sm:h-[65px]">
                <JOJOCommonImage
                  src={LOGOS.JOJO_LOGO}
                  alt="JOJO"
                  fill
                  preset={JOJOImagePreset.Logo}
                  wrapperClassName="w-full h-full cursor-pointer"
                />
              </div>
            </Link>
          </div>

          <div className="relative z-50 overflow-visible">
            <div className="flex items-center gap-1.5 sm:gap-3 overflow-visible">
              {showActions && (
                <>
                  {isLanding && (
                    <JOJOCustomButton
                      size={JOJOButton.Size.L}
                      state={guestLoginPending ? JOJOButton.State.DISABLED : JOJOButton.State.DEFAULT}
                      className="rounded-[100px] body-xs-medium sm:body-sm-medium h-9 sm:h-12 px-5 sm:px-5 z-10 cursor-pointer"
                      onClick={handleExplore}
                      disabled={guestLoginPending}
                    >
                      {t("explore")}
                    </JOJOCustomButton>
                  )}

                  {showNavLogin && (
                    <JOJOCustomButton
                      size={JOJOButton.Size.L}
                      hoverColor={themeColors.theme_13_samecolour}
                      state={JOJOButton.State.ACTIVE}
                      onClick={() => router.push(ROUTES.LOGIN)}
                      className="rounded-[100px] body-xs-medium sm:body-sm-medium h-9 sm:h-12 px-5 sm:px-5 z-10 cursor-pointer"
                    >
                      {t("login")}
                    </JOJOCustomButton>
                  )}
                </>
              )}
              {isAuthenticated && !isGuest && (isCreateAccount || isAddProfile || isHome) && (
                <>
                  <LogoutButton />
                </>
              )}
              <div className="relative z-50 flex items-center gap-1 sm:gap-2 overflow-visible">
                {showLanguageDropdown && !isLanding && (
                  <LanguageSwitcher className="relative z-[9999] overflow-visible" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isGold={isGold}
        visibleNavItems={visibleNavItems}
        pathname={pathname}
      />

      {isBrowsingMode && (
        <BottomNav
          navItems={navItems}
          onSearchClick={() => router.push(`${ROUTES.SEARCH}?from=app`)}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
      )}
    </header>
  );
}
