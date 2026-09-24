"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFocusable, setFocus, getCurrentFocusKey } from '@noriginmedia/norigin-spatial-navigation';
import { safeNavigate } from "@/lib/webos/safeNavigate";
import { useNavStore } from "@/store/useNavStore";
import { normalizePathname } from "@/lib/utils/pathname";
import { BROWSE_ROUTES } from "@/hooks/useActivePathname";
import { getQueryClient } from "@/lib/react-query/queryClient";
import { getContentRails } from "@/features/content-rail/api/getContentRails";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocaleStore } from "@/store/useLocaleStore";
import { appConfig } from "@/lib/config/app.config";
import { useTvOverlayStore } from "@/store/useTvOverlayStore";

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateTab = useCallback(() => {
    const normTarget = normalizePathname(targetUrl);
    const normCurrent = typeof window !== "undefined" ? normalizePathname(window.location.pathname) : "";
    const isTargetBrowse = BROWSE_ROUTES.includes(normTarget);
    const isCurrentBrowse = BROWSE_ROUTES.includes(normCurrent);
    const tvOverlay = useTvOverlayStore.getState();
    const isTvOverlayOpen = typeof window !== "undefined" && window.location.protocol === "file:" && !!tvOverlay.screen;

    if (isTargetBrowse && (isCurrentBrowse || isTvOverlayOpen)) {
      const navStore = useNavStore.getState();
      if (navStore.activeBrowseTab !== normTarget) {
        navStore.setActiveBrowseTab(normTarget);
      }
      if (isTvOverlayOpen) {
        tvOverlay.close();
      }
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      try {
        if (window.location.protocol !== "file:") {
          const hashTarget = normTarget === "/" ? "#/" : `#${normTarget}`;
          window.history.replaceState({ browseTab: normTarget }, "", hashTarget);
        }
      } catch (e) {}
      return;
    }

    safeNavigate(router, targetUrl);
  }, [router, targetUrl]);

  const handleArrowPress = useCallback((direction: string) => {
    if (direction === 'up') {
      return false;
    }

    if (direction === 'down') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
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

    // Direct O(1) neighbor focus to bypass Norigin full-DOM spatial geometry calculations
    if (direction === 'left') {
      if (index > 0) {
        setFocus(`nav-link-${index - 1}`);
        return false;
      }
      return false; // Stop at first tab
    }

    if (direction === 'right') {
      if (index < totalNavItems - 1) {
        setFocus(`nav-link-${index + 1}`);
        return false;
      }
      if (!isGold) {
        setFocus('navbar-get-gold');
      } else {
        setFocus('navbar-search');
      }
      return false;
    }
    
    return true;
  }, [index, totalNavItems, isGold, isItemActive, navigateTab]);

  const handleFocus = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 220ms debounce: allows rapid remote navigation across tabs without
    // freezing the TV CPU by mounting/unmounting page trees on every step
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (getCurrentFocusKey() !== `nav-link-${index}`) return;

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

      // Only auto-switch tabs on focus if the user is already on a browse route.
      const normCurrent = typeof window !== "undefined" ? normalizePathname(window.location.pathname) : "";
      const isCurrentBrowse = BROWSE_ROUTES.includes(normCurrent);
      if (!isItemActive && isCurrentBrowse) {
        navigateTab();
      }
    }, 220);
  }, [index, item?.subnav_id, isItemActive, navigateTab]);

  const handleBlur = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleEnterPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    navigateTab();
  }, [navigateTab]);

  const { ref, focused } = useFocusable({
    focusKey: `nav-link-${index}`,
    onArrowPress: handleArrowPress,
    onEnterPress: handleEnterPress,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    navigateTab();
  }, [navigateTab]);

  const handleMouseEnter = useCallback(() => {
    setFocus(`nav-link-${index}`);
  }, [index]);

  return (
    <div
      ref={ref as any}
      tabIndex={0}
      data-active={isItemActive ? "true" : "false"}
      data-focuskey={`nav-link-${index}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={`relative cursor-pointer px-5 sm:px-6 py-2 sm:py-2.5 rounded-full z-10 flex items-center justify-center shrink-0 select-none outline-none transition-[background-color,color,transform] duration-300 ease-out ${
        focused
          ? "bg-white text-black scale-105"
          : isItemActive
          ? "text-white font-bold"
          : "text-white/70 hover:text-white"
      }`}
    >
      <span
        className={`relative z-10 text-base sm:text-lg tracking-wide whitespace-nowrap transition-colors duration-300 ease-out ${
          focused
            ? "text-black font-extrabold"
            : isItemActive
            ? "text-white font-bold"
            : "text-white/70"
        }`}
      >
        {item?.title}
      </span>
    </div>
  );
});

FocusableNavLink.displayName = "FocusableNavLink";
