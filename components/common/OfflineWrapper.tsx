"use client";

import { ReactNode, useEffect, useState } from "react";
import { useOnlineStatus } from "@hooks/useOnlineStatus";
import { NoInternet } from "./NoInternet";
import { useToastStore } from "@store/useToastStore";
import { stopTizenPreview } from "@/src/platform/tizen/tizenPreviewPlayer";

export function OfflineWrapper({ children }: { children:ReactNode }) {
  const isOnline = useOnlineStatus();
  const [mounted, setMounted] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const { show } = useToastStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // If we were offline and now we're online, show success toast
      if (wasOffline && isOnline) {
        show("We're back! Connection restored.", "success");
        setWasOffline(false);
      }
      // Track when we go offline
      else if (!isOnline) {
        setWasOffline(true);
      }
    }
  }, [isOnline, mounted, wasOffline, show]);

  // The app stays mounted under the offline screen (see below), so while
  // offline the remote must not drive the hidden UI, and an inline Tizen
  // preview stops — it would keep playing its buffer, with sound, behind
  // this screen. The movie player pauses itself (PlayerEngine).
  useEffect(() => {
    if (!mounted || isOnline) return;
    stopTizenPreview();
    const blockKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", blockKey, true);
    window.addEventListener("keyup", blockKey, true);
    return () => {
      window.removeEventListener("keydown", blockKey, true);
      window.removeEventListener("keyup", blockKey, true);
    };
  }, [mounted, isOnline]);

  // Prevent hydration mismatch by not rendering offline check until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  // Shown over the app rather than instead of it: replacing it unmounted
  // everything on screen, so a movie lost its place and the home page, an
  // open asset detail and focus all restarted once the network returned.
  return (
    <>
      {children}
      {!isOnline && (
        <div className="fixed inset-0 z-[2147483000]">
          <NoInternet />
        </div>
      )}
    </>
  );
}
