/**
 * useVersionCheck.ts
 *
 * OTT-style version update detection — modelled after Netflix / YouTube / Disney+.
 *
 * Strategy:
 *   PRIMARY   → visibilitychange  (fires when user switches back to this tab)
 *   SECONDARY → 30-minute interval (background fallback for long-lived active tabs)
 *
 * This produces at most 1 API call per 5 minutes, triggered by real user behaviour
 * (returning to the tab), not a blind fixed-interval timer.
 *
 * Compared to the previous setInterval approach:
 *   Before : 1 call every 60 s  →  60 calls/hour while user is active
 *   After  : 1 call per tab-focus (throttled to max 1 per 5 min)  →  ~5–10 calls/hour at most
 *
 * All browser APIs (sessionStorage, document, window) are accessed only inside
 * useEffect — safe for SSR / Next.js App Router.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VersionCheckState, VersionResponse } from "@/lib/version/version.types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Prevent reload loops: key written to sessionStorage before reload. */
const RELOAD_GUARD_KEY = "jojo_version_reloaded";

/** Throttle key: stores the timestamp of the last version check. */
const LAST_CHECK_KEY = "jojo_version_last_check_ts";

/**
 * Minimum time that must have elapsed since the last check before we fire
 * another one on a visibility change.
 * Default: 5 minutes — prevents hammering the endpoint when users alt-tab rapidly.
 */
const MIN_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 min

/**
 * Long-interval background fallback for tabs that stay in the foreground for
 * extended periods (e.g. a user watching a stream on a full tab for 2 hours).
 * Default: 30 minutes.
 *
 * Configurable via NEXT_PUBLIC_VERSION_POLL_INTERVAL_MS — but this should always
 * be a large value (≥ 5 min) in production; it is the background fallback only.
 */
const BACKGROUND_INTERVAL_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_VERSION_POLL_INTERVAL_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  // Minimum 5 minutes; default 30 minutes.
  return !isNaN(parsed) && parsed >= MIN_CHECK_INTERVAL_MS ? parsed : 30 * 60 * 1000;
})();

/** How long (seconds) the countdown runs before auto-reload. */
const COUNTDOWN_SECONDS = 10;

/** Version baked into this bundle at build time. */
const BUNDLE_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useVersionCheck
 *
 * Checks for a new deployment:
 *   • When the user returns to this browser tab (visibilitychange → visible)
 *   • As a 30-min background safety net (for always-foreground tabs)
 *
 * When a version mismatch is found, starts a 10-second countdown then reloads.
 * A sessionStorage flag prevents reload loops.
 */
export function useVersionCheck(): VersionCheckState {
  const [state, setState] = useState<VersionCheckState>({
    updateAvailable: false,
    currentVersion: BUNDLE_VERSION,
    latestVersion: null,
    countdown: null,
  });

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backgroundRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadScheduled = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Read the timestamp of the last successful check from sessionStorage. */
  const getLastCheckTs = useCallback((): number => {
    try {
      return parseInt(sessionStorage.getItem(LAST_CHECK_KEY) || "0", 10);
    } catch {
      return 0;
    }
  }, []);

  /** Persist the current timestamp as the last check time. */
  const setLastCheckTs = useCallback(() => {
    try {
      sessionStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    } catch {
      // sessionStorage unavailable — silently continue.
    }
  }, []);

  // ── Reload with loop-guard ────────────────────────────────────────────────

  const scheduleReload = useCallback(() => {
    if (reloadScheduled.current) return;
    reloadScheduled.current = true;

    // Clear background interval — no more checks needed.
    if (backgroundRef.current) {
      clearInterval(backgroundRef.current);
      backgroundRef.current = null;
    }

    // Write guard so the fresh page load skips the first check.
    try {
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
    } catch {
      // Ignore.
    }

    let remaining = COUNTDOWN_SECONDS;
    setState((prev) => ({ ...prev, countdown: remaining }));

    countdownRef.current = setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        window.location.reload();
        return;
      }

      setState((prev) => ({ ...prev, countdown: remaining }));
    }, 1_000);
  }, []);

  // ── Version fetch ─────────────────────────────────────────────────────────

  const checkVersion = useCallback(async () => {
    if (reloadScheduled.current) return;

    // ── Visibility guard ───────────────────────────────────────────────────
    // Only run when the tab is actively in the foreground.
    // This makes the 30-min background interval a no-op for forgotten tabs
    // (phone locked, different app, minimised browser, etc.).
    // The visibilitychange listener handles the "user returns" case instead.
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

    // Throttle: skip if we checked too recently.
    const elapsed = Date.now() - getLastCheckTs();
    if (elapsed < MIN_CHECK_INTERVAL_MS) return;

    // Record the time of this check immediately (prevents concurrent calls).
    setLastCheckTs();

    try {
      const res = await fetch("/api/version", {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) return;

      const data: VersionResponse = await res.json();
      const serverVersion = data.version;

      // If no version is configured at all, skip (avoids false positives in dev
      // when NEXT_PUBLIC_APP_VERSION is not set).
      if (!BUNDLE_VERSION || !serverVersion || serverVersion === "unknown-build") return;

      if (serverVersion !== BUNDLE_VERSION) {
        setState((prev) => ({
          ...prev,
          updateAvailable: true,
          latestVersion: serverVersion,
        }));
        scheduleReload();
      }
    } catch {
      // Network error / abort — silently skip, try again on next visibility change.
    }
  }, [getLastCheckTs, setLastCheckTs, scheduleReload]);

  // ── Mount / unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    // ── Loop-guard: skip the first check after a version-triggered reload ──
    try {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
        return; // Do NOT attach any listeners — let the new bundle settle.
      }
    } catch {
      // Ignore.
    }

    // ── Primary trigger: visibilitychange ──────────────────────────────────
    // Fires when the user switches back to this tab from another tab/app.
    // This is the same mechanism Netflix and YouTube use.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ── Secondary trigger: background interval ─────────────────────────────
    // Safety net for tabs that stay in the foreground for a very long time
    // (e.g. a user watching a stream). Fires at most once per 30 minutes.
    backgroundRef.current = setInterval(checkVersion, BACKGROUND_INTERVAL_MS);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (backgroundRef.current) {
        clearInterval(backgroundRef.current);
        backgroundRef.current = null;
      }

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []); // Intentionally empty — runs exactly once per mount.

  return state;
}
