"use client";

import JOJOCommonImage, {
  JOJOImageContentMode,
  JOJOImagePreset,
  JOJOImageRadius
} from "@/components/ui/JOJOCommonImage";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/useProfileStore";
import { UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExitConfirmStore } from "@/store/useExitConfirmStore";
import { useFocusable, FocusContext, setFocus, doesFocusableExist, getCurrentFocusKey } from "@noriginmedia/norigin-spatial-navigation";
import { useActiveRailStore } from "@/store/useActiveRailStore";
import { tvNavigate } from "@/src/navigation/tvNavigate";
import { safeNavigate } from "@/lib/webos/safeNavigate";
import { useTvOverlayStore } from "@/store/useTvOverlayStore";

// The dropdown mounts several focusables at once (menu links) the
// moment it opens, via a React portal. norigin's setFocus/addFocusable share a
// single-slot scheduler ("a new task replaces the pending next task"), so a
// single setFocus call racing that mount storm can get clobbered and silently
// do nothing — leaving the dropdown open with nothing focused. Retry a few
// times instead of hoping one attempt lands.
function retrySetFocus(focusKey: string, attempts = 6, intervalMs = 60) {
  let tries = 0;
  const attempt = () => {
    tries += 1;
    if (doesFocusableExist(focusKey)) {
      setFocus(focusKey);
    } else if (tries < attempts) {
      setTimeout(attempt, intervalMs);
    }
  };
  setTimeout(attempt, 30);
}

interface ProfileDropdownProps {
  totalNavItems?: number;
  isGold?: boolean;
}

