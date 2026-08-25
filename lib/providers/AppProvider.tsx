"use client";

import { MainLoader } from "@/components/common/Loader";
import { useIsMobile } from "@/hooks/useIsMobile";
import { normalizePathname } from "@/lib/utils/pathname";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { useProfiles } from "@features/profile/hooks/useProfiles";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import {
  AUTH_ONLY_ROUTES,
  ROUTES,
  UNAUTHENTICATED_ENTRY_ROUTE,
  isPublicRoute,
  isGuestAllowedRoute,
} from "@lib/constants/routes";
import { logger } from "@lib/logger/logger";
import {
  canRenderWebsiteOnMobile,
  getProfileSelectionRoute,
  shouldRedirectAuthenticatedUsersToHome
} from "@lib/mobile/mobileAccess";
import { connectSocket, disconnectSocket } from "@lib/socket/connectSocket";
import { socketClient } from "@lib/socket/socket.client";
import { ownsLock, releaseLock, setupLockCleanup, tryAcquireLock, forceAcquireLock } from "@lib/socket/socket.lock";
import { useAuthStore } from "@store/useAuthStore";
import { useLocaleStore } from "@store/useLocaleStore";
import { useProfileStore } from "@store/useProfileStore";
import { useWatchlistStore } from "@store/useWatchlistStore";
import { useContinueWatchingStore } from "@store/useContinueWatchingStore";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useDeepLinkHandler, deepLinkManager } from "@/lib/deeplink/useDeepLinkHandler";

interface AppProviderProps {
  children: ReactNode;
}


// Routes that require auth but don't require a selected profile
const NO_PROFILE_REQUIRED_ROUTES = [
  ROUTES.ADD_PROFILE,
  ROUTES.AVATAR,
  ROUTES.WATCHING,
  ROUTES.REGISTER_CREATE_ACCOUNT,
] as const;

function isNoProfileRequiredRoute(pathname: string): boolean {
  return (
    NO_PROFILE_REQUIRED_ROUTES.some((route) => pathname.startsWith(route)) ||
    // /watch/[id] requires a selected profile — handled below
    false
  );
}

// Check if route is auth-only (unauthenticated users only).
// IMPORTANT: Uses exact match ONLY — no startsWith — because /register is a
// parent segment of /register/otp and /register/create-account which are NOT
// auth-only routes. Prefix matching would incorrectly block authenticated users
// from those sub-routes and cause an infinite redirect loop.
function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some(route => pathname === route);
}

