"use client";

import { useEffect, useRef } from "react";
import { useAppUpdateStore } from "@/store/useAppUpdateStore";
import { APP_VERSION } from "@/lib/constants/version";

/**
 * Compares two semantic version strings (e.g. "1.0.1" > "1.0.0")
 * Returns:
 *   1 if a > b
 *  -1 if a < b
 *   0 if a === b
 */
export function compareVersions(a: string, b: string): number {
  const cleanA = a.replace(/^[vV]/, "").split(".").map((x) => parseInt(x, 10) || 0);
  const cleanB = b.replace(/^[vV]/, "").split(".").map((x) => parseInt(x, 10) || 0);

  const maxLen = Math.max(cleanA.length, cleanB.length);
  for (let i = 0; i < maxLen; i++) {
    const valA = cleanA[i] || 0;
    const valB = cleanB[i] || 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
}

export function useTVUpdateCheck() {
  const openUpdateModal = useAppUpdateStore((s) => s.openUpdateModal);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Expose test helper on window for debugging & inspection on TV
    if (typeof window !== "undefined") {
      (window as any).__testUpdatePopup = (force = false, newVersion = "1.0.1") => {
        openUpdateModal({
          latestVersion: newVersion,
          forceUpdate: force,
          title: "New Update Available!",
          message: "A new version of JOJO is available on the LG Content Store. Update now for better performance, faster loading, and new features.",
          releaseNotes: [
            "Smoother video playback & audio enhancement",
            "Improved TV remote navigation speed",
            "Enhanced security and stability fixes",
          ],
        });
      };
    }

    if (checkedRef.current) return;
    checkedRef.current = true;

    // Small delay so it runs after splash screen finishes and home mounts
    const timer = setTimeout(async () => {
      try {
        const appBase = (typeof window !== "undefined" && (window as any).__WEBOS_APP_BASE__) || "";
        const versionUrl = appBase ? `${appBase}version.json` : "/version.json";

        const res = await fetch(versionUrl, { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        const remoteVersion = (data.version || "").replace(/^[vV]/, "");

        if (remoteVersion && compareVersions(remoteVersion, APP_VERSION) > 0) {
          console.log(`[TV-UPDATE] Update available: local=${APP_VERSION}, remote=${remoteVersion}`);
          openUpdateModal({
            latestVersion: remoteVersion,
            forceUpdate: data.forceUpdate || false,
            title: data.title || "New Update Available!",
            message: data.message || "A new version of JOJO is ready on the LG Content Store. Update now for the best TV experience.",
            releaseNotes: data.releaseNotes || [
              "Performance optimizations for LG webOS TV",
              "Bug fixes and UI improvements",
            ],
          });
        }
      } catch (err) {
        // Silently catch in case of offline or local file protocol fetch restriction
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [openUpdateModal]);
}
