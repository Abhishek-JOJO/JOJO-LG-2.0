/**
 * Platform (OS) Detection Utility
 * 
 * Detects user's operating system for API headers
 * Best-effort only - browser limitation
 * DO NOT use for security decisions
 */

export type Platform = 
  | "android" 
  | "ios" 
  | "windows" 
  | "mac" 
  | "linux" 
  | "unknown";

/**
 * Detects the user's operating system
 * 
 * @returns Platform identifier for API headers
 */
export const getPlatform = (): Platform => {
  // SSR guard
  if (typeof navigator === "undefined") return "unknown";

  // Prefer modern API if available
  // @ts-ignore - userAgentData is not in all TypeScript definitions yet
  const uaData = navigator.userAgentData;
  
  if (uaData?.platform) {
    const platform = uaData.platform.toLowerCase();
    if (platform.includes("android")) return "android";
    if (platform.includes("ios")) return "ios";
    if (platform.includes("win")) return "windows";
    if (platform.includes("mac")) return "mac";
    if (platform.includes("linux")) return "linux";
  }

  // Fallback to userAgent
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux")) return "linux";

  return "unknown";
};
