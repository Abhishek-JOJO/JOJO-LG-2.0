"use client";

import { useEffect, useState } from "react";
import { SplashScreenVideo } from "@/components/common/SplashScreenVideo";
import LoginPage from "@/app/login/sub-login-page";
import ParentPage from "@/app/parent-page";
import { isTizenWebSimulator } from "@/src/platform/detectPlatform";
import { useLayoutChrome } from "@/components/layout/LayoutClientWrapper";

const SPLASH_SESSION_KEY = "jojo_splash_video_played";

function hasAuthenticatedUser(): boolean {
  try {
    const token = localStorage.getItem("ott_auth_token");
    const rawUser = localStorage.getItem("user");
    if (!token || !rawUser) return false;
    const user = JSON.parse(rawUser);
    return Boolean(
      user &&
        !user.isGuest &&
        (user.id || user.user_id || user.email || user.phone || user.profiles),
    );
  } catch {
    return false;
  }
}

/**
 * The Samsung Web Simulator gives file navigations opaque origins and may
 * relaunch config.xml's entry document when moving to a nested HTML file.
 * Keep its unauthenticated entry transition in-document so the splash cannot
 * restart forever. Packaged LG and physical Tizen devices retain their normal
 * route navigation.
 */
export function TVEntryContent() {
  const [showSimulatorLogin, setShowSimulatorLogin] = useState(false);
  const { setInlineStandalonePage } = useLayoutChrome();

  useEffect(() => {
    if (!isTizenWebSimulator() || hasAuthenticatedUser()) return;

    const showLogin = () => {
      setInlineStandalonePage(true);
      setShowSimulatorLogin(true);
    };
    try {
      if (sessionStorage.getItem(SPLASH_SESSION_KEY) === "1") {
        showLogin();
      }
    } catch {}

    document.addEventListener("tv-splash-finished", showLogin);
    return () => {
      document.removeEventListener("tv-splash-finished", showLogin);
      setInlineStandalonePage(false);
    };
  }, [setInlineStandalonePage]);

  if (showSimulatorLogin) return <LoginPage />;

  return (
    <>
      <SplashScreenVideo />
      <ParentPage />
    </>
  );
}

export default TVEntryContent;