export function ProfileDropdown({ totalNavItems = 0, isGold = false }: ProfileDropdownProps) {
  const pathname = usePathname();
  const router = useRouter();
  const selectedProfile = useProfileStore((state) => state.selectedProfile);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unmountTimerRef = useRef<NodeJS.Timeout | null>(null);
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingUpFromMenuRef = useRef(false);

  // isDropdownOpen = should be open, isVisible = controls CSS animation
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [dropdownPos, setDropdownPos] = useState({ top: 80, right: 40 });
  const t = useTranslations("profile-dropdown");

  const cancelPendingOpen = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  // Open: cancel any pending unmount, measure trigger, mount immediately
  const openDropdown = useCallback(() => {
    cancelPendingOpen();
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 12,
        right: Math.max(10, window.innerWidth - rect.right - 14),
      });
    }
    setIsMounted(true);
    setIsDropdownOpen(true);
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, [cancelPendingOpen]);

  // Debounced open on focus to prevent accidental opening during fast navigation
  const scheduleOpenDropdown = useCallback(() => {
    cancelPendingOpen();
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      if (!isNavigatingUpFromMenuRef.current) {
        openDropdown();
      }
    }, 180);
  }, [cancelPendingOpen, openDropdown]);

  // Close: remove visible class first, unmount after transition ends
  const closeDropdown = useCallback(() => {
    cancelPendingOpen();
    setIsVisible(false);
    setIsDropdownOpen(false);
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
    }
    unmountTimerRef.current = setTimeout(() => {
      setIsMounted(false);
      unmountTimerRef.current = null;
    }, 200);
  }, [cancelPendingOpen]);

  const toggleDropdown = () => {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  useEffect(() => {
    closeDropdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close immediately during fast scroll, mouse wheel, or touchmove
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleScrollOrMove = () => {
      closeDropdown();
    };

    window.addEventListener("scroll", handleScrollOrMove, { capture: true, passive: true });
    window.addEventListener("wheel", handleScrollOrMove, { capture: true, passive: true });
    window.addEventListener("touchmove", handleScrollOrMove, { capture: true, passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollOrMove, { capture: true } as any);
      window.removeEventListener("wheel", handleScrollOrMove, { capture: true } as any);
      window.removeEventListener("touchmove", handleScrollOrMove, { capture: true } as any);
    };
  }, [isDropdownOpen, closeDropdown]);

  // Close immediately when user navigates to rail sections below
  useEffect(() => {
    if (!isDropdownOpen) return;
    const unsub = useActiveRailStore.subscribe((state) => {
      if (state.activeSectionIndex !== null && state.activeSectionIndex > 0) {
        closeDropdown();
      }
    });
    return () => unsub();
  }, [isDropdownOpen, closeDropdown]);

  // Close during fast remote/keyboard navigation if focus leaves the profile section
  useEffect(() => {
    if (!isDropdownOpen) return;

    const checkFocus = () => {
      const currentKey = getCurrentFocusKey();
      if (!currentKey) return;
      const isProfileFocus =
        currentKey === 'navbar-profile-trigger' ||
        currentKey === 'profile-dropdown-boundary' ||
        currentKey === 'profile-menu-switch' ||
        currentKey === 'profile-menu-account' ||
        currentKey === 'profile-menu-exit';
      if (!isProfileFocus) {
        closeDropdown();
      }
    };

    window.addEventListener('keydown', checkFocus, { passive: true });
    window.addEventListener('keyup', checkFocus, { passive: true });

    return () => {
      window.removeEventListener('keydown', checkFocus);
      window.removeEventListener('keyup', checkFocus);
    };
  }, [isDropdownOpen, closeDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      if (clickedOutsideTrigger && clickedOutsideDropdown) {
        closeDropdown();
      }
    };
    const handleBackKey = (e: KeyboardEvent) => {
      if (e.keyCode === 461 || e.key === "Back" || e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        isNavigatingUpFromMenuRef.current = true;
        closeDropdown();
        setFocus('navbar-profile-trigger');
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleBackKey, { capture: true });
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleBackKey, { capture: true });
    };
  }, [isDropdownOpen, closeDropdown]);

  const openExit = useExitConfirmStore((state) => state.open);
  const openTvOverlay = useTvOverlayStore((state) => state.open);
  const handleExit = () => {
    closeDropdown();
    openExit();
  };

  const handleSwitchProfile = () => {
    closeDropdown();
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      openTvOverlay("watching");
      return;
    }
    tvNavigate(ROUTES.WATCHING, router);
  };

  const handleAccountSettings = () => {
    closeDropdown();
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      openTvOverlay("account-settings");
      return;
    }
    safeNavigate(router, ROUTES.ACCOUNT_SETTINGS);
  };

  const handleArrowUpFromMenu = () => {
    isNavigatingUpFromMenuRef.current = true;
    closeDropdown();
    setFocus('navbar-profile-trigger');
  };

  const handleArrowDownFromMenu = useCallback(() => {
    closeDropdown();
    if (document.getElementById('hero-carousel-container')) {
      setFocus('hero-carousel');
      return;
    }
    const entry = document.getElementById('page-focus-entry');
    const entryFocusKey = entry?.getAttribute('data-focuskey');
    if (entryFocusKey) {
      setFocus(entryFocusKey);
    }
  }, [closeDropdown]);

  const dropdownContent = isMounted ? (
    <ProfileDropdownMenu
      dropdownRef={dropdownRef}
      dropdownPos={dropdownPos}
      isVisible={isVisible}
      t={t}
      onExit={handleExit}
      onSwitchProfile={handleSwitchProfile}
      onAccountSettings={handleAccountSettings}
      onArrowUp={handleArrowUpFromMenu}
      onArrowDownExit={handleArrowDownFromMenu}
    />
  ) : null;

  const { ref: focusableRef, focused } = useFocusable({
    focusKey: 'navbar-profile-trigger',
    onFocus: () => {
      if (isNavigatingUpFromMenuRef.current) {
        return;
      }
      scheduleOpenDropdown();
    },
    onBlur: () => {
      isNavigatingUpFromMenuRef.current = false;
      cancelPendingOpen();
      // When focus leaves the trigger, check if it moved into the dropdown menu.
      // If it moved anywhere else (e.g. Search, Hero, or during fast navigation), close immediately.
      setTimeout(() => {
        const currentKey = getCurrentFocusKey();
        const isInsideMenu =
          currentKey === 'profile-menu-switch' ||
          currentKey === 'profile-menu-account' ||
          currentKey === 'profile-menu-exit';
        if (!isInsideMenu && currentKey !== 'navbar-profile-trigger') {
          closeDropdown();
        }
      }, 40);
    },
    onArrowPress: (direction) => {
      if (direction === 'up') return false;
      if (direction === 'left') {
        cancelPendingOpen();
        isNavigatingUpFromMenuRef.current = false;
        closeDropdown();
        setFocus('navbar-search');
        return false;
      }
      if (direction === 'right') return false;
      if (direction === 'down') {
        cancelPendingOpen();
        if (isDropdownOpen) {
          retrySetFocus('profile-menu-switch');
          return false;
        }
        // If dropdown is closed, allow direct down navigation into page content
        if (document.getElementById('hero-carousel-container')) {
          setFocus('hero-carousel');
          return false;
        }
        const entry = document.getElementById('page-focus-entry');
        const entryFocusKey = entry?.getAttribute('data-focuskey');
        if (entryFocusKey) {
          setFocus(entryFocusKey);
          return false;
        }
        return true;
      }
      return true;
    },
    onEnterPress: () => {
      cancelPendingOpen();
      isNavigatingUpFromMenuRef.current = false;
      if (!isDropdownOpen) {
        openDropdown();
      }
      retrySetFocus('profile-menu-switch');
    },
  });

  useEffect(() => {
    if (focused && !isDropdownOpen) {
      if (!isNavigatingUpFromMenuRef.current) {
        scheduleOpenDropdown();
      }
    } else if (!focused) {
      cancelPendingOpen();
    }
  }, [focused, isDropdownOpen, scheduleOpenDropdown, cancelPendingOpen]);

  return (
    <>
      <div className="relative shrink-0 flex items-center" ref={triggerRef}>
        <div
          id="navbar-profile-trigger"
          ref={focusableRef as any}
          onClick={toggleDropdown}
          className={`relative flex items-center justify-center cursor-pointer focus:outline-none transition-all duration-200 p-[2px] rounded-full border-2 ${
            focused ? "scale-110 border-white" : "border-transparent hover:scale-105"
          }`}
          aria-label="Profile Menu"
        >
          {selectedProfile?.avatar && (selectedProfile.avatar.startsWith("http") || selectedProfile.avatar.startsWith("/")) ? (
            <div id="navbar-profile-avatar" className="w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] p-[3px] rounded-full overflow-hidden shrink-0 bg-[#1a1a1a]">
              <JOJOCommonImage
                src={selectedProfile.avatar}
                alt={selectedProfile.profile_name}
                preset={JOJOImagePreset.Avatar}
                radius={JOJOImageRadius.Full}
                contentMode={JOJOImageContentMode.Cover}
                wrapperClassName="w-full h-full"
              />
            </div>
          ) : (
            <div id="navbar-profile-avatar" className="w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-full flex items-center justify-center text-sm font-bold text-white bg-theme_13_samecolour shrink-0">
              {selectedProfile?.profile_name?.charAt(0).toUpperCase() ||
                <UserCircle className="w-6 h-6 text-white" />}
            </div>
          )}
        </div>

        {/* Portal: renders outside any overflow/transform ancestor so backdrop-filter works */}
        {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
      </div>
    </>
  );
}

