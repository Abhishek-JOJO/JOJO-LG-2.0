"use client";

import { appConfig } from "@/lib/config/app.config";
import { useEffect, useState } from "react";

type UseIsMobileResult = {
  isMobile: boolean;
  isReady: boolean;
};

/**
 * Client-only mobile viewport detection.
 *
 * The hook waits until after mount before reading matchMedia so Next.js does
 * not render different server/client markup during hydration.
 */
export function useIsMobile(serverIsMobile?: boolean): UseIsMobileResult {
  const [isReady, setIsReady] = useState(serverIsMobile !== undefined);
  const [isMobile, setIsMobile] = useState(serverIsMobile ?? false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(appConfig.MOBILE_QUERY);

    const update = () => {
      setIsMobile(mediaQuery.matches);
      setIsReady(true);
    };

    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  return { isMobile, isReady };
}
