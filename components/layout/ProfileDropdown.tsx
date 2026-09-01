"use client";

import JOJOCommonImage, {
  JOJOImageContentMode,
  JOJOImagePreset,
  JOJOImageRadius
} from "@/components/ui/JOJOCommonImage";
import { useProfiles } from "@/features/profile/hooks/useProfiles";
import { useSelectProfile } from "@/features/profile/hooks/useSelectProfile";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/useProfileStore";
import { Check, UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProfileMenuLink } from "../ui/ProfileDropdownList";
import { LogoutModal } from "./LogoutModal";
import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";

function FocusableProfileItem({ profile, isSelected, onSwitch }: any) {
  const { ref, focused } = useFocusable({
    focusKey: `profile-item-${profile.profile_id}`,
    onEnterPress: () => onSwitch(profile),
  });

  return (
    <div
      ref={ref as any}
      onClick={() => onSwitch(profile)}
      className={cn(
        "group flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer w-full text-left body_xs_regular text-theme_5",
        isSelected ? "" : "hover:bg-theme_11_samecolour",
        focused ? "bg-theme_11_samecolour ring-2 ring-white" : ""
      )}
    >
      <div className="flex items-center gap-3.5">
        {profile?.avatar && (profile.avatar.startsWith("http") || profile.avatar.startsWith("/")) ? (
          <div className={cn(
            "w-[30px] h-[30px] rounded-full overflow-hidden shrink-0",
            isSelected && "border-theme_13_samecolour"
          )}>
            <JOJOCommonImage
              src={profile?.avatar}
              alt={profile?.profile_name}
              preset={JOJOImagePreset.Avatar}
              width={30}
              height={30}
              radius={JOJOImageRadius.Full}
              contentMode={JOJOImageContentMode.Cover}
            />
          </div>
        ) : (
          <div className={cn(
            "w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-theme_5 shrink-0 border-2 body_xs_regular",
            isSelected ? "border-theme_13_samecolour bg-theme_13_samecolour" : "border-theme_13_samecolour bg-theme_13_samecolour"
          )}>
            {profile?.profile_name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <span
          className={cn(
            "body_xs_regular transition-all duration-200",
            isSelected ? "text-theme_13_samecolour" : "text-theme_5 group-hover:text-theme_13_samecolour"
          )}
        >
          {profile?.profile_name}
        </span>
      </div>
      {isSelected && (
        <Check className="w-4 h-4 text-theme_13_samecolour" />
      )}
    </div>
  );
}

function FocusableDropdownLogout({ onLogout, t }: any) {
  const { ref, focused } = useFocusable({
    focusKey: 'profile-dropdown-logout',
    onEnterPress: onLogout,
  });

  return (
    <div
      ref={ref as any}
      onClick={onLogout}
      className={cn(
        "w-full text-left px-3 py-2 body_xs_regular text-theme_5 rounded-xl transition-all duration-200 cursor-pointer hover:text-theme_13_samecolour",
        focused ? "bg-theme_11_samecolour ring-2 ring-white text-theme_13_samecolour" : ""
      )}
    >
      {t("logout")}
    </div>
  );
}

interface ProfileDropdownProps {
  totalNavItems?: number;
  isGold?: boolean;
}

export function ProfileDropdown({ totalNavItems = 0, isGold = false }: ProfileDropdownProps) {
  const pathname = usePathname();
  const selectedProfile = useProfileStore((state) => state.selectedProfile);
  const { isAppReady } = useBootstrap();
  const { data: profilesData } = useProfiles(isAppReady);
  const selectProfileMutation = useSelectProfile();
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // isDropdownOpen = should be open, isVisible = controls CSS animation
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
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
        setTimeout(() => setFocus('profile-dropdown-boundary'), 50);
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

  const allProfiles = profilesData?.profiles || [];

  const handleProfileSwitch = (profile: any) => {
    if (profile?.profile_id === selectedProfile?.profile_id) {
      closeDropdown();
      return;
    }
    closeDropdown();
    selectProfileMutation.mutate(profile);
  };

  const handleDropdownLogout = () => {
    closeDropdown();
    setIsLogoutModalOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      if (clickedOutsideTrigger && clickedOutsideDropdown) {
        closeDropdown();
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDropdownOpen]);

  const dropdownContent = isMounted ? (
    <ProfileDropdownMenu
      dropdownRef={dropdownRef}
      dropdownPos={dropdownPos}
      isVisible={isVisible}
      allProfiles={allProfiles}
      selectedProfile={selectedProfile}
      handleProfileSwitch={handleProfileSwitch}
      handleDropdownLogout={handleDropdownLogout}
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
          className={`relative flex items-center justify-center cursor-pointer focus:outline-none transition-all duration-200 p-[2px] rounded-full border-2 border-[#FF6B00] bg-gradient-to-br from-[#FF6B00]/40 to-amber-500/20 ${
            focused ? "scale-110 ring-4 ring-white shadow-[0_0_16px_rgba(255,255,255,0.7)]" : "hover:scale-105"
          }`}
          aria-label="Profile Menu"
        >
          {selectedProfile?.avatar && (selectedProfile.avatar.startsWith("http") || selectedProfile.avatar.startsWith("/")) ? (
            <div id="navbar-profile-avatar" className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] rounded-full overflow-hidden shrink-0">
              <JOJOCommonImage
                src={selectedProfile.avatar}
                alt={selectedProfile.profile_name}
                preset={JOJOImagePreset.Avatar}
                width={38}
                height={38}
                radius={JOJOImageRadius.Full}
                contentMode={JOJOImageContentMode.Cover}
              />
            </div>
          ) : (
            <div id="navbar-profile-avatar" className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] rounded-full flex items-center justify-center text-xs font-bold text-white bg-theme_13_samecolour shrink-0">
              {selectedProfile?.profile_name?.charAt(0).toUpperCase() ||
                <UserCircle className="w-5 h-5 text-white" />}
            </div>
          )}
        </div>

        {/* Portal: renders outside any overflow/transform ancestor so backdrop-filter works */}
        {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}

        <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />
      </div>
    </>
  );
}

function ProfileDropdownMenu({
  dropdownRef,
  dropdownPos,
  isVisible,
  allProfiles,
  selectedProfile,
  handleProfileSwitch,
  handleDropdownLogout,
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

        {allProfiles?.map((profile: any) => (
          <FocusableProfileItem
            key={profile?.profile_id}
            profile={profile}
            isSelected={profile?.profile_id === selectedProfile?.profile_id}
            onSwitch={handleProfileSwitch}
          />
        ))}

        {allProfiles?.length > 0 && <div className="h-px bg-theme_7 my-1" />}

        <ProfileMenuLink href={ROUTES.MANAGE_PROFILE}>
          {t("manage_profiles")}
        </ProfileMenuLink>

        <ProfileMenuLink href={ROUTES.WATCHLIST}>
          {t("watch_list")}
        </ProfileMenuLink>

        <ProfileMenuLink href={ROUTES.ACCOUNT_SETTINGS}>
          {t("account_settings")}
        </ProfileMenuLink>

        <ProfileMenuLink href="https://help.jojoapp.in/" target="_blank">
          {t("help_and_support")}
        </ProfileMenuLink>

        <div className="h-px bg-theme_7 my-1" />

        <FocusableDropdownLogout onLogout={handleDropdownLogout} t={t} />
      </div>
    </FocusContext.Provider>
  );
}

