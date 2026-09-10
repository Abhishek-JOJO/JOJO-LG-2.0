"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { motion } from "framer-motion";

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
    }
    
    if (direction === 'left' && index === 0) {
      setFocus('navbar-search');
      return false;
    }

    if (direction === 'right' && index === totalNavItems - 1) {
      if (!isGold) {
        setFocus('navbar-get-gold');
      } else {
        setFocus(isAuthenticated ? 'navbar-profile-trigger' : 'navbar-login');
      }
      return false;
    }
    
    return true;
  }, [index, totalNavItems, isGold, isAuthenticated]);

  const handleEnterPress = useCallback(() => {
    router.push(targetUrl);
  }, [router, targetUrl]);

  const { ref, focused } = useFocusable({
    focusKey: `nav-link-${index}`,
    onArrowPress: handleArrowPress,
    onEnterPress: handleEnterPress
  });

  useEffect(() => {
    if (isItemActive) {
      const timer = setTimeout(() => {
        setFocus(`nav-link-${index}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isItemActive, index]);

  const handleClick = useCallback(() => {
    router.push(targetUrl);
  }, [router, targetUrl]);

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

