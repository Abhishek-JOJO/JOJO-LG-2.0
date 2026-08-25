"use client";

import Link from "next/link";
import { useActivePathname } from "@/hooks/useActivePathname";
import { ROUTES } from "@/lib/constants/routes";
import { Home, Film, Tv, Search, Menu, Compass } from "lucide-react";
import { useTranslations } from "next-intl";

interface BottomNavProps {
  navItems: any[];
  onSearchClick: () => void;
  onMenuClick: () => void;
}

export function BottomNav({ navItems, onSearchClick, onMenuClick }: BottomNavProps) {
  const pathname = useActivePathname();
  const tNav = useTranslations("Navbar");

  // Filter out Profile and Search from standard mapped items
  const mainNavItems = navItems.filter((item) => {
    const url = item?.url?.toLowerCase();
    return url !== ROUTES.SEARCH && url !== ROUTES.PROFILE;
  }).slice(0, 3); // Max 3 items from backend to leave room for Search & Menu (total 5)

  const getIconForUrl = (url: string | undefined, isActive: boolean) => {
    const urlLower = url?.toLowerCase() || "";
    const baseIconClass = `w-6 h-6 sm:w-7 sm:h-7 transition-all duration-300 ${isActive ? "text-theme_1 drop-shadow-md scale-105" : "text-theme_2"}`;
    if (urlLower === ROUTES.HOME || urlLower === ROUTES.HOMEPAGE || urlLower === '/') {
      return <Home className={baseIconClass} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 2.5 : 1.5} />;
    }
    if (urlLower.includes("movie")) {
      return <Film className={baseIconClass} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 2.5 : 1.5} />;
    }
    if (urlLower.includes("show") || urlLower.includes("natak") || urlLower.includes("drama")) {
      return <Tv className={baseIconClass} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 2.5 : 1.5} />;
    }
    return <Compass className={baseIconClass} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 2.5 : 1.5} />;
  };

  const navLinks = mainNavItems.map((item) => {
    const targetUrl = item?.url === ROUTES.HOMEPAGE ? ROUTES.HOME : item?.url || "/";
    const isActive = pathname === targetUrl;

    return {
      name: item.title,
      url: targetUrl,
      icon: getIconForUrl(targetUrl, isActive),
      isActive,
      isButton: false,
      onClick: undefined as (() => void) | undefined,
    };
  });

  // Always append Search and Menu to the end
  const isSearchActive = pathname === ROUTES.SEARCH;
  navLinks.push({
    name: tNav("search") || "Search",
    url: ROUTES.SEARCH,
    icon: <Search className={`w-6 h-6 sm:w-7 sm:h-7 transition-all duration-300 ${isSearchActive ? "text-theme_1 drop-shadow-md scale-105" : "text-theme_2"}`} strokeWidth={isSearchActive ? 2.5 : 1.5} />,
    isActive: isSearchActive,
    isButton: true,
    onClick: onSearchClick,
  });

  const isProfileActive = pathname === ROUTES.PROFILE || pathname.startsWith(ROUTES.ACCOUNT_SETTINGS);
  navLinks.push({
    name: tNav("menu") || "Menu",
    url: "#",
    icon: <Menu className={`w-6 h-6 sm:w-7 sm:h-7 transition-all duration-300 ${isProfileActive ? "text-theme_1 drop-shadow-md scale-105" : "text-theme_2"}`} strokeWidth={isProfileActive ? 2.5 : 1.5} />,
    isActive: isProfileActive,
    isButton: true,
    onClick: onMenuClick,
  });

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] bg-theme_12/95 backdrop-blur-2xl border-t border-theme_1/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between h-[64px] px-1">
        {navLinks.map((link, idx) => (
          link.isButton ? (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                link.onClick?.();
              }}
              className="relative flex-1 flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-all duration-300"
            >
              {link.isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-theme_1 rounded-b-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
              {link.icon}
              <span className={`text-[10px] tracking-wide mt-0.5 transition-colors duration-300 ${link.isActive ? "text-theme_1 font-bold drop-shadow-md" : "text-theme_2 font-medium"}`}>
                {link.name}
              </span>
            </button>
          ) : (
            <Link
              key={idx}
              href={link.url}
              className="relative flex-1 flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-all duration-300"
            >
              {link.isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-theme_1 rounded-b-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
              {link.icon}
              <span className={`text-[10px] tracking-wide mt-0.5 transition-colors duration-300 ${link.isActive ? "text-theme_1 font-bold drop-shadow-md" : "text-theme_2 font-medium"}`}>
                {link.name}
              </span>
            </Link>
          )
        ))}
      </div>
    </nav>
  );
}
