"use client";

import { usePathname } from "next/navigation";
import { normalizePathname } from "@/lib/utils/pathname";
import { ROUTES } from "@/lib/constants/routes";
import { APP_VERSION } from "@/lib/constants/version";

import { useAppUpdateStore } from "@/store/useAppUpdateStore";

/**
 * AppVersionWatermark
 *
 * Displays clean, pure app version text in the bottom-right corner.
 * - No border, no dot, no background pill
 * - Hidden during full-screen media playback (/watch) or full-screen force update
 * - Non-interactive (pointer-events-none)
 */
export function AppVersionWatermark() {
  const pathname = usePathname();
  const normalizedPath = pathname ? normalizePathname(pathname) : "/";
  const isForceUpdateOpen = useAppUpdateStore((s) => s.isOpen && s.updateInfo?.forceUpdate);

  // Hide watermark during full-screen media playback
  const isWatchPage =
    normalizedPath === ROUTES.WATCH_BASE ||
    normalizedPath.startsWith(ROUTES.WATCH_BASE + "/") ||
    normalizedPath.startsWith("/watch") ||
    pathname?.includes("/watch") ||
    (typeof window !== "undefined" && (
      window.location.pathname.includes("/watch") ||
      window.location.href.includes("/watch") ||
      window.location.search.includes("?v=") ||
      window.location.search.includes("&v=")
    ));

  if (isWatchPage || isForceUpdateOpen) return null;

  return (
    <div
      id="jojo-app-version-watermark"
      className="fixed bottom-3 right-5 z-[9998] pointer-events-none select-none text-[12px] font-mono text-white/40 tracking-wider font-normal"
      aria-hidden="true"
    >
      v{APP_VERSION}
    </div>
  );
}

export default AppVersionWatermark;
