"use client";

import { useEffect, useRef, useCallback } from "react";
import { setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { isTizenWebSimulator } from "@/src/platform/detectPlatform";
import { BOOT_SPLASH_CONTAINER_ID, SPLASH_DONE_EVENT } from "@/lib/boot/splash";

declare global {
  interface Window {
    __SPLASH_VIDEO_ACTIVE__?: boolean;
    __WEBOS_APP_BASE__?: string;
  }
}

const SPLASH_SESSION_KEY = "jojo_splash_video_played";
// Safety cap in case the boot script's "done" event never arrives. It must outlast
// its logo hold (lib/boot/splash.ts, up to 15s) plus the zoom.
const EMERGENCY_FALLBACK_TIMEOUT_MS = 20000;

/**
 * Owns the end of the launch splash. The splash itself is the boot curtain and
 * script (lib/boot/splash.ts), running from the first paint, before React; this
 * component waits for its zoom to finish, then removes it and moves on (Home
 * focus, or Login for signed-out users).
 */
export function SplashScreenVideo() {
  const router = useRouter();
  const bootContainerRef = useRef<HTMLElement | null>(null);
  const dismissedRef = useRef(false);

  const dismissSplash = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      if (typeof window !== "undefined") {
        window.__SPLASH_VIDEO_ACTIVE__ = false;
      }
    } catch {}

    // Check auth status
    let isAuthenticated = false;
    try {
      const tok = localStorage.getItem("ott_auth_token");
      const usr = localStorage.getItem("user");
      if (tok && usr) {
        const u = JSON.parse(usr);
        if (u && !u.isGuest && (u.id || u.user_id || u.email || u.phone || u.profiles)) {
          isAuthenticated = true;
        }
      }
    } catch {}

    bootContainerRef.current?.remove();
    const dropCurtain = () => {
      try {
        document.getElementById("early-splash-curtain-style")?.remove();
        document.documentElement.classList.remove("jojo-splash-zoom", "jojo-splash-keep", "jojo-splash-out");
      } catch {}
    };

    if (isAuthenticated) {
      // The zoom has already faded the curtain (the animated logo, app/layout.tsx);
      // hold it at nothing, then drop its style from <head>.
      try {
        document.documentElement.classList.add("jojo-splash-out");
        document.documentElement.classList.remove("jojo-splash-zoom");
        setTimeout(dropCurtain, 350);
      } catch {}
      setTimeout(() => {
        try {
          document.dispatchEvent(new CustomEvent("tv-splash-finished"));
        } catch {}

        // Restore spatial navigation focus smoothly
        let attempts = 0;
        const restoreFocus = () => {
          attempts++;
          if (doesFocusableExist("nav-link-0")) {
            setFocus("nav-link-0");
          } else if (doesFocusableExist("hero-carousel")) {
            setFocus("hero-carousel");
          } else if (attempts < 20) {
            setTimeout(restoreFocus, 50);
          }
        };
        setTimeout(restoreFocus, 60);
      }, 350);
    } else {
      // Unauthenticated user: dispatch tv-splash-finished immediately so TV Auth Gate transitions to login.
      // The curtain stays solid black (jojo-splash-keep) until Login loads, so the
      // page underneath never flashes.
      try {
        document.dispatchEvent(new CustomEvent("tv-splash-finished"));
      } catch {}

      // Fallback redirect in case the early head script was not attached
      if (typeof window !== "undefined") {
        setTimeout(() => {
          if (isTizenWebSimulator()) {
            // TVEntryContent swaps to login in the same document. Navigating
            // nested file URLs makes Samsung Web Simulator relaunch index.html.
            dropCurtain();
            return;
          }
          if (window.location.protocol === "file:") {
            // Splash exists only on the package entry document, so this
            // sibling-relative URL works with both native Location and the
            // TV build's navigation interceptor.
            window.location.replace("login/index.html");
          } else if (window.location.pathname === "/" || window.location.pathname.endsWith("/index.html")) {
            // Browser builds have the Next.js router available, so keep this
            // transition inside the current document. A hard location.replace
            // here reloads the entire app immediately after the splash.
            router.replace(ROUTES.LOGIN);
            setTimeout(dropCurtain, 300);
          }
        }, 120);
      }
    }
  }, [router]);

  useEffect(() => {
    try {
      const alreadyPlayed = sessionStorage.getItem(SPLASH_SESSION_KEY);
      if (alreadyPlayed === "1") {
        if (typeof window !== "undefined") {
          window.__SPLASH_VIDEO_ACTIVE__ = false;
        }
        try {
          document.getElementById("early-splash-curtain-style")?.remove();
        } catch {}
        return;
      }
      if (typeof window !== "undefined") {
        window.__SPLASH_VIDEO_ACTIVE__ = true;
      }

      // The global handle, not only the id: React's rebuild of <body> after a
      // hydration mismatch detaches it for a moment (the boot script re-adds it).
      const bootContainer = window.__JOJO_BOOT_SPLASH__?.container ?? document.getElementById(BOOT_SPLASH_CONTAINER_ID);
      // No boot splash (its script didn't run) or its zoom already finished.
      if (!bootContainer || window.__JOJO_SPLASH_DONE__) {
        bootContainerRef.current = bootContainer;
        dismissSplash();
        return;
      }
      bootContainerRef.current = bootContainer;
      document.addEventListener(SPLASH_DONE_EVENT, dismissSplash);
      const emergencyTimer = setTimeout(dismissSplash, EMERGENCY_FALLBACK_TIMEOUT_MS);
      return () => {
        clearTimeout(emergencyTimer);
        document.removeEventListener(SPLASH_DONE_EVENT, dismissSplash);
      };
    } catch {
      dismissSplash();
    }
  }, [dismissSplash]);

  return null;
}

export default SplashScreenVideo;
