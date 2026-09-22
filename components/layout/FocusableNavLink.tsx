"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { motion } from "framer-motion";
import { safeNavigate } from "@/lib/webos/safeNavigate";
import { useNavStore } from "@/store/useNavStore";
import { normalizePathname } from "@/lib/utils/pathname";
import { BROWSE_ROUTES } from "@/hooks/useActivePathname";

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

  const handleArrowPress = useCallback((direction: string) => {
    if (direction === 'up') {
      return false; // Prevent focus escaping off top
    }

    if (direction === 'down') {
      if (document.getElementById('hero-carousel-container')) {
        setFocus('hero-carousel');
        return false;
      }
      // Hero-less pages (e.g. account-settings) mark their topmost focusable row
      // with id="page-focus-entry" + data-focuskey so Down from the navbar lands
      // there directly instead of falling through to norigin's default
      // nearest-neighbor search, which has no reliable candidate this far below.
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
  }, [index, totalNavItems, isGold]);

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
        window.history.pushState({ browseTab: normTarget }, "", hashTarget);
      } catch (e) {}
      return;
    }

    safeNavigate(router, targetUrl);
  }, [router, targetUrl]);

  const { ref, focused } = useFocusable({
    focusKey: `nav-link-${index}`,
    onArrowPress: handleArrowPress,
    onEnterPress: navigateTab
  });

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

  return (
    <motion.div
      ref={ref as any}
      onClick={handleClick}
      animate={{ scale: focused ? 1.06 : 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className="relative cursor-pointer px-5 sm:px-6 py-2 sm:py-2.5 rounded-full z-10 flex items-center justify-center shrink-0 select-none outline-none"
    >
      {/* Clean solid sliding focus pill — no glow/bloom, matches standard OTT nav styling */}
      {focused && (
        <motion.div
          layoutId="navbarFocusPill"
          className="absolute inset-0 bg-white rounded-full z-0"
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
        />
      )}

      {/* Active state indicator pill when not focused */}
      {!focused && isItemActive && (
        <motion.div
          layoutId="navbarActivePill"
          className="absolute inset-0 bg-white/15 rounded-full border border-white/25 z-0"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <span
        className={`relative z-10 text-base sm:text-lg font-bold tracking-wide transition-colors duration-200 whitespace-nowrap ${
          focused
            ? "text-black font-extrabold"
            : isItemActive
            ? "text-white"
            : "text-white/75 hover:text-white"
        }`}
      >
        {item?.title}
      </span>
    </motion.div>
  );
});

FocusableNavLink.displayName = "FocusableNavLink";