function ProfileDropdownMenu({
  dropdownRef,
  dropdownPos,
  isVisible,
  t,
  onExit,
  onSwitchProfile,
  onAccountSettings,
  onArrowUp,
  onArrowDownExit,
}: any) {
  const { ref: dropdownBoundaryRef, focusKey: dropdownBoundaryKey } = useFocusable({
    focusKey: 'profile-dropdown-boundary',
    isFocusBoundary: true,
  });

  return (
    <FocusContext.Provider value={dropdownBoundaryKey}>
      <div
        ref={(node) => {
          (dropdownRef as any).current = node;
          if (typeof (dropdownBoundaryRef as any) === 'function') {
            (dropdownBoundaryRef as any)(node);
          } else if (dropdownBoundaryRef) {
            (dropdownBoundaryRef as any).current = node;
          }
        }}
        style={{
          position: "fixed",
          top: dropdownPos.top,
          right: dropdownPos.right,
          zIndex: 9999,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "scale(1) translateY(0px)" : "scale(0.95) translateY(-8px)",
          transformOrigin: "top right",
          transition: "opacity 200ms ease, transform 200ms ease",
          pointerEvents: isVisible ? "auto" : "none",
        }}
        className="w-60 bg-theme_10_80 border-none rounded-[15px] shadow-2xl py-3 px-3.5 flex flex-col gap-1 mt-2"
      >
        <div className="absolute right-[18px] -top-1.5 w-3 h-3 rotate-45 z-[1]" />

        <ProfileMenuSwitchItem onSwitch={onSwitchProfile} onArrowUp={onArrowUp} t={t} />

        <ProfileMenuAction
          focusKey="profile-menu-account"
          onEnter={onAccountSettings}
          onArrowPress={(direction) => {
            if (direction === 'up') {
              setFocus('profile-menu-switch');
              return false;
            }
            if (direction === 'down') {
              setFocus('profile-menu-exit');
              return false;
            }
            if (direction === 'left') {
              onArrowUp?.();
              return false;
            }
            if (direction === 'right') return false;
            return true;
          }}
        >
          {t("account_settings")}
        </ProfileMenuAction>

        <ProfileMenuAction
          focusKey="profile-menu-exit"
          onEnter={onExit}
          onArrowPress={(direction) => {
            if (direction === 'up') {
              setFocus('profile-menu-account');
              return false;
            }
            if (direction === 'down') {
              onArrowDownExit?.();
              return false;
            }
            if (direction === 'left') {
              onArrowUp?.();
              return false;
            }
            if (direction === 'right') return false;
            return true;
          }}
        >
          {t("exit") || "Exit"}
        </ProfileMenuAction>
      </div>
    </FocusContext.Provider>
  );
}

