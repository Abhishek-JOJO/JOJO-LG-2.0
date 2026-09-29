import type { TVPlatform } from "./types";

function configuredPlatform(): TVPlatform | null {
  const value = process.env.NEXT_PUBLIC_TV_PLATFORM;
  return value === "webos" || value === "tizen" || value === "browser" ? value : null;
}

export function detectTVPlatform(): TVPlatform {
  const configured = configuredPlatform();
  if (configured) return configured;

  if (typeof window !== "undefined") {
    if (window.tizen) return "tizen";
    if (window.PalmSystem || window.webOS) return "webos";
  }

  return "browser";
}

export function isWebOS(): boolean {
  return detectTVPlatform() === "webos";
}

export function isTizen(): boolean {
  return detectTVPlatform() === "tizen";
}

