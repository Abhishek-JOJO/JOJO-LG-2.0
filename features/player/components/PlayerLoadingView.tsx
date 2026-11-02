"use client";

import { useEffect } from "react";
import { isBackEvent } from "@/src/platform";
import { LoadingScreen } from "./LoadingScreen";

/**
 * Player presentation while authorization and the signed stream URL load.
 * Same black screen and spinner as the player's own LoadingScreen, which
 * takes over until the first frame: one loading state, straight into video
 * (it used to show the title's poster first, then black, then video).
 */
export function PlayerLoadingView({ onBack }: { onBack?: () => void }) {
  useEffect(() => {
    if (!onBack) return;

    const handleBack = (event: KeyboardEvent) => {
      if (!isBackEvent(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onBack();
    };

    window.addEventListener("keydown", handleBack, true);
    return () => window.removeEventListener("keydown", handleBack, true);
  }, [onBack]);

  return (
    <div className="fixed inset-0 z-[1000] w-screen h-screen bg-black" aria-busy="true">
      <LoadingScreen />
    </div>
  );
}