function ProfileMenuSwitchItem({
  onSwitch,
  onArrowUp,
  t,
}: {
  onSwitch: () => void;
  onArrowUp?: () => void;
  t: any;
}) {
  const { ref, focused } = useFocusable({
    focusKey: 'profile-menu-switch',
    onArrowPress: (direction) => {
      if (direction === 'up') {
        onArrowUp?.();
        return false;
      }
      if (direction === 'down') {
        setFocus('profile-menu-account');
        return false;
      }
      if (direction === 'left') {
        onArrowUp?.();
        return false;
      }
      if (direction === 'right') return false;
      return true;
    },
    onEnterPress: onSwitch,
  });

  return (
    <div
      id="profile-menu-switch"
      ref={ref as any}
      onClick={onSwitch}
      className={cn(
        "block w-full rounded-xl px-3 py-2 text-left body_xs_regular transition-all duration-200 cursor-pointer",
        focused
          ? "bg-theme_11_samecolour border-2 border-white text-theme_13_samecolour font-bold"
          : "border-2 border-transparent text-theme_5 hover:bg-theme_11_samecolour hover:text-theme_13_samecolour"
      )}
    >
      {t("switch_profile") || "Switch Profile"}
    </div>
  );
}

function ProfileMenuAction({
  focusKey,
  onEnter,
  onArrowPress,
  children,
}: {
  focusKey: string;
  onEnter: () => void;
  onArrowPress?: (direction: string) => boolean;
  children: React.ReactNode;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onArrowPress,
    onEnterPress: onEnter,
  });

  return (
    <div
      id={focusKey}
      ref={ref as any}
      onClick={onEnter}
      className={cn(
        "block w-full rounded-xl px-3 py-2 text-left body_xs_regular transition-all duration-200 cursor-pointer",
        focused
          ? "bg-theme_11_samecolour border-2 border-white text-theme_13_samecolour font-bold"
          : "border-2 border-transparent text-theme_5 hover:bg-theme_11_samecolour hover:text-theme_13_samecolour"
      )}
    >
      {children}
    </div>
  );
}
