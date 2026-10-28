"use client";

import { useEffect, useState } from "react";
import { useAmbientTintStore } from "@/store/useAmbientTintStore";
import { isTizen } from "@/src/platform/detectPlatform";

export function AmbientBackground() {
  const [mounted, setMounted] = useState(false);
  const layerA = useAmbientTintStore((s) => s.layerA);
  const layerB = useAmbientTintStore((s) => s.layerB);
  const activeLayer = useAmbientTintStore((s) => s.activeLayer);
  const hasActiveColor = useAmbientTintStore((s) => s.hasActiveColor);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getGradient = (rgb: { r: number; g: number; b: number }) =>
    `linear-gradient(180deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.88) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.80) 15%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.60) 40%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.30) 65%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08) 85%, transparent 100%)`;

  if (!mounted) {
    return null;
  }

  // No will-change on Tizen: it kept both full-viewport layers allocated as
  // GPU surfaces at all times, even at opacity 0. Without it they're only
  // promoted while their crossfade actually runs.
  const isTizenRuntime = isTizen();

  return (
    <div
      aria-hidden="true"
      // Tizen: a playing AVPlay preview cuts a hole through this layer (it
      // sits behind the hero) — see tizenPreviewPlayer.
      data-tizen-video-backdrop
      className={`absolute top-0 left-0 right-0 h-[100vh] w-full pointer-events-none z-0 overflow-hidden transition-opacity duration-1000 ease-out ${
        hasActiveColor ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Ambient Layer A */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out"
        style={{
          opacity: activeLayer === "A" && hasActiveColor ? 1 : 0,
          background: getGradient(layerA),
          willChange: isTizenRuntime ? undefined : "opacity",
        }}
      />

      {/* Ambient Layer B */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out"
        style={{
          opacity: activeLayer === "B" && hasActiveColor ? 1 : 0,
          background: getGradient(layerB),
          willChange: isTizenRuntime ? undefined : "opacity",
        }}
      />
    </div>
  );
}
