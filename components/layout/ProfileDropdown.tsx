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
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProfileMenuLink } from "../ui/ProfileDropdownList";
import { useFocusable, FocusContext, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";

// The dropdown mounts several focusables at once (menu links) the
// moment it opens, via a React portal. norigin's setFocus/addFocusable share a
// single-slot scheduler ("a new task replaces the pending next task"), so a
// single setFocus call racing that mount storm can get clobbered and silently
// do nothing — leaving the dropdown open with nothing focused. Retry a few
// times instead of hoping one attempt lands (same fix used elsewhere in this
// app for the identical race, e.g. AssetDetailView.tsx).
function retrySetFocus(focusKey: string, attempts = 6, intervalMs = 90) {
  let tries = 0;
  const attempt = () => {
    tries += 1;
    if (doesFocusableExist(focusKey)) {
      setFocus(focusKey);
    }
    if (tries < attempts) {
      setTimeout(attempt, intervalMs);
    }
  };
  setTimeout(attempt, intervalMs);
}

interface ProfileDropdownProps {
  totalNavItems?: number;
  isGold?: boolean;
}

export function ProfileDropdown({ totalNavItems = 0, isGold = false }: ProfileDropdownProps) {
  const pathname = usePathname();
  const selectedProfile = useProfileStore((state) => state.selectedProfile);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // isDropdownOpen = should be open, isVisible = controls CSS animation
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const t = useTranslations("profile-dropdown");

  // Open: mount first, then trigger CSS transition on next tick
  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right - 14,
      });
    }
    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
        retrySetFocus('profile-dropdown-boundary');
      });
    });
    setIsDropdownOpen(true);
  };

  // Close: remove visible class first, unmount after transition ends
  const closeDropdown = () => {
    if (isDropdownOpen) {
      setFocus('navbar-profile-trigger');
    }
    setIsVisible(false);
    setIsDropdownOpen(false);
    setTimeout(() => setIsMounted(false), 200);
  };

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
        closeDropdown();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDropdownOpen]);

  const dropdownContent = isMounted ? (
    <ProfileDropdownMenu
      dropdownRef={dropdownRef}
      dropdownPos={dropdownPos}
      isVisible={isVisible}
      t={t}
    />
  ) : null;

  const { ref: focusableRef, focused } = useFocusable({
    focusKey: 'navbar-profile-trigger',
    onArrowPress: (direction) => {
      if (direction === 'up') return false;
      if (direction === 'left') {
        if (!isGold) {
          setFocus('navbar-get-gold');
        } else if (totalNavItems > 0) {
          setFocus(`nav-link-${totalNavItems - 1}`);
        }
        return false;
      }
      if (direction === 'down') {
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
      }
      return true;
    },
    onEnterPress: toggleDropdown,
  });

  return (
    <>
      <div className="relative shrink-0 flex items-center" ref={triggerRef}>
        <div
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

        <ProfileMenuLink href={ROUTES.MANAGE_PROFILE}>
          {t("manage_profiles")}
        </ProfileMenuLink>

        <ProfileMenuLink href={ROUTES.ACCOUNT_SETTINGS}>
          {t("account_settings")}
        </ProfileMenuLink>
      </div>
    </FocusContext.Provider>
  );
}

