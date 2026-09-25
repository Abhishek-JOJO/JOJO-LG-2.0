"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";

const SPLASH_SESSION_KEY = "jojo_splash_video_played";
// Emergency safety cap: video is 3.6s; this 10s timeout ONLY fires if video decoder completely crashes
const EMERGENCY_FALLBACK_TIMEOUT_MS = 10000;

export function SplashScreenVideo() {
  // Initialize to true during static export / cold start so pre-rendered HTML
  // covers the screen with the splash curtain, preventing any skeleton/screen flash
  const [shouldRender, setShouldRender] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem(SPLASH_SESSION_KEY) !== "1";
      } catch {
        return true;
      }
    }
    return true;
  });

  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dismissedRef = useRef(false);

  // Determine correct video source (handles webOS file:// relative path and standard web path)
  const getVideoSrc = useCallback(() => {
    if (typeof window !== "undefined" && (window as any).__WEBOS_APP_BASE__) {
      return `${(window as any).__WEBOS_APP_BASE__}video/APP_INTRO.mp4`;
    }
    return "/video/APP_INTRO.mp4";
  }, []);

  const dismissSplash = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      if (typeof window !== "undefined") {
        (window as any).__SPLASH_VIDEO_ACTIVE__ = false;
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
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      } catch {}
    }

    if (isAuthenticated) {
      // User is authenticated: fade out smoothly (350ms) to reveal Home screen
      setIsFadingOut(true);
      setTimeout(() => {
        setShouldRender(false);
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
      // We keep the splash curtain solid black to prevent any flash of home page content!
      try {
        document.dispatchEvent(new CustomEvent("tv-splash-finished"));
      } catch {}

      // Fallback redirect in case the early head script was not attached
      if (typeof window !== "undefined") {
        setTimeout(() => {
          const appBase = (window as any).__WEBOS_APP_BASE__ || "";
          if (window.location.protocol === "file:") {
            window.location.replace(appBase ? `${appBase}login/index.html` : "login/index.html");
          } else if (window.location.pathname === "/" || window.location.pathname.endsWith("/index.html")) {
            window.location.replace("/login");
          }
        }, 120);
      }
    }
  }, []);

  useEffect(() => {
    try {
      const alreadyPlayed = sessionStorage.getItem(SPLASH_SESSION_KEY);
      if (alreadyPlayed === "1") {
        setShouldRender(false);
        try {
          document.getElementById("early-splash-curtain-style")?.remove();
        } catch {}
        return;
      }
      if (typeof window !== "undefined") {
        (window as any).__SPLASH_VIDEO_ACTIVE__ = true;
      }
    } catch {
      // ignore
    }

    // Emergency safety timeout: ONLY fires if video completely fails or stalls
    const emergencyTimer = setTimeout(() => {
      dismissSplash();
    }, EMERGENCY_FALLBACK_TIMEOUT_MS);

    // Explicitly call play() on TV to ensure smooth playback
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    return () => {
      clearTimeout(emergencyTimer);
    };
  }, [dismissSplash]);

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
        src={getVideoSrc()}
        autoPlay
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

