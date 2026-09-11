"use client";

/**
 * GatePopup
 *
 * Lightweight overlay that renders contextual playback gate messages.
 * Matches the design system tokens (theme_13, neutral palette, glass backdrop).
 *
 * Gates: mobile | auth | subscription | tvod
 */

import { X, Smartphone, Lock, Crown, ShoppingCart } from "lucide-react";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { ROUTES } from "@/lib/constants/routes";
import { useRouter } from "next/navigation";
import { safeNavigate } from "@/lib/webos/safeNavigate";
import type { WatchGateReason } from "../hooks/useWatchGating";
import { useEffect } from "react";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";

interface GatePopupProps {
  gate: WatchGateReason;
  message: string;
  onClose: () => void;
  /** TVOD pricing info (optional) */
  pricingLabel?: string;
  onAction?: () => void;
}

const gateConfig: Record<
  Exclude<WatchGateReason, "none">,
  {
    icon: typeof Lock;
    title: string;
    actionLabel: string;
    actionRoute?: string;
  }
> = {
  mobile: {
    icon: Smartphone,
    title: "Download the App",
    actionLabel: "Get the App",
  },
  auth: {
    icon: Lock,
    title: "Login Required",
    actionLabel: "Login",
    actionRoute: ROUTES.LOGIN,
  },
  subscription: {
    icon: Crown,
    title: "Premium Content",
    actionLabel: "Subscribe Now",
    actionRoute: ROUTES.SUBSCRIPTION,
  },
  tvod: {
    icon: ShoppingCart,
    title: "Rent or Buy",
    actionLabel: "View Pricing",
  },
};

export function GatePopup({ gate, message, onClose, pricingLabel, onAction }: GatePopupProps) {
  const router = useRouter();

  useEffect(() => {
    if (gate === "tvod") {
      analyticsService.track(EVENT_NAMES.TVOD_PLAN_DETAIL_PAGE_POPUP_OPENED, {
        gate,
        message,
      });
    }
  }, [gate, message]);

  if (gate === "none") return null;

  const config = gateConfig[gate];
  const Icon = config.icon;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (config.actionRoute) {
      safeNavigate(router, config.actionRoute);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative mx-4 w-full max-w-[380px] rounded-2xl bg-neutral-950 border border-neutral-800/60 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-theme_1/5 hover:bg-theme_1/10 text-theme_1/60 hover:text-theme_1 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-theme_13_samecolour/15 flex items-center justify-center">
            <Icon size={26} className="text-theme_13_samecolour" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-theme_1 text-center mb-2">
          {config.title}
        </h3>

        {/* Message */}
        <p className="text-sm text-neutral-400 text-center leading-relaxed mb-6">
          {message}
        </p>

        {/* Pricing label for TVOD */}
        {gate === "tvod" && pricingLabel && (
          <div className="flex justify-center mb-4">
            <span className="text-xl font-bold text-theme_13_samecolour">
              {pricingLabel}
            </span>
          </div>
        )}

        {/* Action Button */}
        <JOJOCustomButton
          state={JOJOButton.State.ACTIVE}
          size={JOJOButton.Size.M}
          onClick={handleAction}
          className="w-full justify-center text-theme_1 body-sm-medium font-bold h-11 active:scale-95 transition-all shadow-lg shadow-theme_13_samecolour/20"
          hoverColor="theme_13_80"
        >
          {config.actionLabel}
        </JOJOCustomButton>

        {/* Secondary dismiss */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-xs text-neutral-500 hover:text-neutral-300 font-semibold transition-colors text-center"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
