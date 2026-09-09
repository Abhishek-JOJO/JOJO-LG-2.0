"use client";

/**
 * On-TV diagnostic HUD for the "laggy / navigation doesn't work" reports.
 *
 * Toggle with the remote's INFO key (see RemoteManager.ts) — no keyboard or
 * separate dev machine needed. Reads:
 *  - every raw keydown the browser receives (proves whether remote input is
 *    reaching the app at all, and with what keyCode — the #1 thing to rule
 *    out for "navigation doesn't work")
 *  - the spatial-nav library's own current focus key, polled directly, so we
 *    can see whether focus is actually moving when a direction is pressed
 *  - live counts of focusable/video/DOM nodes and FPS/heap, for the lag reports
 *
 * This is a diagnostic tool, not a feature — safe to delete once the
 * underlying issues are confirmed fixed on real hardware.
 */

import { useEffect, useRef, useState } from "react";
import { getCurrentFocusKey } from "@noriginmedia/norigin-spatial-navigation";
import { useActivePathname } from "@/hooks/useActivePathname";

const MAX_LOG = 8;
const STORAGE_KEY = "jojo_debug_overlay";

interface KeyLogEntry {
  t: number;
  keyCode: number;
  key: string;
  repeat: boolean;
}

interface FocusLogEntry {
  t: number;
  focusKey: string;
}

interface Stats {
  fps: number;
  heapMB: number | null;
  domNodes: number;
  focusableNodes: number;
  videoNodes: number;
  focusKey: string;
}

const EMPTY_STATS: Stats = {
  fps: 0,
  heapMB: null,
  domNodes: 0,
  focusableNodes: 0,
  videoNodes: 0,
  focusKey: "",
};

function readInitialEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("debug");
    if (fromUrl === "1") {
      localStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    if (fromUrl === "0") {
      localStorage.setItem(STORAGE_KEY, "0");
      return false;
    }
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
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const [keyLog, setKeyLog] = useState<KeyLogEntry[]>([]);
  const [focusLog, setFocusLog] = useState<FocusLogEntry[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  useEffect(() => {
    setVisible(readInitialEnabled());
  }, []);

  useEffect(() => {
    visibleRef.current = visible;
    try {
      localStorage.setItem(STORAGE_KEY, visible ? "1" : "0");
    } catch {
      // ignore
    }
  }, [visible]);

  // INFO key toggle — dispatched by RemoteManager.ts on the webOS remote's INFO press.
  useEffect(() => {
    const toggle = () => setVisible((v) => !v);
    document.addEventListener("tv-debug-toggle", toggle);
    return () => document.removeEventListener("tv-debug-toggle", toggle);
  }, []);

  // Always attached (negligible cost), but only touches React state while visible
  // so this can't itself become a source of lag when the panel is hidden.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!visibleRef.current) return;
      setKeyLog((prev) =>
        [{ t: Date.now(), keyCode: e.keyCode, key: e.key, repeat: e.repeat }, ...prev].slice(0, MAX_LOG)
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // FPS + focus-key polling + DOM stats — only runs while the panel is open.
  useEffect(() => {
    if (!visible) return;

    let rafId = 0;
    let frameCount = 0;
    let lastFpsSample = performance.now();
    let fps = 0;
    let lastFocusKey = "";

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastFpsSample >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastFpsSample));
        frameCount = 0;
        lastFpsSample = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const interval = setInterval(() => {
      const currentFocusKey = getCurrentFocusKey() || "(none)";
      if (currentFocusKey !== lastFocusKey) {
        lastFocusKey = currentFocusKey;
        setFocusLog((prev) => [{ t: Date.now(), focusKey: currentFocusKey }, ...prev].slice(0, MAX_LOG));
      }

      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

      setStats({
        fps,
        heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
        domNodes: document.querySelectorAll("*").length,
        focusableNodes: document.querySelectorAll("[data-focuskey]").length,
        videoNodes: document.querySelectorAll("video").length,
        focusKey: currentFocusKey,
      });
    }, 300);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(interval);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-2 left-2 z-[99999] w-[380px] max-h-[92vh] overflow-y-auto rounded-lg border border-white/20 bg-black/85 p-3 font-mono text-[11px] leading-snug text-lime-300 shadow-2xl"
      style={{ pointerEvents: "none" }}
    >
      <div className="mb-2 flex items-center justify-between text-white">
        <span className="font-bold">JOJO DEBUG</span>
        <span className="text-white/50">INFO = toggle</span>
      </div>
      <div className="mb-2 truncate text-white/70">route: {pathname}</div>

      <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
        <div>
          FPS: <span className={stats.fps > 0 && stats.fps < 30 ? "text-red-400" : "text-lime-300"}>{stats.fps}</span>
        </div>
        <div>Heap: {stats.heapMB !== null ? `${stats.heapMB} MB` : "n/a"}</div>
        <div>DOM nodes: {stats.domNodes}</div>
        <div>Focusable: {stats.focusableNodes}</div>
        <div>
          Video els: <span className={stats.videoNodes > 1 ? "text-red-400" : "text-lime-300"}>{stats.videoNodes}</span>
        </div>
        <div className="col-span-2 truncate">
          Focus key: <span className="text-yellow-300">{stats.focusKey || "(none)"}</span>
        </div>
      </div>

      <div className="mb-0.5 text-white/70">Focus changes (newest first):</div>
      <div className="mb-2 space-y-0.5">
        {focusLog.length === 0 && <div className="text-white/30">(none yet — press an arrow key)</div>}
        {focusLog.map((f, i) => (
          <div key={`${f.t}-${i}`} className="truncate text-yellow-300/90">
            {formatTime(f.t)} → {f.focusKey}
          </div>
        ))}
      </div>

      <div className="mb-0.5 text-white/70">Raw key events (newest first):</div>
      <div className="space-y-0.5">
        {keyLog.length === 0 && <div className="text-white/30">(none yet — press a remote key)</div>}
        {keyLog.map((k, i) => (
          <div key={`${k.t}-${i}`} className="truncate">
            {formatTime(k.t)} code={k.keyCode} key={k.key}
            {k.repeat ? " (repeat)" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DebugOverlay;
