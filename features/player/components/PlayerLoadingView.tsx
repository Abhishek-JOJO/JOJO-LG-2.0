"use client";

import { useEffect } from "react";

/** Player presentation while authorization and the signed stream URL load. */
export function PlayerLoadingView({ title, onBack }: { title?: string; onBack?: () => void }) {
  useEffect(() => {
    if (!onBack) return;

    const handleBack = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.keyCode !== 461) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onBack();
    };

    window.addEventListener("keydown", handleBack, true);
    return () => window.removeEventListener("keydown", handleBack, true);
  }, [onBack]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black bg-cover bg-center"
      style={{ backgroundImage: "var(--playback-startup-artwork, none)" }}
      aria-busy="true"
      aria-label="Preparing playback"
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-8 sm:px-12 lg:px-16 pt-10 sm:pt-12 lg:pt-14 pb-12"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}
      >
        {title && (
          <span className="text-theme_1 font-bold text-2xl sm:text-3xl lg:text-4xl tracking-wide truncate drop-shadow-md">
            {title}
          </span>
        )}
      </div>
    </div>
  );
}
