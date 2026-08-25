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
    <div
      ref={ref}
      className={`relative cursor-pointer px-5 sm:px-6 py-2 sm:py-2.5 rounded-full transition-all duration-200 z-10 flex items-center justify-center shrink-0 ${
        focused
          ? "bg-white text-black font-bold scale-105 shadow-[0_0_18px_rgba(255,255,255,0.7)] ring-2 ring-white"
          : isItemActive
          ? "bg-white text-black font-bold shadow-md"
          : "text-white/80 hover:text-white font-semibold hover:bg-white/10"
      }`}
      onClick={handleClick}
    >
      <span className="text-base sm:text-lg whitespace-nowrap tracking-wide">
        {item?.title}
      </span>
    </div>
  );
});

FocusableNavLink.displayName = "FocusableNavLink";

