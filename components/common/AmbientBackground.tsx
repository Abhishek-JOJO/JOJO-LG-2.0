"use client";

import { useAmbientTintStore } from "@/store/useAmbientTintStore";

export function AmbientBackground() {
  const layerA = useAmbientTintStore((s) => s.layerA);
  const layerB = useAmbientTintStore((s) => s.layerB);
  const activeLayer = useAmbientTintStore((s) => s.activeLayer);

  const getGradient = (rgb: { r: number; g: number; b: number }) =>
    `linear-gradient(180deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95) 25%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85) 50%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.65) 75%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35) 90%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) 98%, transparent 100%)`;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-[100vh] pointer-events-none z-0 overflow-hidden"
    >
      {/* Ambient Layer A */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out"
        style={{
          opacity: activeLayer === "A" ? 1 : 0,
          background: getGradient(layerA),
          willChange: "opacity",
        }}
      />

      {/* Ambient Layer B */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out"
        style={{
          opacity: activeLayer === "B" ? 1 : 0,
          background: getGradient(layerB),
          willChange: "opacity",
        }}
      />
    </div>
  );
}
