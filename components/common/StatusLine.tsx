"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getAppConfig, isConfigLoaded } from "@/lib/config/app.config";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useConsentStatus } from "@/lib/consent/useConsentStatus";
import { useSocketStatus } from "@/lib/socket/socket.hooks";

export function StatusLine() {
  const isOnline = useOnlineStatus();
  const isSocketConnected = useSocketStatus();
  const { isAppReady } = useBootstrap();
  const { canTrack } = useConsentStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showStatusLine = process.env.NEXT_PUBLIC_SHOW_STATUS_LINE === "true";

  if (!mounted || !showStatusLine) return null;

  // Get env type ("stage" or "prod")
  let envType = "STAGE";
  try {
    if (isConfigLoaded()) {
      envType = getAppConfig().envType.toUpperCase();
    } else {
      envType = (process.env.NEXT_PUBLIC_ENV_TYPE || "STAGE").toUpperCase();
    }
  } catch {
    envType = (process.env.NEXT_PUBLIC_ENV_TYPE || "STAGE").toUpperCase();
  }

  const isDev = process.env.NODE_ENV === "development";
  const envDisplay = isDev 
    ? "DEBUG BUILD" 
    : envType === "PROD" 
      ? "PRODUCTION BUILD" 
      : "STAGE BUILD";

  // Check Razorpay status
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  const isRazorpayLive = razorpayKey ? razorpayKey.startsWith("rzp_live") : (envType === "PROD");
  const razorpayDisplay = isRazorpayLive ? "LIVE" : "TEST";

  // Check Analytics status
  const activeProviders: string[] = [];
  if (process.env.NEXT_PUBLIC_ENABLE_CLEVERTAP === "true") activeProviders.push("CleverTap");
  if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE === "true") activeProviders.push("Firebase");
  if (process.env.NEXT_PUBLIC_ENABLE_BACKEND_ANALYTICS === "true") activeProviders.push("Backend");

  const analyticsDisplay = canTrack
    ? `ENABLED${activeProviders.length > 0 ? ` (${activeProviders.join(", ")})` : ""}`
    : "DISABLED";

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 h-7 z-[99999] flex items-center justify-between px-4 text-[10px] sm:text-xs font-semibold tracking-wider text-neutral-400 select-none pointer-events-none"
      style={{
        background: "rgba(10, 10, 10, 0.85)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Left side: Build name */}
      <div className="flex items-center gap-1.5 font-bold text-white/90">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>{envDisplay}</span>
      </div>

      {/* Right side: Logger states */}
      <div className="flex items-center gap-4">
        {/* API Connection Logger */}
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <span>API:</span>
          <span className="font-bold text-sky-400 lowercase flex gap-1">
            <span>{process.env.NEXT_PUBLIC_API_BASE_URL || "NOT SET"}</span>
            <span className="text-sky-400/70 uppercase">({envType})</span>
          </span>
        </div>

        {/* Network Connection Logger */}
        <div className="flex items-center gap-1.5">
          <span>NETWORK:</span>
          <span className={`flex items-center gap-1 font-bold ${isOnline ? "text-emerald-400" : "text-rose-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-rose-500"}`} />
            {isOnline ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>

        {/* Socket Connection Logger */}
        <div className="flex items-center gap-1.5">
          <span>SOCKET:</span>
          <span className={`flex items-center gap-1 font-bold ${isSocketConnected ? "text-emerald-400" : "text-rose-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSocketConnected ? "bg-emerald-400" : "bg-rose-500"}`} />
            {isSocketConnected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>

        {/* Razorpay Credentials status */}
        <div className="flex items-center gap-1.5">
          <span>RAZORPAY:</span>
          <span className={`flex items-center gap-1 font-bold ${isRazorpayLive ? "text-emerald-400" : "text-amber-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRazorpayLive ? "bg-emerald-400" : "bg-amber-400"}`} />
            {razorpayDisplay}
          </span>
        </div>

        {/* Analytics status */}
        <div className="flex items-center gap-1.5">
          <span>ANALYTICS:</span>
          <span className={`flex items-center gap-1 font-bold ${canTrack ? "text-emerald-400" : "text-neutral-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${canTrack ? "bg-emerald-400" : "bg-neutral-500"}`} />
            {analyticsDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}


