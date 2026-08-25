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

function FocusableGetGold() {
  const router = useRouter();
  
  const handleArrowPress = (direction: string) => {
    if (direction === 'up') return false;
    if (direction === 'right') {
      setFocus('navbar-search');
      return false;
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
      className={`cursor-pointer px-4 py-1.5 text-black body-md-semibold whitespace-nowrap rounded-full transition-transform duration-200 ${focused ? "scale-110 ring-2 ring-white" : ""}`}
      style={{ background: "linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)" }}
    >
      Get Gold
    </div>
  );
}

function FocusableSearch() {
  const router = useRouter();
  
  const handleArrowPress = (direction: string) => {
    if (direction === 'up') return false;
    if (direction === 'left') {
      setFocus('navbar-get-gold');
      return false;
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
      className={`text-theme_1 hover:text-theme_13_samecolour transition-colors p-1.5 rounded-full hover:bg-theme_1/5 cursor-pointer flex items-center justify-center ${focused ? "scale-110 ring-2 ring-white bg-theme_1/10" : ""}`}
      aria-label="Search"
    >
      <Search className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
    </div>
  );
}

function FocusableLoginButton({ t, router }: { t: any; router: any }) {
  const handleArrowPress = (direction: string) => {
    if (direction === 'up') return false;
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
      className={`z-[100] overflow-visible transition-all duration-300 ${isBrowsingMode ? "fixed top-0 left-0 right-0" : "sticky top-0"
        }`}
      style={isScrolled && !isBrowsingMode ? { WebkitBackdropFilter: "blur(4px)", backdropFilter: "blur(4px)" } : undefined}
    >
      <div
        className="pointer-events-none absolute inset-x-0 -top-10 h-35.5 z-0 top-fade-gradient"
      />

      {isBrowsingMode ? (
        <div className="relative py-4 lg:pt-8 sm:pt-4 flex items-center justify-between px-2 sm:px-6 lg:px-8">
          <div
            className="h-12 sm:h-[60px] flex items-center gap-3 lg:gap-6 bg-theme_10_80 rounded-full px-4 sm:px-8 shadow-lg transition-all duration-300"
            style={{ WebkitBackdropFilter: "blur(4px)", backdropFilter: "blur(4px)" }}
          >
            {navItems?.length === 0 ? (
              <NavMenuListSkeleton />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Link
                    href={ROUTES.HOME}
                    aria-label="JOJO Home"
                    className="flex items-center shrink-0"
                  >
                    <div className="w-[70px] h-[32px] sm:w-[110px] sm:h-[42px] relative flex items-center">
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

                <div className="hidden lg:flex items-center gap-4 lg:gap-5 text-sm font-semibold">
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
                      />
                    );
                  })}
                  {!isGold && <FocusableGetGold />}
                </div>
              </>
            )}
          </div>
            <div
              className="h-10 sm:h-[60px] flex items-center gap-2 bg-theme_10_80 border-none rounded-full px-4"
              style={{ WebkitBackdropFilter: "blur(4px)", backdropFilter: "blur(4px)" }}
            >
              <FocusableSearch />
            {isShowLanguageDropdown && (
              <LanguageSwitcher className="h-9! bg-theme_9!" />
            )}
            {!isGuest ? (
              <ProfileDropdown />
            ) : (
              <FocusableLoginButton t={t} router={router} />
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
