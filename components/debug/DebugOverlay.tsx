"use client";

/**
 * All-In-One TV Diagnostic, Focus Latency & Memory Clean-up Debugger
 *
 * Designed specifically for LG webOS TV live inspection:
 * - Focus Latency Profiler: Measures time in ms between remote keypress and focus shift.
 * - Live Memory & Leak Detector: Tracks JS Heap usage, DOM nodes, and memory trends.
 * - One-Touch Memory Cleanup: Cleans stale cache/buffers and recovers TV RAM.
 * - Media & Video Player Health: Tracks dropped frames, buffer length, resolution, and subtitles.
 * - DevTools Inspection API: Exposes `window.__TV_DEBUGGER__` for direct control via `ares-inspect`.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentFocusKey } from "@noriginmedia/norigin-spatial-navigation";
import { useActivePathname } from "@/hooks/useActivePathname";
import { useQueryClient } from "@tanstack/react-query";

const MAX_LOG = 10;
const STORAGE_KEY = "jojo_debug_overlay";

interface KeyLogEntry {
  t: number;
  keyCode: number;
  key: string;
  repeat: boolean;
}

interface FocusTransition {
  t: number;
  fromKey: string;
  toKey: string;
  durationMs: number;
}

interface Stats {
  fps: number;
  heapUsedMB: number | null;
  heapTotalMB: number | null;
  heapLimitMB: number | null;
  initialHeapMB: number | null;
  peakHeapMB: number | null;
  domNodes: number;
  focusableNodes: number;
  imageNodes: number;
  videoNodes: number;
  currentFocusKey: string;
  avgFocusTimeMs: number;
  lastFocusDurationMs: number;
  droppedFrames: number;
  videoState: string;
  videoResolution: string;
  networkOnline: boolean;
}

const EMPTY_STATS: Stats = {
  fps: 0,
  heapUsedMB: null,
  heapTotalMB: null,
  heapLimitMB: null,
  initialHeapMB: null,
  peakHeapMB: null,
  domNodes: 0,
  focusableNodes: 0,
  imageNodes: 0,
  videoNodes: 0,
  currentFocusKey: "",
  avgFocusTimeMs: 0,
  lastFocusDurationMs: 0,
  droppedFrames: 0,
  videoState: "None",
  videoResolution: "N/A",
  networkOnline: true,
};

function readInitialEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "1") return true;
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function formatTime(t: number): string {
  const d = new Date(t);
  return `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${Math.floor(d.getMilliseconds() / 100)}`;
}

export function DebugOverlay() {
  const pathname = useActivePathname();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  const [keyLog, setKeyLog] = useState<KeyLogEntry[]>([]);
  const [focusTransitions, setFocusTransitions] = useState<FocusTransition[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const lastNavKeyDownTime = useRef<number>(0);
  const lastFocusKeyRef = useRef<string>("");
  const focusDurations = useRef<number[]>([]);
  const initialHeapRef = useRef<number | null>(null);
  const peakHeapRef = useRef<number>(0);

  // Raw console fallback that works even when standard console is muted by security guard
  const getRawConsole = useCallback(() => {
    return (window as any).__rawConsole || console;
  }, []);

  // Comprehensive Memory Cleanup function
  const runMemoryCleanup = useCallback(() => {
    const rawConsole = getRawConsole();
    const beforeMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    const beforeMB = beforeMem ? Math.round(beforeMem / 1048576) : null;

    try {
      // 1. Evict stale React Query cache
      queryClient.clear();

      // 2. Clear unmounted image element src references to encourage garbage collection
      const images = document.querySelectorAll("img");
      let clearedImages = 0;
      images.forEach((img) => {
        if (!img.isConnected || img.naturalWidth === 0) {
          try {
            img.src = "";
            clearedImages++;
          } catch {}
        }
      });

      // 3. Dispatch global memory cleanup event for audio/player listeners
      document.dispatchEvent(new CustomEvent("tv-memory-cleanup"));

      // 4. Trigger V8 garbage collection if enabled in Chromium runtime
      if (typeof (window as any).gc === "function") {
        (window as any).gc();
      }

      // Check memory delta after brief timeout
      setTimeout(() => {
        const afterMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
        const afterMB = afterMem ? Math.round(afterMem / 1048576) : null;
        let diffStr = "";
        if (beforeMB !== null && afterMB !== null) {
          const diff = beforeMB - afterMB;
          diffStr = diff > 0 ? ` (Recovered ${diff} MB)` : ` (Current: ${afterMB} MB)`;
        }
        const msg = `Memory cleaned: Query cache purged${clearedImages > 0 ? `, ${clearedImages} dead imgs cleared` : ""}${diffStr}`;
        setCleanupMessage(msg);
        rawConsole.log(`[TV-DEBUGGER] ${msg}`);
        setTimeout(() => setCleanupMessage(null), 4000);
      }, 300);
    } catch (err) {
      rawConsole.error("[TV-DEBUGGER] Memory cleanup error:", err);
      setCleanupMessage("Cleanup error, check console");
      setTimeout(() => setCleanupMessage(null), 3000);
    }
  }, [queryClient, getRawConsole]);

  // Read initial enabled state
  useEffect(() => {
    setVisible(readInitialEnabled());
  }, []);

  useEffect(() => {
    visibleRef.current = visible;
    try {
      localStorage.setItem(STORAGE_KEY, visible ? "1" : "0");
    } catch {}
  }, [visible]);

  // Remote key toggles (INFO, BLUE, GREEN) and DevTools triggers
  useEffect(() => {
    const toggle = (e?: any) => {
      if (e?.detail?.force !== undefined) {
        setVisible(Boolean(e.detail.force));
      } else {
        setVisible((v) => !v);
      }
    };
    document.addEventListener("tv-debug-toggle", toggle);
    return () => document.removeEventListener("tv-debug-toggle", toggle);
  }, []);

  // Expose Global DevTools API on window.__TV_DEBUGGER__
  useEffect(() => {
    const rawConsole = getRawConsole();

    (window as any).__TV_DEBUGGER__ = {
      toggleOverlay: (force?: boolean) => {
        document.dispatchEvent(new CustomEvent("tv-debug-toggle", { detail: { force } }));
      },
      runMemoryCleanup,
      enableConsole: () => {
        if (typeof (window as any).__restoreConsole === "function") {
          (window as any).__restoreConsole();
        }
      },
      getReport: () => {
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        const video = document.querySelector("video");
        const currentFocus = getCurrentFocusKey() || "(none)";

        const report = {
          pathname,
          focus: {
            currentFocusKey: currentFocus,
            lastFocusTimeMs: focusDurations.current[focusDurations.current.length - 1] || 0,
            avgFocusTimeMs: focusDurations.current.length
              ? Math.round(focusDurations.current.reduce((a, b) => a + b, 0) / focusDurations.current.length)
              : 0,
          },
          memory: {
            heapUsedMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : "n/a",
            heapTotalMB: mem ? Math.round(mem.totalJSHeapSize / 1048576) : "n/a",
            heapLimitMB: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : "n/a",
            peakHeapMB: peakHeapRef.current || "n/a",
          },
          dom: {
            totalNodes: document.querySelectorAll("*").length,
            focusableNodes: document.querySelectorAll("[data-focuskey]").length,
            imageNodes: document.querySelectorAll("img").length,
            videoNodes: document.querySelectorAll("video").length,
          },
          player: video
            ? {
                state: video.paused ? (video.ended ? "Ended" : "Paused") : "Playing",
                resolution: `${video.videoWidth}x${video.videoHeight}`,
                currentTime: `${Math.round(video.currentTime)}s / ${Math.round(video.duration || 0)}s`,
                droppedFrames: (video as any).webkitDroppedFrameCount || 0,
              }
            : "No active video player",
          network: {
            online: navigator.onLine,
          },
        };

        rawConsole.log("\n================ [JOJO TV DEBUG REPORT] ================");
        rawConsole.log(`Route: ${report.pathname}`);
        rawConsole.log(`Current Focus: ${report.focus.currentFocusKey} (Avg latency: ${report.focus.avgFocusTimeMs}ms)`);
        rawConsole.log(`Heap Used: ${report.memory.heapUsedMB} MB / ${report.memory.heapTotalMB} MB (Peak: ${report.memory.peakHeapMB} MB)`);
        rawConsole.log(`DOM: ${report.dom.totalNodes} nodes, ${report.dom.focusableNodes} focusable, ${report.dom.imageNodes} imgs, ${report.dom.videoNodes} videos`);
        if (typeof report.player === "object") {
          rawConsole.log(`Player: ${report.player.state} (${report.player.resolution}), Dropped frames: ${report.player.droppedFrames}`);
        }
        rawConsole.log("========================================================\n");
        return report;
      },
    };

    rawConsole.log("[TV-DEBUGGER] Initialized. Run __TV_DEBUGGER__.getReport() or __TV_DEBUGGER__.toggleOverlay() in console.");

    return () => {
      delete (window as any).__TV_DEBUGGER__;
    };
  }, [pathname, runMemoryCleanup, getRawConsole]);

  // Focus latency tracker & Keydown event logger
  useEffect(() => {
    const navKeyCodes = [37, 38, 39, 40, 13]; // Arrow keys + Enter

    const onKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      if (navKeyCodes.includes(e.keyCode)) {
        lastNavKeyDownTime.current = now;
      }

      // Shortcut to toggle overlay: 'd' or 'D' key when not typing
      if ((e.key === "d" || e.key === "D") && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setVisible((v) => !v);
      }

      // Shortcut for memory cleanup: 'c' or 'C' key when overlay is visible
      if (visibleRef.current && (e.key === "c" || e.key === "C") && !(e.target instanceof HTMLInputElement)) {
        runMemoryCleanup();
      }

      if (visibleRef.current) {
        setKeyLog((prev) =>
          [{ t: Date.now(), keyCode: e.keyCode, key: e.key, repeat: e.repeat }, ...prev].slice(0, MAX_LOG)
        );
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [runMemoryCleanup]);

  // High-performance polling for focus shifts, FPS, Memory, and Video metrics
  useEffect(() => {
    let rafId = 0;
    let frameCount = 0;
    let lastFpsSample = performance.now();
    let currentFps = 60;

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastFpsSample >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsSample));
        frameCount = 0;
        lastFpsSample = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // Initial focus key setup
    lastFocusKeyRef.current = getCurrentFocusKey() || "";

    const pollInterval = setInterval(() => {
      const currentKey = getCurrentFocusKey() || "(none)";

      // Focus transition detection & duration calculation
      if (currentKey !== lastFocusKeyRef.current) {
        const transitionEnd = performance.now();
        let duration = 0;
        if (lastNavKeyDownTime.current > 0) {
          duration = Math.round((transitionEnd - lastNavKeyDownTime.current) * 10) / 10;
          lastNavKeyDownTime.current = 0;
        }

        if (duration > 0 && duration < 300) {
          focusDurations.current.push(duration);
          if (focusDurations.current.length > 20) focusDurations.current.shift();
        }

        const transition: FocusTransition = {
          t: Date.now(),
          fromKey: lastFocusKeyRef.current || "(start)",
          toKey: currentKey,
          durationMs: duration,
        };

        lastFocusKeyRef.current = currentKey;

        if (visibleRef.current) {
          setFocusTransitions((prev) => [transition, ...prev].slice(0, MAX_LOG));
        }

        // Log slow focus transitions (>40ms) to DevTools
        if (duration > 40) {
          getRawConsole().warn(`[TV-DEBUGGER] Slow focus transition to "${currentKey}": ${duration}ms`);
        }
      }

      // Memory tracking
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const usedMB = mem ? Math.round(mem.usedJSHeapSize / 1048576) : null;
      const totalMB = mem ? Math.round(mem.totalJSHeapSize / 1048576) : null;
      const limitMB = mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null;

      if (usedMB !== null) {
        if (initialHeapRef.current === null) initialHeapRef.current = usedMB;
        if (usedMB > peakHeapRef.current) peakHeapRef.current = usedMB;
      }

      // Video metrics
      const video = document.querySelector("video");
      let droppedFrames = 0;
      let videoState = "None";
      let videoResolution = "N/A";

      if (video) {
        droppedFrames = (video as any).webkitDroppedFrameCount || 0;
        videoState = video.paused ? (video.ended ? "Ended" : "Paused") : "Playing";
        if (video.videoWidth > 0) {
          videoResolution = `${video.videoWidth}x${video.videoHeight}`;
        }
      }

      // Average focus time
      const avgFocus = focusDurations.current.length
        ? Math.round(focusDurations.current.reduce((a, b) => a + b, 0) / focusDurations.current.length)
        : 0;

      const lastDuration = focusDurations.current.length
        ? focusDurations.current[focusDurations.current.length - 1]
        : 0;

      if (visibleRef.current) {
        setStats({
          fps: currentFps,
          heapUsedMB: usedMB,
          heapTotalMB: totalMB,
          heapLimitMB: limitMB,
          initialHeapMB: initialHeapRef.current,
          peakHeapMB: peakHeapRef.current,
          domNodes: document.querySelectorAll("*").length,
          focusableNodes: document.querySelectorAll("[data-focuskey]").length,
          imageNodes: document.querySelectorAll("img").length,
          videoNodes: document.querySelectorAll("video").length,
          currentFocusKey: currentKey,
          avgFocusTimeMs: avgFocus,
          lastFocusDurationMs: lastDuration,
          droppedFrames,
          videoState,
          videoResolution,
          networkOnline: navigator.onLine,
        });
      }
    }, 250);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(pollInterval);
    };
  }, [getRawConsole]);

  if (!visible) return null;

  const isFocusGood = stats.lastFocusDurationMs < 25;
  const isFocusWarn = stats.lastFocusDurationMs >= 25 && stats.lastFocusDurationMs <= 50;
  const focusColor = isFocusGood ? "text-emerald-400" : isFocusWarn ? "text-amber-400" : "text-rose-400";

  return (
    <div
      className="fixed top-3 left-3 z-[999999] w-[420px] max-h-[92vh] overflow-y-auto rounded-xl border border-white/25 bg-black/90 p-4 font-mono text-[11px] leading-snug text-lime-300 shadow-2xl backdrop-blur-md"
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-white/15 pb-2 text-white">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold tracking-wide">TV ALL-IN-ONE DEBUGGER</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/60">
          <span>INFO / BLUE to toggle</span>
        </div>
      </div>

      {/* Route & Network */}
      <div className="mb-2 flex items-center justify-between text-white/80">
        <div className="truncate max-w-[280px]">
          Route: <span className="text-white font-medium">{pathname}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          Net: <span className={stats.networkOnline ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {stats.networkOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Memory & Health Grid */}
      <div className="mb-3 rounded-lg bg-white/5 p-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border border-white/10 text-[11px]">
        <div>
          FPS: <span className={stats.fps < 30 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{stats.fps}</span>
        </div>
        <div>
          Heap Used: <span className="font-bold text-white">{stats.heapUsedMB !== null ? `${stats.heapUsedMB} MB` : "n/a"}</span>
          {stats.peakHeapMB ? <span className="text-white/50 text-[10px]"> (pk: {stats.peakHeapMB})</span> : null}
        </div>
        <div>
          DOM Nodes: <span className="text-white">{stats.domNodes}</span>
        </div>
        <div>
          Focusable: <span className="text-yellow-300">{stats.focusableNodes}</span>
        </div>
        <div>
          Images: <span className="text-white">{stats.imageNodes}</span>
        </div>
        <div>
          Videos: <span className={stats.videoNodes > 1 ? "text-rose-400 font-bold" : "text-emerald-400"}>{stats.videoNodes}</span>
        </div>
      </div>

      {/* Focus Latency Profiler */}
      <div className="mb-3 rounded-lg bg-white/5 p-2.5 border border-white/10">
        <div className="mb-1 flex items-center justify-between text-white">
          <span className="font-semibold text-[11px]">⚡ FOCUS LATENCY</span>
          <span className={`font-bold ${focusColor}`}>
            {stats.lastFocusDurationMs > 0 ? `${stats.lastFocusDurationMs} ms` : "< 15 ms"}
          </span>
        </div>
        <div className="text-[10px] text-white/60 mb-1.5 flex justify-between">
          <span>Avg latency: {stats.avgFocusTimeMs > 0 ? `${stats.avgFocusTimeMs} ms` : "Instant"}</span>
          <span>Target: &lt; 25 ms</span>
        </div>
        <div className="truncate text-yellow-300 bg-black/40 px-2 py-1 rounded text-[10px] border border-white/5">
          Active: {stats.currentFocusKey || "(none)"}
        </div>
      </div>

      {/* Video Player Health (if active) */}
      {stats.videoNodes > 0 && (
        <div className="mb-3 rounded-lg bg-white/5 p-2.5 border border-white/10">
          <div className="mb-1 text-white font-semibold text-[11px] flex justify-between">
            <span>🎬 VIDEO PLAYER</span>
            <span className="text-emerald-400">{stats.videoState}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-white/80">
            <div>Res: {stats.videoResolution}</div>
            <div>
              Dropped: <span className={stats.droppedFrames > 5 ? "text-rose-400" : "text-white"}>{stats.droppedFrames}</span>
            </div>
          </div>
        </div>
      )}

      {/* Memory Cleanup Action Button */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={runMemoryCleanup}
          className="flex-1 rounded-md bg-emerald-600/80 hover:bg-emerald-500 px-3 py-1.5 text-center font-bold text-white text-[11px] transition-colors shadow"
        >
          🧹 Run Memory Cleanup (Press &apos;C&apos;)
        </button>
      </div>

      {cleanupMessage && (
        <div className="mb-3 rounded bg-emerald-500/20 border border-emerald-500/40 p-1.5 text-center text-emerald-300 text-[10px]">
          {cleanupMessage}
        </div>
      )}

      {/* Recent Focus Transitions */}
      <div className="mb-2">
        <div className="mb-1 text-white/70 font-semibold text-[10px]">Recent Focus Transitions:</div>
        <div className="space-y-1">
          {focusTransitions.length === 0 && <div className="text-white/30 text-[10px]">(Press remote arrows)</div>}
          {focusTransitions.slice(0, 4).map((f, i) => (
            <div key={`${f.t}-${i}`} className="flex items-center justify-between text-[10px] truncate bg-black/30 px-1.5 py-0.5 rounded">
              <span className="text-white/80 truncate max-w-[290px]">
                {formatTime(f.t)} {f.toKey}
              </span>
              <span className={f.durationMs > 35 ? "text-rose-400 font-bold" : "text-emerald-400 font-medium"}>
                {f.durationMs > 0 ? `${f.durationMs}ms` : "Fast"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Remote Keydown Events */}
      <div>
        <div className="mb-1 text-white/70 font-semibold text-[10px]">Remote Keys (newest first):</div>
        <div className="space-y-0.5">
          {keyLog.length === 0 && <div className="text-white/30 text-[10px]">(Press any remote key)</div>}
          {keyLog.slice(0, 4).map((k, i) => (
            <div key={`${k.t}-${i}`} className="text-[10px] text-white/60 truncate">
              {formatTime(k.t)} code={k.keyCode} key=&quot;{k.key}&quot;{k.repeat ? " (repeat)" : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DebugOverlay;
