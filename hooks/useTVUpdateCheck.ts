"use client";

import { useEffect, useCallback } from "react";
import { useAppUpdateStore } from "@/store/useAppUpdateStore";
import { APP_VERSION } from "@/lib/constants/version";
import { getCachedRuntimeConfig, AppConfig, DevicesConfig } from "@/lib/config/app.config";
import { logger } from "@/lib/logger/logger";

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

export interface AppUpdateCheckResult {
  hasUpdate: boolean;
  isForceUpdate: boolean;
  latestVersion: string;
  minRequiredVersion?: string;
  updateUrl?: string;
  title?: string;
  message?: string;
}

/**
 * Evaluates device configuration according to the mobile/TV standard:
 *
 * AppConfig.appConfigData?.devices?.let {
 *     if (it.platform.appVersion.isUpdateAvailable) {
 *         if (it.platform.appVersion.isForceUpdateAvailable) {
 *             showForceUpdateDialog.value = true
 *         } else {
 *             showOptionalUpdateDialog.value = true
 *         }
 *     } else {
 *         navigateNext(navController, route)
 *     }
 * }
 */
export function evaluateAppUpdate(devices?: DevicesConfig | null): AppUpdateCheckResult {
  if (!devices) {
    return { hasUpdate: false, isForceUpdate: false, latestVersion: "" };
  }

  // Support both devices.platform.appVersion and devices.appVersion
  const platform = devices.platform || (devices as any);
  const appVersion = platform?.appVersion;

  if (!appVersion) {
    return { hasUpdate: false, isForceUpdate: false, latestVersion: "" };
  }

  const latest = (appVersion.latest || "").trim();
  const minimum = (appVersion.minimum || "").trim();
  const updateUrl = (appVersion.updateUrl || "").trim();

  // Primary check: backend boolean flags
  const isUpdateAvailable = Boolean(appVersion.isUpdateAvailable);
  const isForceUpdateAvailable = Boolean(
    appVersion.isForceUpdateAvailable ?? appVersion.forceUpdate
  );

  // Safety fallback: semantic version comparison against compiled client APP_VERSION
  const hasSemverUpdate = latest ? compareVersions(latest, APP_VERSION) > 0 : false;
  const hasSemverForce = minimum ? compareVersions(minimum, APP_VERSION) > 0 : false;

  const hasUpdate = isUpdateAvailable || hasSemverUpdate;
  const isForceUpdate = hasUpdate && (isForceUpdateAvailable || hasSemverForce);

  return {
    hasUpdate,
    isForceUpdate,
    latestVersion: latest || (hasUpdate ? APP_VERSION : ""),
    minRequiredVersion: minimum,
    updateUrl,
    title: appVersion.title,
    message: appVersion.message,
  };
}

export function useTVUpdateCheck() {
  const openUpdateModal = useAppUpdateStore((s) => s.openUpdateModal);

  const checkAndUpdate = useCallback((devices?: DevicesConfig | null) => {
    // Check runtime devices from parameter, AppConfig accessor, or cached runtime config
    const devicesConfig = devices || AppConfig.devices || getCachedRuntimeConfig()?.devices;
    if (!devicesConfig) return;

    const result = evaluateAppUpdate(devicesConfig);
    if (!result.hasUpdate) {
      logger.info("[AppUpdate] No update available. Current app version is up to date:", APP_VERSION);
      return;
    }

    // Optional / soft update: if user previously tapped 'Later' this session, do not interrupt
    if (!result.isForceUpdate) {
      try {
        if (sessionStorage.getItem("jojo_dismissed_soft_update") === "true") {
          logger.info("[AppUpdate] Soft update available but already dismissed for this session");
          return;
        }
      } catch {}
    }

    logger.info("[AppUpdate] Triggering update dialog", {
      isForceUpdate: result.isForceUpdate,
      latestVersion: result.latestVersion,
      minRequiredVersion: result.minRequiredVersion,
      updateUrl: result.updateUrl,
    });

    openUpdateModal({
      latestVersion: result.latestVersion,
      minRequiredVersion: result.minRequiredVersion,
      forceUpdate: result.isForceUpdate,
      updateUrl: result.updateUrl,
      title:
        result.title ||
        (result.isForceUpdate
          ? "Update Required"
          : result.latestVersion
            ? `Update Available (v${result.latestVersion})`
            : "Update Available"),
      message:
        result.message ||
        (result.isForceUpdate
          ? "A mandatory update is required to continue enjoying JOJO. Please update the app from the LG Content Store."
          : "A new version of JOJO is available on the LG Content Store. Update now for better performance, faster loading, and new features."),
      releaseNotes: [
        "Smoother video playback & audio enhancement",
        "Improved TV remote navigation speed",
        "Enhanced security and stability fixes",
      ],
    });
  }, [openUpdateModal]);

  useEffect(() => {
    // 1. If cold-start splash video is playing, defer update modal until splash finishes
    const runCheckWhenReady = () => {
      const isSplashActive =
        typeof window !== "undefined" &&
        ((window as any).__SPLASH_VIDEO_ACTIVE__ ||
          sessionStorage.getItem("jojo_splash_video_played") !== "1");

      if (isSplashActive) {
        const handleSplashFinished = () => {
          document.removeEventListener("tv-splash-finished", handleSplashFinished);
          setTimeout(() => {
            checkAndUpdate();
          }, 350);
        };
        document.addEventListener("tv-splash-finished", handleSplashFinished);
        return;
      }

      checkAndUpdate();
    };

    // Run initial check
    runCheckWhenReady();

    // 2. Listen for runtime config ready event (dispatched once fetchConfig completes)
    const handleConfigReady = (e: any) => {
      const config = e.detail;
      checkAndUpdate(config?.devices);
    };

    window.addEventListener("app-config-ready", handleConfigReady);

    // 3. Expose debug helper on window for TV inspection & QA testing
    if (typeof window !== "undefined") {
      (window as any).__testUpdatePopup = (force = false, newVersion = "1.0.1") => {
        openUpdateModal({
          latestVersion: newVersion,
          forceUpdate: force,
          title: force ? "Update Required" : "Update Available",
          message: force
            ? "A mandatory update is required to continue enjoying JOJO. Please update the app from the LG Content Store."
            : "A new version of JOJO is available on the LG Content Store. Update now for better performance, faster loading, and new features.",
          releaseNotes: [
            "Smoother video playback & audio enhancement",
            "Improved TV remote navigation speed",
            "Enhanced security and stability fixes",
          ],
        });
      };

      (window as any).__triggerTVUpdateCheck = (mockDevices?: DevicesConfig) => {
        if (mockDevices) {
          checkAndUpdate(mockDevices);
        } else {
          checkAndUpdate();
        }
      };
    }

    return () => {
      window.removeEventListener("app-config-ready", handleConfigReady);
    };
  }, [checkAndUpdate, openUpdateModal]);
}
