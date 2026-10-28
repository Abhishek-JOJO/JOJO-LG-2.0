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

  // Tizen skips hero colour sampling (ContentRailList), so the tint is never
  // set there. Without this guard the two will-change layers below stay
  // allocated as full-viewport GPU surfaces at opacity 0 for the whole session.
  const isTizenRuntime = isTizen();
  if (isTizenRuntime && !hasActiveColor) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
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
