"use client";

import { useEffect } from "react";

// Track scroll locks globally (to support multiple nested overlays correctly)
let lockCount = 0;
let savedScrollY = 0;
let savedBodyStyles = {
  position: "",
  top: "",
  width: "",
  overflow: "",
  paddingRight: "",
};

/**
 * Hook to lock body scroll on mount and unlock on unmount.
 * Supports nesting: if multiple components lock the scroll, body styles are only
 * applied on the first lock and restored when the last component unlocks.
 * Handles Safari / iOS touch-scrolling bleed and layout shifting on desktops.
 * 
 * @param lock Whether the scroll lock is active.
 */
export function useBodyScrollLock(lock: boolean) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (!lock) return;

    if (lockCount === 0) {
      // Calculate scrollbar width to prevent visual layout shifting when hidden
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const scrollY = window.scrollY;
      savedScrollY = scrollY;

      // Capture original body style values
      savedBodyStyles = {
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };

      // Set fixed positioning to completely lock scroll on iOS / Safari & Desktops
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        // Restore original body styles
        document.body.style.position = savedBodyStyles.position;
        document.body.style.top = savedBodyStyles.top;
        document.body.style.width = savedBodyStyles.width;
        document.body.style.overflow = savedBodyStyles.overflow;
        document.body.style.paddingRight = savedBodyStyles.paddingRight;

        // Restore exact scroll position
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [lock]);
}
