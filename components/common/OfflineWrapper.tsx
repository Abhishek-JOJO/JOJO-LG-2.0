"use client";

import { ReactNode, useEffect, useState } from "react";
import { useOnlineStatus } from "@hooks/useOnlineStatus";
import { NoInternet } from "./NoInternet";
import { useToastStore } from "@store/useToastStore";

export function OfflineWrapper({ children }: { children:ReactNode }) {
  const isOnline = useOnlineStatus();
  const [mounted, setMounted] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const { show } = useToastStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // If we were offline and now we're online, show success toast
      if (wasOffline && isOnline) {
        show("We're back! Connection restored.", "success");
        setWasOffline(false);
      }
      // Track when we go offline
      else if (!isOnline) {
        setWasOffline(true);
      }
    }
  }, [isOnline, mounted, wasOffline, show]);

  // Prevent hydration mismatch by not rendering offline check until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  if (!isOnline) {
    return <NoInternet />;
  }

  return <>{children}</>;
}
