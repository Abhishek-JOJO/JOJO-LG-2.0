"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { isTizenWebSimulator } from "@/src/platform/detectPlatform";
import {
  BOOT_SPLASH_CONTAINER_ID,
  BOOT_SPLASH_VIDEO_ID,
  SPLASH_FAILED_EVENT,
  SPLASH_POSTER_SRC,
  SPLASH_VIDEO_SRC,
} from "@/lib/boot/splash";

declare global {
  interface Window {
    __SPLASH_VIDEO_ACTIVE__?: boolean;
    __WEBOS_APP_BASE__?: string;
  }
}

const SPLASH_SESSION_KEY = "jojo_splash_video_played";
// Emergency safety cap: video is 1.9s; this 10s timeout ONLY fires if video decoder completely crashes
const EMERGENCY_FALLBACK_TIMEOUT_MS = 10000;

export function SplashScreenVideo() {
  const router = useRouter();
  // The video has exactly one owner: the hydrated client. Rendering it in the
  // static HTML lets webOS start decoding before React hydrates, then restart
  // the same media element when React takes ownership. The synchronous boot
  // curtain in layout.tsx covers Home until this single client mount is ready.
  const [shouldRender, setShouldRender] = useState(false);

  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The splash the inline boot script started at first paint (lib/boot/splash.ts).
  // When present it is adopted rather than rendered; the React-rendered splash
  // below is only the fallback for when that script didn't run.
  const bootSplashRef = useRef<{ container: HTMLElement; video: HTMLVideoElement } | null>(null);
  const dismissedRef = useRef(false);
  const playRequestedRef = useRef(false);

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

    // Clean up early boot curtain style from <head>
    try {
      document.getElementById("early-splash-curtain-style")?.remove();
    } catch {}

    // Release TV hardware video decoder pipeline
    const splashVideo = videoRef.current ?? bootSplashRef.current?.video ?? null;
    const releaseVideo = () => {
      if (!splashVideo) return;
      try {
        splashVideo.pause();
        splashVideo.removeAttribute("src");
        splashVideo.load();
      } catch {}
    };

    if (isAuthenticated) {
      // User is authenticated: fade out smoothly (350ms) to reveal Home screen
      const bootSplash = bootSplashRef.current;
      if (bootSplash) {
        bootSplash.container.style.opacity = "0";
        bootSplash.container.style.pointerEvents = "none";
      } else {
        setIsFadingOut(true);
      }
      // Released after the fade: clearing src first blanked the frame, so the
      // logo handed over through a black flash instead of fading into Home.
      setTimeout(() => {
        releaseVideo();
        if (bootSplash) bootSplash.container.remove();
        else setShouldRender(false);
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
      releaseVideo();
      // Unauthenticated user: dispatch tv-splash-finished immediately so TV Auth Gate transitions to login.
      // We keep the splash curtain solid black to prevent any flash of home page content!
      try {
        document.dispatchEvent(new CustomEvent("tv-splash-finished"));
      } catch {}

      // Fallback redirect in case the early head script was not attached
      if (typeof window !== "undefined") {
        setTimeout(() => {
          if (isTizenWebSimulator()) {
            // TVEntryContent swaps to login in the same document. Navigating
            // nested file URLs makes Samsung Web Simulator relaunch index.html.
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
          }
        }, 120);
      }
    }
  }, [router]);

  useEffect(() => {
    try {
      const alreadyPlayed = sessionStorage.getItem(SPLASH_SESSION_KEY);
      if (alreadyPlayed === "1") {
        setShouldRender(false);
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

      // Adopt the boot splash: it has been playing since first paint, and
      // has already ended (or failed) if the app took longer than the clip.
      // The global handle, not only the ids: React's rebuild of <body> after a
      // hydration mismatch detaches it for a moment (the boot script re-adds it).
      const bootVideo = window.__JOJO_BOOT_SPLASH__?.video ?? (document.getElementById(BOOT_SPLASH_VIDEO_ID) as HTMLVideoElement | null);
      const bootContainer = window.__JOJO_BOOT_SPLASH__?.container ?? document.getElementById(BOOT_SPLASH_CONTAINER_ID);
      if (bootVideo && bootContainer) {
        bootSplashRef.current = { container: bootContainer, video: bootVideo };
        if (bootVideo.ended || bootVideo.error || window.__JOJO_SPLASH_FAILED__) {
          dismissSplash();
          return;
        }
        bootVideo.addEventListener("ended", dismissSplash);
        bootVideo.addEventListener("error", dismissSplash);
        document.addEventListener(SPLASH_FAILED_EVENT, dismissSplash);
        const bootEmergencyTimer = setTimeout(dismissSplash, EMERGENCY_FALLBACK_TIMEOUT_MS);
        return () => {
          clearTimeout(bootEmergencyTimer);
          bootVideo.removeEventListener("ended", dismissSplash);
          bootVideo.removeEventListener("error", dismissSplash);
          document.removeEventListener(SPLASH_FAILED_EVENT, dismissSplash);
        };
      }

      setShouldRender(true);
    } catch {
      // If storage is unavailable, still play the splash once for this mount.
      setShouldRender(true);
    }

    // Emergency safety timeout: ONLY fires if video completely fails or stalls
    const emergencyTimer = setTimeout(() => {
      dismissSplash();
    }, EMERGENCY_FALLBACK_TIMEOUT_MS);

    return () => {
      clearTimeout(emergencyTimer);
    };
  }, [dismissSplash]);

  // Use one guarded playback trigger. Combining the autoplay attribute with an
  // imperative play() call gives old webOS media pipelines two start requests.
  useEffect(() => {
    const video = videoRef.current;
    if (!shouldRender || !video || playRequestedRef.current) return;

    playRequestedRef.current = true;
    video.play().catch(dismissSplash);
  }, [dismissSplash, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      id="jojo-splash-container"
      className={`fixed inset-0 z-[2147483647] flex items-center justify-center bg-black transition-opacity duration-350 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000000",
        zIndex: 2147483647,
      }}
    >
      <video
        ref={videoRef}
        src={SPLASH_VIDEO_SRC}
        poster={SPLASH_POSTER_SRC}
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        onEnded={dismissSplash}
        onError={dismissSplash}
        className="w-full h-full object-cover"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          backgroundColor: "#000000",
        }}
      />
    </div>
  );
}

export default SplashScreenVideo;
