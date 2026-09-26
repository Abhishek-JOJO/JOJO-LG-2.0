"use client";

import { useEffect } from "react";
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

    // Production updates must be opened only after the backend reports a newer
    // required version for the appversion header sent by this installed bundle.
    // The helper above remains available for TV inspection when needed.
  }, [openUpdateModal]);
}
