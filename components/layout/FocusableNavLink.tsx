"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation';

interface FocusableNavLinkProps {
  item: any;
  isItemActive: boolean;
  targetUrl: string;
  index: number;
}

import { motion } from "framer-motion";

export const FocusableNavLink = React.memo(({ item, isItemActive, targetUrl, index }: FocusableNavLinkProps) => {
  const router = useRouter();
  
  const handleArrowPress = useCallback((direction: string) => {
    if (direction === 'up') {
      return false; // Prevent focus from escaping off the top of the screen
    }

    if (direction === 'down') {
      if (document.getElementById('hero-carousel-container')) {
        setFocus('hero-carousel');
        return false;
      }
    }
    
    // Prevent focus from dropping when pressing left on the very first nav item (e.g. "Home")
    if (direction === 'left' && index === 0) {
      return false;
    }
    
    return true;
  }, [index]);

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
      className={`relative cursor-pointer px-5 py-2 rounded-full transition-colors duration-300 z-10`}
      onClick={handleClick}
    >
      {/* Sliding Focus Pill */}
      {focused && (
        <motion.div
          layoutId="navbar-focus-pill"
          className="absolute inset-0 rounded-full bg-theme_13_samecolour/20 ring-2 ring-theme_13_samecolour shadow-[0_0_12px_rgba(255,255,255,0.4)]"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8
          }}
          style={{ zIndex: -1 }}
        />
      )}
      
      {/* Active Underline (Optional, looks premium) */}
      {isItemActive && !focused && (
        <motion.div
          layoutId="navbar-active-underline"
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-theme_13_samecolour"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <span className={`relative z-10 body-md-regular transition-colors duration-300 ${
        isItemActive || focused
          ? "text-theme_13_samecolour body-md-semibold"
          : "text-theme_1_5"
        }`}
      >
        {item?.title}
      </span>
    </div>
  );
});

FocusableNavLink.displayName = "FocusableNavLink";
