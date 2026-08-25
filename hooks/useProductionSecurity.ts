"use client";

import { useEffect } from "react";
import { isWebOS } from "@/lib/webos";

export interface ProductionSecurityOptions {
  /**
   * Enable security protection.
   * Default: true
   */
  enabled?: boolean;
  /**
   * Only enforce restrictions in production environment (process.env.NODE_ENV === "production").
   * Default: true
   */
  onlyInProduction?: boolean;
  /**
   * Suppress console output (log, info, warn, debug).
   * Default: true
   */
  suppressConsoleLogs?: boolean;
  /**
   * Enable debugger pause traps to deter inspect tools.
   * Default: true
   */
  enableDebuggerTrap?: boolean;
}

/**
 * Hook to restrict right-click, block developer tools shortcuts,
 * override console logging, and deter debugging in Next.js applications.
 */
export function useProductionSecurity(options: ProductionSecurityOptions = {}) {
  const {
    enabled = true,
    onlyInProduction = true,
    suppressConsoleLogs = true,
    enableDebuggerTrap = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;
    if (onlyInProduction && process.env.NODE_ENV !== "production") return;

    // 1. Right-Click Context Menu Prevention (Strict & Absolute)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleAuxClick = (e: MouseEvent) => {
      // Button 2 is right click in auxclick
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Attach listener to document & window + set legacy oncontextmenu handler
    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("auxclick", handleAuxClick, { capture: true });
    
    const prevOnContextMenu = document.oncontextmenu;
    document.oncontextmenu = (e) => {
      e.preventDefault();
      return false;
    };

    // 2. Keyboard Shortcut Interception (DevTools & Source Inspection)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e) return;
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = e.key?.toLowerCase() ?? "";

      // F12 key
      if (key === "f12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Opt+I (Inspect DevTools)
      if (isCmdOrCtrl && (isShift || isAlt) && key === "i") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+J / Cmd+Opt+J (DevTools Console)
      if (isCmdOrCtrl && (isShift || isAlt) && key === "j") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+C / Cmd+Opt+C (Element Inspector)
      if (isCmdOrCtrl && (isShift || isAlt) && key === "c") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+K (Firefox Web Console)
      if (isCmdOrCtrl && isShift && key === "k") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U / Cmd+Opt+U (View Page Source)
      if ((isCmdOrCtrl && key === "u") || (isCmdOrCtrl && isAlt && key === "u")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S / Cmd+S (Save Page HTML)
      if (isCmdOrCtrl && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    // 3. Suppress Console Logging
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      debug: console.debug,
      clear: console.clear,
    };

    if (suppressConsoleLogs && process.env.NODE_ENV === "production") {
      const noop = () => {};
      console.log = noop;
      console.info = noop;
      console.warn = noop;
      console.debug = noop;
      try {
        console.clear();
      } catch {
        // Ignore
      }
    }

    // 4. Subtle Anti-Debugging Trap (Debugger pause interval)
    // Skipped on webOS: shipped TV apps never have a devtools inspector attached in the
    // field, so this would just be a permanent 2s-interval CPU cost on constrained TV hardware.
    let debugInterval: NodeJS.Timeout | null = null;
    if (enableDebuggerTrap && process.env.NODE_ENV === "production" && !isWebOS()) {
      debugInterval = setInterval(() => {
        const start = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const end = performance.now();
        if (end - start > 100) {
          try {
            console.clear();
          } catch {
            // ignore
          }
        }
      }, 2000);
    }

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("auxclick", handleAuxClick, { capture: true });
      document.oncontextmenu = prevOnContextMenu;

      window.removeEventListener("keydown", handleKeyDown, { capture: true });

      if (suppressConsoleLogs && process.env.NODE_ENV === "production") {
        console.log = originalConsole.log;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
        console.debug = originalConsole.debug;
      }

      if (debugInterval) {
        clearInterval(debugInterval);
      }
    };
  }, [enabled, suppressConsoleLogs, enableDebuggerTrap]);
}
