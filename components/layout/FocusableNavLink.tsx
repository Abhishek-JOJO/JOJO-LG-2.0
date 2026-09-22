"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { safeNavigate } from "@/lib/webos/safeNavigate";
import { useNavStore } from "@/store/useNavStore";
import { normalizePathname } from "@/lib/utils/pathname";
import { BROWSE_ROUTES } from "@/hooks/useActivePathname";
import { getQueryClient } from "@/lib/react-query/queryClient";
import { getContentRails } from "@/features/content-rail/api/getContentRails";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocaleStore } from "@/store/useLocaleStore";
import { appConfig } from "@/lib/config/app.config";

interface FocusableNavLinkProps {
  item: any;
  isItemActive: boolean;
  targetUrl: string;
  index: number;
  totalNavItems?: number;
  isGold?: boolean;
  isAuthenticated?: boolean;
}

export const FocusableNavLink = React.memo(({
  item,
  isItemActive,
  targetUrl,
  index,
  totalNavItems = 1,
  isGold = false,
  isAuthenticated = false
}: FocusableNavLinkProps) => {
  const router = useRouter();

  const navigateTab = useCallback(() => {
    const normTarget = normalizePathname(targetUrl);
    const normCurrent = typeof window !== "undefined" ? normalizePathname(window.location.pathname) : "";
    const isTargetBrowse = BROWSE_ROUTES.includes(normTarget);
    const isCurrentBrowse = BROWSE_ROUTES.includes(normCurrent);

    if (isTargetBrowse && isCurrentBrowse) {
      useNavStore.getState().setActiveBrowseTab(normTarget);
      window.scrollTo({ top: 0, behavior: "auto" });
      try {
        const hashTarget = normTarget === "/" ? "#/" : `#${normTarget}`;
        window.history.replaceState({ browseTab: normTarget }, "", hashTarget);
      } catch (e) {}
      return;
    }

    safeNavigate(router, targetUrl);
  }, [router, targetUrl]);

  const handleArrowPress = useCallback((direction: string) => {
    if (direction === 'up') {
      return false; // Prevent focus escaping off top
    }

    if (direction === 'down') {
      if (!isItemActive) {
        navigateTab();
      }
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

    if (direction === 'left' && index === 0) {
      return false; // Search icon is now at the end of the nav bar; stop at first item
    }

    if (direction === 'right' && index === totalNavItems - 1) {
      if (!isGold) {
        setFocus('navbar-get-gold');
      } else {
        setFocus('navbar-search');
      }
      return false;
    }
    
    return true;
  }, [index, totalNavItems, isGold, isItemActive, navigateTab]);

  const { ref, focused } = useFocusable({
    focusKey: `nav-link-${index}`,
    onArrowPress: handleArrowPress,
    onEnterPress: navigateTab
  });

  // Instant prefetch + snappy 90ms debounce:
  // Instantly kicks off background prefetching so data is loaded and ready before or upon tab switch
  useEffect(() => {
    if (focused && !isItemActive) {
      const subnavId = item?.subnav_id;
      if (subnavId) {
        const sessionId = useAuthStore.getState().token;
        const locale = useLocaleStore.getState().locale || "en";
        if (sessionId) {
          getQueryClient().prefetchInfiniteQuery({
            queryKey: ["contentRails", subnavId, sessionId, locale, 20],
            queryFn: () => getContentRails(subnavId, 1, sessionId, 20),
            initialPageParam: 1,
            staleTime: appConfig.STALE_TIME,
          }).catch(() => {});
        }
      }

      const timer = setTimeout(() => {
        navigateTab();
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [focused, isItemActive, navigateTab, item]);

  useEffect(() => {
    if (isItemActive) {
      const timer = setTimeout(() => {
        const active = typeof document !== "undefined" ? document.activeElement : null;
        const isBodyOrNull = !active || active === document.body || active.id === "root";
        if (isBodyOrNull) {
          setFocus(`nav-link-${index}`);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isItemActive, index]);

  const handleClick = useCallback(() => {
    navigateTab();
  }, [navigateTab]);

  const handleMouseEnter = useCallback(() => {
    setFocus(`nav-link-${index}`);
  }, [index]);

  return (
    <div
      ref={ref as any}
      data-active={isItemActive ? "true" : "false"}
      data-focuskey={`nav-link-${index}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={`relative cursor-pointer px-5 sm:px-6 py-2 sm:py-2.5 rounded-full z-10 flex items-center justify-center shrink-0 select-none outline-none transition-all duration-150 ease-out ${
        focused
          ? "bg-white text-black scale-105 shadow-md"
          : isItemActive
          ? "bg-white/15 border border-white/25 text-white scale-100"
          : "text-white/75 hover:text-white scale-100"
      }`}
    >
      <span
        className={`relative z-10 text-base sm:text-lg font-bold tracking-wide whitespace-nowrap ${
          focused ? "text-black font-extrabold" : isItemActive ? "text-white" : ""
        }`}
      >
        {item?.title}
      </span>
    </div>
  );
});

FocusableNavLink.displayName = "FocusableNavLink";