export function AppProvider({ children }: AppProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, isReady: isMobileReady } = useIsMobile();

  // State from stores
  const sessionId = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const isGuest = user?.isGuest ?? false;
  const selectedProfile = useProfileStore(state => state.selectedProfile);
  // Bootstrap state
  const { isAppReady } = useBootstrap();

  // Hook up Deep Link Manager Handlers (UTM, QR pairing, fast Gold redirects, sharing redirects)
  const {
    showMismatchPopup,
    pendingAsset,
    confirmMismatch,
    cancelMismatch,
  } = useDeepLinkHandler(isAppReady);

  // Profile query (enabled only when ready AND has session)
  const profilesQuery = useProfiles(isAppReady);
  const hasUserSelectedProfile = useProfileStore(state => state.hasUserSelectedProfile);
  const setSelectedProfile = useProfileStore(state => state.setSelectedProfile);
  const locale = useLocaleStore(state => state.locale);

  // Debug: Watch selectedProfile changes
  useEffect(() => {
    logger.info('[AppProvider] selectedProfile changed', {
      profile: selectedProfile ? {
        profile_id: selectedProfile.profile_id,
        profile_name: selectedProfile.profile_name
      } : null,
      hasUserSelected: hasUserSelectedProfile,
      pathname
    });

    // Clear Continue Watching & Watchlist items when profile changes to prevent showing stale items from old profile
    useContinueWatchingStore.getState().clearItems();
    useWatchlistStore.getState().clearWatchlist();

    if (selectedProfile && socketClient.isConnected) {
      socketClient.emitRequest('select-profile', {
        profile_id: selectedProfile.profile_id
      }, true);
      if (!isGuest) {
        useContinueWatchingStore.getState().fetchItems();
      }
    }
  }, [selectedProfile]);



  // Setup lock cleanup on mount
  useEffect(() => {
    setupLockCleanup();
  }, []);

  // Track session start
  const lastSessionId = useRef<string | null>(null);
  useEffect(() => {
    if (sessionId && sessionId !== lastSessionId.current) {
      lastSessionId.current = sessionId;
      try {
        analyticsService.track(EVENT_NAMES.SESSION_START, {
          session_id: sessionId,
        });
      } catch (e) { }
    }
  }, [sessionId]);

  // SOCKET MANAGEMENT (Multi-tab safe)
  // CRITICAL: Socket connects ONLY when app is ready AND session exists
  // This ensures socket is ready when user clicks profile
  useEffect(() => {
    // Wait for bootstrap to complete
    if (!isAppReady) {
      return;
    }

    if (!sessionId) {
      // No session - disconnect and release lock
      disconnectSocket();
      releaseLock();
      return;
    }

    // Try to acquire lock
    let hasLock = tryAcquireLock(sessionId);

    if (hasLock) {
      // We own the lock - connect socket IMMEDIATELY
      logger.info('[AppProvider] Connecting socket (lock acquired)');
      connectSocket(sessionId);
    } else {
      // Another tab owns the lock - don't connect
      logger.info('[AppProvider] Not connecting socket (lock owned by another tab)');
    }

    // Continuously check if we can steal the lock (if the other tab died)
    const lockCheckInterval = setInterval(() => {
      if (!ownsLock()) {
        if (tryAcquireLock(sessionId)) {
          logger.info('[AppProvider] Successfully stole the lock from dead tab, connecting socket...');
          connectSocket(sessionId);
        }
      }
    }, 5000);

    // Cleanup on unmount or session change
    return () => {
      clearInterval(lockCheckInterval);
      if (ownsLock()) {
        disconnectSocket();
        releaseLock();
      }
    };
  }, [sessionId, isAppReady]);

  // Dynamically update socket auth language on locale changes without disconnecting/reconnecting
  useEffect(() => {
    if (isAppReady && sessionId) {
      socketClient.updateLanguage(locale);
    }
  }, [locale, isAppReady, sessionId]);

  // Helper to check if current route is a priority screen (Player, Details, Watching)
  const isPriorityRoute = (path: string) => {
    const normalized = normalizePathname(path);
    return (
      normalized.startsWith(ROUTES.WATCH_BASE) ||
      normalized.startsWith(ROUTES.MOVIES + "/") ||
      normalized.startsWith(ROUTES.SHOWS + "/") ||
      normalized.startsWith(ROUTES.NATAK + "/") ||
      normalized.startsWith(ROUTES.GENRE + "/") ||
      normalized === ROUTES.WATCHING
    );
  };

  // Force socket connection on priority screens (Player, Details, Watching) on route change
  useEffect(() => {
    if (!isAppReady || !sessionId) return;

    const path = pathname;
    if (isPriorityRoute(path)) {
      if (!ownsLock()) {
        logger.info('[AppProvider] Priority route detected, force-acquiring socket lock', { path });
        forceAcquireLock(sessionId);
        connectSocket(sessionId);
      } else if (!socketClient.isConnected) {
        logger.info('[AppProvider] Priority route detected, socket not connected, connecting...', { path });
        connectSocket(sessionId);
      }
    }
  }, [pathname, sessionId, isAppReady]);

  // Steal socket lock when window is focused and user is on a priority screen
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      if (sessionId && isAppReady) {
        const path = pathname;
        if (isPriorityRoute(path) && !ownsLock()) {
          logger.info('[AppProvider] Window focused on priority route, force-acquiring socket lock', { path });
          forceAcquireLock(sessionId);
          connectSocket(sessionId);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [sessionId, isAppReady, pathname]);

  // Global socket response handler for watchlist and continue watching
  useEffect(() => {
    const handleResponse = (response: any) => {
      logger.info('[AppProvider] Raw socket res received', {
        type: typeof response,
        hasData: !!response?.data,
        innerDataType: typeof response?.data?.data,
        topKeys: typeof response === 'object' ? Object.keys(response || {}).slice(0, 5) : [],
      });
      useWatchlistStore.getState().handleSocketResponse(response);
      useContinueWatchingStore.getState().handleSocketResponse(response);
    };

    socketClient.on('res', handleResponse);
    return () => {
      socketClient.off('res', handleResponse);
    };
  }, []);

  // Listen for socket connection and re-select profile to bind session
  useEffect(() => {
    if (!isAppReady || !sessionId) return;

    const handleConnect = () => {
      const { selectedProfile } = useProfileStore.getState();
      if (selectedProfile) {
        logger.info('[AppProvider] Socket connected, binding selected profile & fetching continue watching', {
          profile_id: selectedProfile.profile_id
        });
        socketClient.emitRequest('select-profile', {
          profile_id: selectedProfile.profile_id
        }, true);
        
        if (!isGuest) {
          useContinueWatchingStore.getState().fetchItems();
        }
      }
    };

    socketClient.on('connect', handleConnect);
    if (socketClient.isConnected) {
      handleConnect();
    }

    return () => {
      socketClient.off('connect', handleConnect);
    };
  }, [sessionId, isAppReady, isGuest]);

  // AUTO-SELECT PROFILE from API
  useEffect(() => {
    if (!profilesQuery.data) return;

    const { selected_profile } = profilesQuery.data;

    // Only auto-select if:
    // 1. User has NOT manually selected a profile
    // 2. Store has no selected profile
    // 3. API returned a selected profile
    if (!hasUserSelectedProfile && !selectedProfile && selected_profile) {
      logger.info('[AppProvider] Auto-selecting profile from API', {
        profile_id: selected_profile.profile_id,
        profile_name: selected_profile.profile_name
      });

      setSelectedProfile(selected_profile, false); // false = not user selection
    }
  }, [profilesQuery.data, hasUserSelectedProfile, selectedProfile, setSelectedProfile]);

  // SYNC SELECTED PROFILE with latest API data (handles edits/updates)
  useEffect(() => {
    if (!profilesQuery.data || !selectedProfile) return;

    const currentProfileFromApi = profilesQuery.data.profiles.find(
      (p) => p.profile_id === selectedProfile.profile_id
    );

    if (currentProfileFromApi) {
      const hasChanged =
        currentProfileFromApi.profile_name !== selectedProfile.profile_name ||
        currentProfileFromApi.avatar !== selectedProfile.avatar ||
        currentProfileFromApi.is_kid !== selectedProfile.is_kid;

      if (hasChanged) {
        logger.info('[AppProvider] Syncing selected profile with fresh API data', currentProfileFromApi);
        setSelectedProfile(
          {
            profile_id: currentProfileFromApi.profile_id,
            profile_name: currentProfileFromApi.profile_name,
            avatar: currentProfileFromApi.avatar,
            is_kid: currentProfileFromApi.is_kid,
          },
          hasUserSelectedProfile // keep user selection state
        );
      }
    }
  }, [profilesQuery.data, selectedProfile, hasUserSelectedProfile, setSelectedProfile]);

  // REDIRECT LOGIC
  useEffect(() => {
    if (!isMobileReady) {
      return;
    }

    const normalizedPath = normalizePathname(pathname);

    // ── Mobile block guard ──────────────────────────────────────────────────
    // When the current path is blocked on mobile, MobileAccessGuard is already
    // redirecting to /download-app. AppProvider must not fire a competing
    // redirect (e.g. / → /login) that would race and win, causing the login
    // page to flash instead of the download screen.
    if (!canRenderWebsiteOnMobile(normalizedPath, isMobile)) {
      logger.info('[AppProvider] ⏸  Mobile website blocked — deferring to MobileAccessGuard', {
        normalizedPath,
        isMobile,
      });
      return;
    }

    const logState = {
      isAppReady,
      hasSessionId: !!sessionId,
      pathname,
      normalizedPath,
      hasSelectedProfile: !!selectedProfile,
      selectedProfileName: selectedProfile?.profile_name || null,
      profilesLoading: profilesQuery.isLoading,
      profilesError: profilesQuery.isError,
      profileCount: profilesQuery.data?.profiles?.length || 0
    };

    logger.info('[AppProvider] ===== REDIRECT CHECK START =====', logState);

    // Wait for app to be ready
    if (!isAppReady) {
      logger.info('[AppProvider] ❌ Not ready - waiting for bootstrap');
      return;
    }

    // EARLY GUARD: Logged-in user trying to access auth-only routes
    // This runs BEFORE waiting for the profiles query, so it's instant.
    // Handles: /login, /login/otp, /register, /register/otp, /landing
    if (sessionId && !isGuest && isAuthOnlyRoute(normalizedPath)) {
      // EXCEPTION: For /login/otp, we must wait for profiles to load first.
      // A brand-new user who just verified OTP will have profiles = [] and needs
      // the OTP page's own router.push('/register/create-account') to run first.
      // If we redirect to HOME immediately, AppProvider wins the race and the
      // new user gets stuck on the main loader (profiles=[]) instead of create-account.
      if (normalizedPath === ROUTES.LOGIN_OTP) {
        // Wait until profiles are loaded (not in loading/fetching state)
        if (profilesQuery.isLoading || profilesQuery.isFetching) {
          logger.info('[AppProvider] ⏳ /login/otp — waiting for profiles before deciding redirect');
          return;
        }
        const profiles = profilesQuery.data?.profiles || [];
        if (profiles.length === 0) {
          // New user — let the OTP page navigate to /register/create-account
          logger.info('[AppProvider] ✅ /login/otp — new user (no profiles), deferring to OTP page navigation');
          return;
        }
      }

      const destination = shouldRedirectAuthenticatedUsersToHome(isMobile)
        ? ROUTES.HOME
        : getProfileSelectionRoute(isMobile);
      logger.info('[AppProvider] ➡️  Authenticated user on auth-only route, redirecting', { normalizedPath, destination });
      router.replace(destination);
      return;
    }

    const isPublic = isPublicRoute(normalizedPath);

    // EARLY GUARD: Guest on allowed routes / redirect guest if on protected route
    if (isGuest) {
      if (isGuestAllowedRoute(normalizedPath)) {
        logger.info('[AppProvider] ✅ Guest on allowed route, bypassing profile checks', { normalizedPath });
        return;
      } else if (!isPublic) {
        logger.info('[AppProvider] ➡️  Guest user on protected route, redirecting to login immediately');
        router.replace(UNAUTHENTICATED_ENTRY_ROUTE);
        return;
      }
    }

    // NO SESSION
    if (!sessionId) {
      // Check if this is a deep link initialization
      const hasDeepLink = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("data");
      if (hasDeepLink) {
        logger.info('[AppProvider] Deep link detected, postponing authentication redirect for guest login');
        return;
      }

      if (!isPublic) {
        logger.info('[AppProvider] ➡️  No session, redirecting to login', {
          from: normalizedPath,
        });
        router.push(UNAUTHENTICATED_ENTRY_ROUTE);
      } else {
        logger.info('[AppProvider] ✅ Public route, allowing access');
      }
      return;
    }

    // HAS SESSION - wait for profiles query (including background refetches).
    // CRITICAL: isFetching must also be checked (not just isLoading).
    // isLoading is only true on the very first fetch (no cached data).
    // After invalidateQueries (e.g. post profile creation), isFetching=true
    // but isLoading=false while data still holds the stale empty array.
    // Acting on stale data causes redirect loops, so we wait for both to settle.
    if (profilesQuery.isLoading || profilesQuery.isFetching) {
      logger.info('[AppProvider] ⏳ Waiting for profiles query...', {
        isLoading: profilesQuery.isLoading,
        isFetching: profilesQuery.isFetching,
      });
      return;
    }

    // Profiles query failed
    if (profilesQuery.isError) {
      logger.error('[AppProvider] ❌ Profiles query failed');
      return;
    }

    // Profiles loaded
    const profiles = profilesQuery.data?.profiles || [];
    logger.info('[AppProvider] ✅ Profiles loaded', { count: profiles.length });

    // Sync jojo_has_profile cookie for edge middleware check
    if (typeof document !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const secureFlag = isLocal ? '' : 'secure; ';
      document.cookie = `jojo_has_profile=${profiles.length > 0}; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
    }

    // NO PROFILES — send user to create their first profile.
    // EXCEPTIONS:
    // - Already on create-account → stay
    // - On /watching → stay (user may have just created a profile and navigated
    //   here; the profiles refetch is in-flight or stale. /watching handles its
    //   own empty-state UI via the Add Profile button)
    // - Public route → stay (public routes manage their own flow)
    if (profiles.length === 0) {
      if (
        normalizedPath === ROUTES.REGISTER_CREATE_ACCOUNT ||
        normalizedPath === ROUTES.WATCHING
      ) {
        logger.info('[AppProvider] ✅ No profiles but on allowed route', { normalizedPath });
      } else if (!isPublic) {
        if (isGuest) {
          logger.info('[AppProvider] ➡️  Guest user on protected route, redirecting to login');
          router.replace(UNAUTHENTICATED_ENTRY_ROUTE);
        } else {
          logger.info('[AppProvider] ➡️  No profiles, redirecting to create-account');
          router.replace(ROUTES.REGISTER_CREATE_ACCOUNT);
        }
      } else {
        logger.info('[AppProvider] ✅ Public route, skipping redirect (no profiles)');
      }
      return;
    }

    // HAS PROFILES — logged-in users who already have profile(s) cannot access /register/create-account directly
    if (normalizedPath === ROUTES.REGISTER_CREATE_ACCOUNT) {
      logger.info('[AppProvider] ➡️  User already has profile(s), redirecting away from create-account to HOME', { normalizedPath });
      router.replace(ROUTES.HOME);
      return;
    }

    // HAS PROFILES but NO SELECTED PROFILE
    if (!selectedProfile) {
      // Allow users to stay on public routes or no-profile-required routes (e.g., /profile/add-profile, /watching)
      if (isPublic || isNoProfileRequiredRoute(normalizedPath)) {
        logger.info('[AppProvider] ✅ Allowing access without selected profile', { pathname });
        return;
      }

      const profileRoute = getProfileSelectionRoute(isMobile);
      if (normalizedPath !== profileRoute) {
        logger.info('[AppProvider] ➡️  No selected profile, redirecting to profile selection route', { profileRoute });
        router.push(profileRoute);
      } else {
        logger.info('[AppProvider] ✅ Already on profile selection route (no selection)');
      }
      return;
    }

    // HAS SELECTED PROFILE
    logger.info('[AppProvider] ✅ Has selected profile', { name: selectedProfile.profile_name });

    // Redirect after auth — only from /login or /watching.
    // /register, /register/otp, /landing are handled by the auth-only guard above.
    const isLoginRoute =
      normalizedPath === ROUTES.LOGIN ||
      (normalizedPath.startsWith(`${ROUTES.LOGIN}/`) && normalizedPath !== ROUTES.LOGIN_OTP);
    const isWatchingRoute = normalizedPath === ROUTES.WATCHING;

    if (isLoginRoute || isWatchingRoute) {
      let destination = shouldRedirectAuthenticatedUsersToHome(isMobile)
        ? ROUTES.HOME
        : getProfileSelectionRoute(isMobile);

      // Check for deep link redirect stash
      const stashedAsset = localStorage.getItem("deepLinkAsset");
      if (stashedAsset) {
        try {
          const parsed = JSON.parse(stashedAsset);
          localStorage.removeItem("deepLinkAsset");
          destination = deepLinkManager.getAssetUrl(parsed);
          logger.info('[AppProvider] Redirecting to stashed deep link asset', { destination });
        } catch (e) {
          logger.error('[AppProvider] Failed to parse stashed deep link asset', e);
        }
      }

      if (normalizedPath !== destination) {
        logger.info('[AppProvider] ➡️  Has profile, redirecting to post-auth destination', {
          from: normalizedPath,
          destination,
          isMobile,
        });
        router.push(destination);
      } else {
        logger.info('[AppProvider] ✅ Already on post-auth route', { pathname });
      }
    } else {
      logger.info('[AppProvider] ✅ Already on correct route', { pathname });
    }

    logger.info('[AppProvider] ===== REDIRECT CHECK END =====');

  }, [isAppReady, isMobile, isMobileReady, sessionId, selectedProfile, profilesQuery.isLoading, profilesQuery.isFetching, profilesQuery.isError, profilesQuery.data, pathname, router]);

  // Determine if the user is authorized to view this page.
  // We default to true when the app is NOT ready to allow hydration/SSR to succeed without mismatch.
  // We also allow public routes immediately.
  const normalizedPath = normalizePathname(pathname);
  const isPublic = isPublicRoute(normalizedPath);

  let isAuthorized = true;

  if (!isPublic) {
    const isGuestAllowed = isGuestAllowedRoute(normalizedPath);
    
    if (!isAppReady) {
      // While app is bootstrapping, show loader on protected routes to prevent skeleton flashing.
      // Exception: Allow SSR for guest-allowed routes to ensure SEO tags are rendered in HTML.
      if (!isGuestAllowed) {
        isAuthorized = false;
      }
    } else {
      if (!sessionId) {
        // Not logged in (waiting for session generation) -> block ONLY if not guest allowed
        if (!isGuestAllowed) {
          isAuthorized = false;
        }
      } else if (isGuest) {
        // Guest on protected route -> only authorized if it's a guest-allowed route
        isAuthorized = isGuestAllowed;
      } else {
        // Logged-in user
        if (profilesQuery.isLoading || profilesQuery.isFetching) {
          // Still loading profiles -> show skeleton/loader (children)
          isAuthorized = true;
        } else if (profilesQuery.isError) {
          isAuthorized = false;
        } else {
          const profiles = profilesQuery.data?.profiles || [];
          if (profiles.length === 0) {
            // No profiles -> only authorized if on profile creation or watching routes
            isAuthorized = normalizedPath === ROUTES.REGISTER_CREATE_ACCOUNT || normalizedPath === ROUTES.WATCHING;
          } else if (!selectedProfile) {
            // Has profiles but no selected profile -> only authorized if on profile-exempt routes
            isAuthorized = isNoProfileRequiredRoute(normalizedPath);
          } else {
            isAuthorized = true;
          }
        }
      }
    }
  }

  // Show loader while deep link is processing to avoid flashing the home page
  const hasDeepLink = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("data");
  const isMismatchShowing = showMismatchPopup && pendingAsset;
  if (hasDeepLink && !isMismatchShowing) {
    isAuthorized = false;
  }

  if (!isAuthorized) {
    return (
      <MainLoader />
    );
  }

  return (
    <>
      {children}
      {showMismatchPopup && pendingAsset && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/85 backdrop-blur-md px-4 animate-fadeIn">
          <div
            className="relative w-full max-w-[420px] rounded-[24px] p-8 flex flex-col items-center border-[2px] border-transparent"
            style={{
              background:
                "linear-gradient(180deg, #1C120A 0%, #100D08 100%) padding-box, linear-gradient(191.09deg, #FAAF3F 0%, rgba(250, 175, 63, 0.16) 25%, rgba(250, 175, 63, 0) 50%, rgba(250, 175, 63, 0.16) 75%, #FAAF3F 100%) border-box",
              boxShadow: "0 0 40px rgba(250, 175, 63, 0.15)",
            }}
          >
            <div className="w-14 h-14 rounded-full bg-[#FAAF3F]/15 flex items-center justify-center mb-6 text-[#FAAF3F]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 text-center">
              Account Mismatch
            </h3>
            
            <p className="text-sm text-neutral-300 text-center leading-relaxed mb-8">
              This link was shared for a different account. Do you wish to continue watching under your current profile?
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={confirmMismatch}
                className="w-full py-4 rounded-full text-black font-extrabold text-sm hover:brightness-110 active:scale-98 transition-all shadow-xl shadow-orange-500/5 cursor-pointer text-center"
                style={{
                  background: "linear-gradient(44.13deg, #FAAF3F 21.63%, #FFD691 49.52%, #FAAF3F 81.68%)",
                }}
              >
                Continue Watching
              </button>

              <button
                onClick={cancelMismatch}
                className="w-full py-4 rounded-full font-bold text-sm hover:brightness-110 active:scale-98 transition-all border border-[#FAAF3F]/15 cursor-pointer text-center"
                style={{
                  background: "#1C120A",
                  color: "#FAAF3F",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
