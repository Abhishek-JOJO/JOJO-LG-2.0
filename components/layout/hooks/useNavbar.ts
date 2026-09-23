import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useActivePathname } from "@/hooks/useActivePathname";
import { useGuestLogin } from "@/features/auth/hooks/useGuestLogin";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavStore } from "@/store/useNavStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { useAppNavigation } from "@/features/navigation/hooks/useAppNavigation";
import { appConfig } from "@/lib/config/app.config";
import { ROUTES } from "@/lib/constants/routes";
import { localStorageManager } from "@/lib/localStorage/localStorage.manager";
import { StorageKey } from "@/enums/storage.enum";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { normalizePathname } from "@/lib/utils/pathname";

export function useNavbar() {
  const pathname = useActivePathname();
  const router = useRouter();
  const guestLogin = useGuestLogin();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [countryCode, setCountryCode] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const geoCache = localStorageManager.get<any>(StorageKey.GEO_CACHE);
        if (geoCache?.geoData?.country_code) {
          return geoCache.geoData.country_code;
        }
      } catch {}
    }
    return appConfig.GEO_DEFAULT_COUNTRY_CODE;
  });

  const { isAppReady } = useBootstrap();
  const sessionId = useAuthStore(state => state.token);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const isGuest = user?.isGuest ?? false;
  const selectedProfile = useProfileStore(state => state.selectedProfile);
  const storeIsGold = useSubscriptionStore(state => state.isGold);

  useEffect(() => {
    const geoCache = localStorageManager.get<any>(StorageKey.GEO_CACHE);
    if (geoCache?.geoData?.country_code) {
      setCountryCode(geoCache.geoData.country_code);
    }
  }, []);

  const { data: subData } = useVerifySubscription(countryCode, sessionId, isAppReady);
  const isSubscriptionCheckEnabled = !!sessionId && !!user && !isGuest && !!countryCode && !!isAppReady;
  const isExpired = subData?.data?.subscription?.dEndDate ? new Date(subData.data.subscription.dEndDate).getTime() < Date.now() : false;
  const isGold = (storeIsGold === true) || !!(subData?.data?.subscription && !isExpired);
  const isGoldStatusPending = isAuthenticated && !isGuest && isSubscriptionCheckEnabled && storeIsGold === null && !subData;

  const { data: apiNavItems, isLoading: isNavLoading } = useAppNavigation(isAppReady);
  const persistedNavItems = useNavStore((s) => s.persistedNavItems);
  const setPersistedNavItems = useNavStore((s) => s.setPersistedNavItems);
  const heroLoginVisible = useNavStore((s) => s.heroLoginVisible);

  useEffect(() => {
    if (apiNavItems && apiNavItems.length > 0) {
      setPersistedNavItems(apiNavItems);
    }
  }, [apiNavItems, setPersistedNavItems]);

  const navItems = apiNavItems && apiNavItems.length > 0 ? apiNavItems : persistedNavItems;

  const visibleNavItems = useMemo(() => {
    return (navItems || []).filter((item) => {
      const url = item?.url?.toLowerCase();
      return url !== ROUTES.SEARCH && url !== ROUTES.PROFILE;
    });
  }, [navItems]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const normalizedPath = pathname ? normalizePathname(pathname) : "/";
  const isWatch =
    normalizedPath === ROUTES.WATCH_BASE ||
    normalizedPath.startsWith(ROUTES.WATCH_BASE + "/") ||
    normalizedPath.startsWith("/watch") ||
    pathname?.includes("/watch") ||
    (typeof window !== "undefined" && (
      window.location.pathname.includes("/watch") ||
      window.location.href.includes("/watch") ||
      window.location.search.includes("?v=") ||
      window.location.search.includes("&v=")
    ));

  const isLanding = pathname === ROUTES.LANDING;
  const isRegister = pathname.startsWith(ROUTES.REGISTER);
  const isRegisterOtp = pathname === ROUTES.REGISTER_OTP;
  const isCreateAccount = pathname.startsWith(ROUTES.REGISTER_CREATE_ACCOUNT);
  const isAddProfile = pathname.startsWith(ROUTES.ADD_PROFILE);
  const isWatching = pathname === ROUTES.WATCHING || isWatch;
  const isAvatar = pathname === ROUTES.AVATAR;
  const isDownloadApp = pathname === ROUTES.DOWNLOAD_APP || pathname === ROUTES.APP_INSTALL || pathname === "/appInstall" || pathname === "/app-install";
  const isHome = pathname.startsWith(ROUTES.HOME);

  const showActions = (isLanding || isRegister) && !isCreateAccount;
  const showNavLogin = (!isLanding || !heroLoginVisible) && !isCreateAccount && !isWatching && !isWatch && !isRegisterOtp;

  const handleExplore = async () => {
    if (isAuthenticated) {
      router.push(ROUTES.HOME);
    } else {
      try {
        await guestLogin.mutateAsync();
        router.push(ROUTES.HOME);
      } catch (error) {
        // Handled by mutation hook
      }
    }
  };

  const isBrowsingMode =
    isAuthenticated &&
    (isGuest || !!selectedProfile) &&
    !isLanding &&
    !pathname.startsWith(ROUTES.LOGIN) &&
    !pathname.startsWith(ROUTES.REGISTER) &&
    !isWatching &&
    !isWatch &&
    !isAddProfile &&
    !isCreateAccount &&
    !isRegisterOtp &&
    !isAvatar &&
    !isDownloadApp;

  return {
    pathname,
    router,
    isScrolled,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isGold,
    isGoldStatusPending,
    navItems,
    visibleNavItems,
    isLanding,
    isHome,
    isWatching,
    isCreateAccount,
    isAddProfile,
    showActions,
    showNavLogin,
    isAuthenticated,
    isGuest,
    handleExplore,
    isBrowsingMode,
    guestLoginPending: guestLogin.isPending
  };
}
